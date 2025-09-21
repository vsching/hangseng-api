import { Router, Request, Response } from 'express';
import { ChineseCalendarService } from '../services/chineseCalendarService';

const router = Router();
const calendarService = new ChineseCalendarService();

router.get('/calendar/date/:date', async (req: Request, res: Response) => {
  try {
    const date = new Date(req.params.date);

    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const calendarData = await calendarService.getCalendarForDate(date);
    res.json(calendarData);
  } catch (error) {
    console.error('Error getting calendar date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/calendar/range', async (req: Request, res: Response) => {
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

    const calendarData = await calendarService.getCalendarByDateRange(startDate, endDate);
    res.json(calendarData);
  } catch (error) {
    console.error('Error getting calendar range:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/calendar/populate/:year', async (req: Request, res: Response) => {
  try {
    const year = parseInt(req.params.year);

    if (isNaN(year) || year < 1900 || year > 2100) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    await calendarService.populateCalendarForYear(year);
    res.json({ message: `Calendar populated for year ${year}` });
  } catch (error) {
    console.error('Error populating calendar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;