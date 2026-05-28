import { getSetting, setSetting, getAllSettings } from '../../services/settingsService';
import { prisma } from '../../prisma/client';

jest.mock('../../prisma/client', () => ({
  prisma: {
    appSettings: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as any;

describe('settingsService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getSetting', () => {
    it('returns DB value when present', async () => {
      (mockPrisma.appSettings.findUnique as jest.Mock).mockResolvedValue({
        key: 'cancellationWindowHours', value: '48',
      });
      const val = await getSetting('cancellationWindowHours');
      expect(val).toBe('48');
    });

    it('falls back to default when not in DB', async () => {
      (mockPrisma.appSettings.findUnique as jest.Mock).mockResolvedValue(null);
      const val = await getSetting('cancellationWindowHours');
      // default is whatever CANCELLATION_WINDOW_HOURS env var was at module load, or '24'
      expect(typeof val).toBe('string');
      expect(val.length).toBeGreaterThan(0);
    });

    it('returns empty string for unknown keys not in DB', async () => {
      (mockPrisma.appSettings.findUnique as jest.Mock).mockResolvedValue(null);
      const val = await getSetting('unknownKey');
      expect(val).toBe('');
    });
  });

  describe('setSetting', () => {
    it('upserts the setting value in the DB', async () => {
      (mockPrisma.appSettings.upsert as jest.Mock).mockResolvedValue({
        key: 'cancellationWindowHours', value: '6',
      });
      await setSetting('cancellationWindowHours', '6');
      expect(mockPrisma.appSettings.upsert).toHaveBeenCalledWith({
        where: { key: 'cancellationWindowHours' },
        update: { value: '6' },
        create: { key: 'cancellationWindowHours', value: '6' },
      });
    });
  });

  describe('getAllSettings', () => {
    it('merges DB values over defaults', async () => {
      (mockPrisma.appSettings.findMany as jest.Mock).mockResolvedValue([
        { key: 'cancellationWindowHours', value: '48' },
      ]);
      const settings = await getAllSettings();
      expect(settings.cancellationWindowHours).toBe('48');
    });

    it('returns defaults when DB has no rows', async () => {
      (mockPrisma.appSettings.findMany as jest.Mock).mockResolvedValue([]);
      const settings = await getAllSettings();
      expect(settings).toHaveProperty('cancellationWindowHours');
      expect(typeof settings.cancellationWindowHours).toBe('string');
    });
  });
});
