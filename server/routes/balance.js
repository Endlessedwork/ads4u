import { Router } from 'express';
import { getBalance } from '../ads4u-client.js';
import { requireAdmin } from '../middleware.js';

const router = Router();

router.get('/api/balance', requireAdmin, async (req, res) => {
  try {
    const result = await getBalance();
    res.json(result);
  } catch (err) {
    console.error('Failed to fetch balance:', err.message);
    if (err.code === 'ADS4U_API_ERROR') {
      return res.status(502).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

export default router;
