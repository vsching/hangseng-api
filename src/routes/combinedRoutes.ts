import { Router, Request, Response } from 'express';
import { CombinedDataService } from '../services/combinedDataService';

const router = Router();
const combinedService = new CombinedDataService();

/**
 * Get combined calendar and Hang Seng data for a specific date
 * GET /api/combined/date/:date
 * Example: /api/combined/date/2024-03-15
 */
router.get('/combined/date/:date', async (req: Request, res: Response) => {
  try {
    const date = new Date(req.params.date);

    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const combinedData = await combinedService.getCombinedDataForDate(date);
    res.json(combinedData);
  } catch (error) {
    console.error('Error getting combined data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get combined data with analysis for a specific date
 * GET /api/combined/analysis/:date
 * Example: /api/combined/analysis/2024-03-15
 */
router.get('/combined/analysis/:date', async (req: Request, res: Response) => {
  try {
    const date = new Date(req.params.date);

    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const analysisData = await combinedService.getCombinedDataWithAnalysis(date);
    res.json(analysisData);
  } catch (error) {
    console.error('Error getting analysis data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get combined data for a date range
 * GET /api/combined/range?start=2024-03-01&end=2024-03-31
 */
router.get('/combined/range', async (req: Request, res: Response) => {
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

    if (startDate > endDate) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }

    // Limit range to prevent excessive data
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      return res.status(400).json({ error: 'Date range cannot exceed 365 days' });
    }

    const combinedData = await combinedService.getCombinedDataForRange(startDate, endDate);

    res.json({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalDays: daysDiff + 1,
      dataCount: combinedData.length,
      data: combinedData
    });
  } catch (error) {
    console.error('Error getting combined range data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get monthly overview with combined data
 * GET /api/combined/monthly/:year/:month
 * Example: /api/combined/monthly/2024/3
 */
router.get('/combined/monthly/:year/:month', async (req: Request, res: Response) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 1900 || year > 2100) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }

    const monthlyData = await combinedService.getMonthlyOverview(year, month);
    res.json(monthlyData);
  } catch (error) {
    console.error('Error getting monthly overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Search for specific conditions in combined data
 * POST /api/combined/search
 * Body: {
 *   startDate: "2024-03-01",
 *   endDate: "2024-03-31",
 *   filters: {
 *     hasCalendar: true,
 *     hasHangseng: true,
 *     minVolume: 2000000000,
 *     trend: "bullish" // bullish, bearish, neutral
 *   }
 * }
 */
router.post('/combined/search', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, filters } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const allData = await combinedService.getCombinedDataForRange(start, end);

    // Apply filters
    let filteredData = allData;

    if (filters) {
      if (filters.hasCalendar !== undefined) {
        filteredData = filteredData.filter(d =>
          filters.hasCalendar ? d.calendar !== null : d.calendar === null
        );
      }

      if (filters.hasHangseng !== undefined) {
        filteredData = filteredData.filter(d =>
          filters.hasHangseng ? d.hangseng !== null : d.hangseng === null
        );
      }

      if (filters.minVolume && filters.minVolume > 0) {
        filteredData = filteredData.filter(d =>
          d.hangseng && d.hangseng.volume >= filters.minVolume
        );
      }

      if (filters.maxVolume && filters.maxVolume > 0) {
        filteredData = filteredData.filter(d =>
          d.hangseng && d.hangseng.volume <= filters.maxVolume
        );
      }

      if (filters.trend) {
        filteredData = filteredData.filter(d => {
          if (!d.hangseng) return false;
          const change = d.hangseng.close - d.hangseng.open;
          switch (filters.trend) {
            case 'bullish':
              return change > 0;
            case 'bearish':
              return change < 0;
            case 'neutral':
              return change === 0;
            default:
              return true;
          }
        });
      }

      if (filters.festival) {
        filteredData = filteredData.filter(d =>
          d.calendar && d.calendar['节日'] &&
          d.calendar['节日'].includes(filters.festival)
        );
      }
    }

    res.json({
      query: {
        startDate: startDate,
        endDate: endDate,
        filters: filters || {}
      },
      totalResults: filteredData.length,
      data: filteredData
    });
  } catch (error) {
    console.error('Error searching combined data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;