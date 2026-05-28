import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { JobsModule } from '../jobs/jobs.module';

/**
 * Admin module aggregates read-only endpoints over modules that
 * already enforce RBAC via the global RolesGuard.
 *
 * Note: MarketplacesModule and other domain modules are imported
 * globally (or via their own modules) so we don't need to duplicate.
 */
@Module({
  imports: [UsersModule, JobsModule],
  controllers: [AdminController],
})
export class AdminModule {}
