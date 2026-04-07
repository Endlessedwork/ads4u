import { Router } from 'express';
import { getServices } from '../ads4u-client.js';
import { requireAuth } from '../middleware.js';

const router = Router();

router.get('/api/services', requireAuth, async (req, res) => {
  try {
    const services = await getServices();
    res.json(services);
  } catch (err) {
    console.error('Failed to fetch services:', err.message);
    if (err.code === 'ADS4U_API_ERROR') {
      return res.status(502).json({ error: err.message });
    }
    if (err.code === 'ADS4U_CONFIG_ERROR') {
      return res.status(503).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

export default router;
