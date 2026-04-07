import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Save original env
const origApiKey = process.env.ADS4U_API_KEY;

describe('ads4u-client', () => {
  afterEach(() => {
    process.env.ADS4U_API_KEY = origApiKey;
    vi.restoreAllMocks();
  });

  describe('callApi with missing API key', () => {
    it('throws ADS4U_CONFIG_ERROR when API key is not set', async () => {
      process.env.ADS4U_API_KEY = '';
      // Re-import to get fresh module
      const { getServices } = await import('../server/ads4u-client.js');

      try {
        await getServices();
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err.message).toBe('ADS4U_API_KEY is not configured');
        expect(err.code).toBe('ADS4U_CONFIG_ERROR');
      }
    });

    it('throws ADS4U_CONFIG_ERROR for getBalance when API key missing', async () => {
      process.env.ADS4U_API_KEY = '';
      const { getBalance } = await import('../server/ads4u-client.js');

      try {
        await getBalance();
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err.code).toBe('ADS4U_CONFIG_ERROR');
      }
    });

    it('throws ADS4U_CONFIG_ERROR for addOrder when API key missing', async () => {
      process.env.ADS4U_API_KEY = '';
      const { addOrder } = await import('../server/ads4u-client.js');

      try {
        await addOrder({ serviceId: 1, link: 'https://test.com', quantity: 100 });
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err.code).toBe('ADS4U_CONFIG_ERROR');
      }
    });
  });
});
