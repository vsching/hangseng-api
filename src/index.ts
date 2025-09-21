import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './config/database';
import calendarRoutes from './routes/calendarRoutes';
import hangsengRoutes from './routes/hangsengRoutes';
import combinedRoutes from './routes/combinedRoutes';
import { CronService } from './services/cronService';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Hang Seng & Chinese Calendar API',
    version: '1.0.0',
    endpoints: {
      calendar: {
        'GET /api/calendar/date/:date': 'Get Chinese calendar for specific date',
        'GET /api/calendar/range': 'Get calendar data for date range',
        'POST /api/calendar/populate/:year': 'Populate calendar for entire year'
      },
      hangseng: {
        'GET /api/hangseng/latest': 'Get latest Hang Seng index value',
        'GET /api/hangseng/historical': 'Get historical data',
        'GET /api/hangseng/stats': 'Get statistics for period',
        'POST /api/hangseng/update': 'Manually update Hang Seng data'
      },
      combined: {
        'GET /api/combined/date/:date': 'Get combined calendar and Hang Seng data for specific date',
        'GET /api/combined/analysis/:date': 'Get combined data with analysis',
        'GET /api/combined/range': 'Get combined data for date range',
        'GET /api/combined/monthly/:year/:month': 'Get monthly overview',
        'POST /api/combined/search': 'Search with filters'
      }
    }
  });
});

app.use('/api', calendarRoutes);
app.use('/api', hangsengRoutes);
app.use('/api', combinedRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

const startServer = async () => {
  try {
    await initDatabase();
    console.log('Database initialized');

    const cronService = new CronService();

    if (process.env.NODE_ENV !== 'test') {
      cronService.startScheduledTasks();

      if (process.env.LOAD_INITIAL_DATA === 'true') {
        await cronService.runInitialDataLoad();
      }
    }

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;