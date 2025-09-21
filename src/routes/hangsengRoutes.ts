import { Router, Request, Response } from 'express';
import { HangSengService } from '../services/hangsengService';

const router = Router();
const hangSengService = new HangSengService();

router.get('/hangseng/latest', async (req: Request, res: Response) => {
  try {
    const latestData = await hangSengService.getLatestIndexValue();

    if (!latestData) {
      return res.status(404).json({ error: 'No data available' });
    }

    res.json(latestData);
  } catch (error) {
    console.error('Error getting latest Hang Seng data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/hangseng/historical', async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    const startDate = new Date(start as string);
    const endDate = new Date(end as string);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const historicalData = await hangSengService.getHistoricalData(startDate, endDate);
    res.json(historicalData);
  } catch (error) {
    console.error('Error getting historical data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/hangseng/stats', async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    if (isNaN(days) || days < 1 || days > 365) {
      return res.status(400).json({ error: 'Invalid days parameter' });
    }

    const stats = await hangSengService.getIndexStats(days);
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/hangseng/update', async (req: Request, res: Response) => {
  try {
    await hangSengService.updateDailyData();
    res.json({ message: 'Hang Seng data updated successfully' });
  } catch (error) {
    console.error('Error updating Hang Seng data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;