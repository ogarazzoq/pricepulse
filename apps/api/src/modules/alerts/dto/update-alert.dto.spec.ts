import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateAlertDto } from './update-alert.dto';
import { AlertCondition, NotificationChannel } from '@prisma/client';

describe('UpdateAlertDto', () => {
  describe('status field validation', () => {
    it('should accept ACTIVE status', async () => {
      const dto = plainToInstance(UpdateAlertDto, { status: 'ACTIVE' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept PAUSED status', async () => {
      const dto = plainToInstance(UpdateAlertDto, { status: 'PAUSED' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject TRIGGERED status (only ACTIVE/PAUSED allowed in updates)', async () => {
      const dto = plainToInstance(UpdateAlertDto, { status: 'TRIGGERED' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('status');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should reject ARCHIVED status (only ACTIVE/PAUSED allowed in updates)', async () => {
      const dto = plainToInstance(UpdateAlertDto, { status: 'ARCHIVED' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('status');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should reject invalid status string', async () => {
      const dto = plainToInstance(UpdateAlertDto, { status: 'INVALID_STATUS' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('status');
    });

    it('should allow omitting status (optional field)', async () => {
      const dto = plainToInstance(UpdateAlertDto, {
        threshold: 50.0,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('threshold validation', () => {
    it('should accept valid threshold', async () => {
      const dto = plainToInstance(UpdateAlertDto, { threshold: 99.99 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject threshold below 0.01', async () => {
      const dto = plainToInstance(UpdateAlertDto, { threshold: 0.001 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('threshold');
    });

    it('should reject threshold above 999,999,999.99', async () => {
      const dto = plainToInstance(UpdateAlertDto, { threshold: 1000000000 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('threshold');
    });

    it('should reject threshold with more than 2 decimals', async () => {
      const dto = plainToInstance(UpdateAlertDto, { threshold: 99.999 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('threshold');
    });

    it('should accept threshold at minimum boundary (0.01)', async () => {
      const dto = plainToInstance(UpdateAlertDto, { threshold: 0.01 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept threshold at maximum boundary (999,999,999.99)', async () => {
      const dto = plainToInstance(UpdateAlertDto, { threshold: 999999999.99 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('condition validation', () => {
    it('should accept valid AlertCondition enum value', async () => {
      const dto = plainToInstance(UpdateAlertDto, { condition: AlertCondition.BELOW });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid condition string', async () => {
      const dto = plainToInstance(UpdateAlertDto, { condition: 'INVALID_CONDITION' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('condition');
    });
  });

  describe('channels validation', () => {
    it('should accept valid channels array', async () => {
      const dto = plainToInstance(UpdateAlertDto, {
        channels: [NotificationChannel.EMAIL, NotificationChannel.TELEGRAM],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject empty channels array', async () => {
      const dto = plainToInstance(UpdateAlertDto, { channels: [] });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('channels');
      expect(errors[0].constraints).toHaveProperty('arrayMinSize');
    });

    it('should reject duplicate channels', async () => {
      const dto = plainToInstance(UpdateAlertDto, {
        channels: [NotificationChannel.EMAIL, NotificationChannel.EMAIL],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('channels');
      expect(errors[0].constraints).toHaveProperty('arrayUnique');
    });

    it('should reject invalid channel values', async () => {
      const dto = plainToInstance(UpdateAlertDto, {
        channels: ['INVALID_CHANNEL'],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('channels');
    });
  });

  describe('partial updates', () => {
    it('should allow updating only status', async () => {
      const dto = plainToInstance(UpdateAlertDto, { status: 'PAUSED' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should allow updating only threshold', async () => {
      const dto = plainToInstance(UpdateAlertDto, { threshold: 75.50 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should allow updating multiple fields', async () => {
      const dto = plainToInstance(UpdateAlertDto, {
        status: 'ACTIVE',
        threshold: 100.00,
        condition: AlertCondition.BELOW,
        channels: [NotificationChannel.EMAIL],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should allow empty body (all fields optional)', async () => {
      const dto = plainToInstance(UpdateAlertDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
