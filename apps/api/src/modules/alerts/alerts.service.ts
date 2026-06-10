import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Alert, AlertCondition, AlertStatus } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { BulkAlertOperationResultDto } from './dto/bulk-alerts.dto';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAlertDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');

    let marketplaceId: string | undefined;
    if (dto.marketplaceSlug) {
      const m = await this.prisma.marketplace.findUnique({ where: { slug: dto.marketplaceSlug } });
      if (!m) throw new NotFoundException('Marketplace not found');
      marketplaceId = m.id;
    }

    const alert = await this.prisma.alert.create({
      data: {
        userId,
        productId: dto.productId,
        marketplaceId,
        condition: dto.condition,
        threshold: dto.threshold,
        channels: dto.channels,
      },
      include: { product: true },
    });
    return this.serialize(alert);
  }

  async listByUser(userId: string) {
    const alerts = await this.prisma.alert.findMany({
      where: { 
        userId,
        status: { not: AlertStatus.ARCHIVED } // Don't show archived alerts
      },
      orderBy: { createdAt: 'desc' },
      include: { product: true },
    });
    return alerts.map((a) => this.serialize(a));
  }

  async update(userId: string, id: string, dto: UpdateAlertDto) {
    const alert = await this.prisma.alert.findFirst({ where: { id, userId } });
    if (!alert) throw new NotFoundException('Alert not found');

    // If alert is ARCHIVED, return 404 (Requirement 13.9)
    if (alert.status === AlertStatus.ARCHIVED) {
      throw new NotFoundException('Alert not found');
    }

    // Build update data - preserve triggeredCount and lastTriggeredAt (Requirement 13.6)
    const updateData: any = { ...dto };

    const updated = await this.prisma.alert.update({
      where: { id },
      data: updateData,
      include: { product: true },
    });
    return this.serialize(updated);
  }

  async archive(userId: string, id: string) {
    const alert = await this.prisma.alert.findFirst({ where: { id, userId } });
    if (!alert) throw new NotFoundException('Alert not found');
    
    // If already archived, return 404 (Requirement 13.9)
    if (alert.status === AlertStatus.ARCHIVED) {
      throw new NotFoundException('Alert not found');
    }
    
    await this.prisma.alert.update({
      where: { id },
      data: { status: AlertStatus.ARCHIVED },
    });
  }

  // -------------------------------------------------------------------
  // Evaluation logic — used by the BullMQ worker
  // -------------------------------------------------------------------

  /**
   * Evaluates the alert against the current best offer.
   * Returns the trigger metadata if conditions are satisfied.
   */
  async evaluate(alert: Alert) {
    const offers = await this.prisma.productOffer.findMany({
      where: { productId: alert.productId, ...(alert.marketplaceId ? { marketplaceId: alert.marketplaceId } : {}) },
      orderBy: { currentPrice: 'asc' },
      include: { marketplace: true },
    });

    if (offers.length === 0) return null;

    const best = offers[0];
    const currentPrice = Number(best.currentPrice);
    const threshold = Number(alert.threshold);

    let triggered = false;
    if (alert.condition === AlertCondition.BELOW && currentPrice <= threshold) triggered = true;
    if (alert.condition === AlertCondition.ABOVE && currentPrice >= threshold) triggered = true;
    if (alert.condition === AlertCondition.PERCENT_DROP) {
      // Original price snapshotted on offer.originalPrice (if present)
      const reference = best.originalPrice ? Number(best.originalPrice) : currentPrice;
      const percentDrop = reference > 0 ? ((reference - currentPrice) / reference) * 100 : 0;
      if (percentDrop >= threshold) triggered = true;
    }

    await this.prisma.alert.update({
      where: { id: alert.id },
      data: { lastEvaluatedAt: new Date() },
    });

    if (!triggered) return null;
    return {
      alertId: alert.id,
      offerId: best.id,
      marketplaceSlug: best.marketplace.slug,
      marketplaceName: best.marketplace.name,
      productId: alert.productId,
      currentPrice,
      threshold,
      condition: alert.condition,
    };
  }

  async markTriggered(alertId: string) {
    await this.prisma.alert.update({
      where: { id: alertId },
      data: {
        status: AlertStatus.TRIGGERED,
        lastTriggeredAt: new Date(),
        triggeredCount: { increment: 1 },
      },
    });
  }

  // -------------------------------------------------------------------
  private serialize(a: any) {
    return {
      id: a.id,
      userId: a.userId,
      productId: a.productId,
      productTitle: a.product?.title ?? '',
      productImageUrl: a.product?.imageUrl ?? null,
      condition: a.condition,
      threshold: Number(a.threshold),
      currency: a.currency,
      channels: a.channels,
      status: a.status,
      triggeredCount: a.triggeredCount ?? 0,
      lastEvaluatedAt: a.lastEvaluatedAt?.toISOString() ?? null,
      lastTriggeredAt: a.lastTriggeredAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    };
  }

  // -------------------------------------------------------------------
  // Bulk Operations
  // -------------------------------------------------------------------

  /**
   * Bulk pause multiple alerts.
   * @param userId - Owner ID from JWT
   * @param alertIds - Array of alert IDs to pause (max 50)
   * @returns BulkAlertOperationResultDto with success/failure counts
   */
  async bulkPause(
    userId: string,
    alertIds: string[],
  ): Promise<BulkAlertOperationResultDto> {
    const results: BulkAlertOperationResultDto = {
      success: 0,
      failed: 0,
      total: alertIds.length,
      successIds: [],
      errors: [],
    };

    for (const alertId of alertIds) {
      try {
        const alert = await this.prisma.alert.findFirst({ where: { id: alertId, userId } });
        if (!alert || alert.status === AlertStatus.ARCHIVED) {
          throw new NotFoundException('Alert not found');
        }

        await this.prisma.alert.update({
          where: { id: alertId },
          data: { status: AlertStatus.PAUSED },
        });

        results.success++;
        results.successIds.push(alertId);
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          alertId,
          error: error.message || 'Unknown error',
        });
        this.logger.warn(`Failed to pause alert ${alertId}: ${error.message}`);
      }
    }

    this.logger.log(`Bulk pause: ${results.success}/${results.total} for user ${userId}`);
    return results;
  }

  /**
   * Bulk resume multiple alerts.
   * @param userId - Owner ID from JWT
   * @param alertIds - Array of alert IDs to resume (max 50)
   * @returns BulkAlertOperationResultDto with success/failure counts
   */
  async bulkResume(
    userId: string,
    alertIds: string[],
  ): Promise<BulkAlertOperationResultDto> {
    const results: BulkAlertOperationResultDto = {
      success: 0,
      failed: 0,
      total: alertIds.length,
      successIds: [],
      errors: [],
    };

    for (const alertId of alertIds) {
      try {
        const alert = await this.prisma.alert.findFirst({ where: { id: alertId, userId } });
        if (!alert || alert.status === AlertStatus.ARCHIVED) {
          throw new NotFoundException('Alert not found');
        }

        await this.prisma.alert.update({
          where: { id: alertId },
          data: { status: AlertStatus.ACTIVE },
        });

        results.success++;
        results.successIds.push(alertId);
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          alertId,
          error: error.message || 'Unknown error',
        });
        this.logger.warn(`Failed to resume alert ${alertId}: ${error.message}`);
      }
    }

    this.logger.log(`Bulk resume: ${results.success}/${results.total} for user ${userId}`);
    return results;
  }

  /**
   * Bulk archive multiple alerts.
   * @param userId - Owner ID from JWT
   * @param alertIds - Array of alert IDs to archive (max 50)
   * @returns BulkAlertOperationResultDto with success/failure counts
   */
  async bulkArchive(
    userId: string,
    alertIds: string[],
  ): Promise<BulkAlertOperationResultDto> {
    const results: BulkAlertOperationResultDto = {
      success: 0,
      failed: 0,
      total: alertIds.length,
      successIds: [],
      errors: [],
    };

    for (const alertId of alertIds) {
      try {
        await this.archive(userId, alertId);
        results.success++;
        results.successIds.push(alertId);
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          alertId,
          error: error.message || 'Unknown error',
        });
        this.logger.warn(`Failed to archive alert ${alertId}: ${error.message}`);
      }
    }

    this.logger.log(`Bulk archive: ${results.success}/${results.total} for user ${userId}`);
    return results;
  }

  /**
   * Bulk delete multiple alerts (hard delete).
   * @param userId - Owner ID from JWT
   * @param alertIds - Array of alert IDs to delete (max 50)
   * @returns BulkAlertOperationResultDto with success/failure counts
   */
  async bulkDelete(
    userId: string,
    alertIds: string[],
  ): Promise<BulkAlertOperationResultDto> {
    const results: BulkAlertOperationResultDto = {
      success: 0,
      failed: 0,
      total: alertIds.length,
      successIds: [],
      errors: [],
    };

    for (const alertId of alertIds) {
      try {
        const alert = await this.prisma.alert.findFirst({ where: { id: alertId, userId } });
        if (!alert) {
          throw new NotFoundException('Alert not found');
        }

        await this.prisma.alert.delete({ where: { id: alertId } });
        results.success++;
        results.successIds.push(alertId);
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          alertId,
          error: error.message || 'Unknown error',
        });
        this.logger.warn(`Failed to delete alert ${alertId}: ${error.message}`);
      }
    }

    this.logger.log(`Bulk delete: ${results.success}/${results.total} for user ${userId}`);
    return results;
  }
}
