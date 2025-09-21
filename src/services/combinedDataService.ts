import pool from '../config/database';

interface CombinedDayData {
  date: string;
  calendar: any;
  hangseng: any;
}

export class CombinedDataService {

  async getCombinedDataForDate(date: Date): Promise<CombinedDayData> {
    const dateString = date.toISOString().split('T')[0];

    // Get calendar data
    const calendarQuery = `
      SELECT date, data
      FROM calendar_dates
      WHERE date = $1
    `;

    // Get Hang Seng data (matching by date only, ignoring time)
    const hangsengQuery = `
      SELECT *
      FROM hangseng_index
      WHERE DATE(date) = $1
      ORDER BY date DESC
      LIMIT 1
    `;

    try {
      const [calendarResult, hangsengResult] = await Promise.all([
        pool.query(calendarQuery, [dateString]),
        pool.query(hangsengQuery, [dateString])
      ]);

      return {
        date: dateString,
        calendar: calendarResult.rows[0]?.data || null,
        hangseng: hangsengResult.rows[0] || null
      };
    } catch (error) {
      console.error('Error fetching combined data:', error);
      throw error;
    }
  }

  async getCombinedDataForRange(startDate: Date, endDate: Date): Promise<CombinedDayData[]> {
    const startString = startDate.toISOString().split('T')[0];
    const endString = endDate.toISOString().split('T')[0];

    // Combined query to get both calendar and hangseng data
    const query = `
      WITH date_range AS (
        SELECT generate_series($1::date, $2::date, '1 day'::interval)::date as date
      ),
      calendar_data AS (
        SELECT date, data as calendar_data
        FROM calendar_dates
        WHERE date >= $1 AND date <= $2
      ),
      hangseng_data AS (
        SELECT
          DATE(date) as date,
          id,
          open,
          high,
          low,
          close,
          volume,
          adjusted_close,
          created_at,
          updated_at
        FROM hangseng_index
        WHERE DATE(date) >= $1 AND DATE(date) <= $2
      )
      SELECT
        dr.date,
        cd.calendar_data,
        json_build_object(
          'id', hd.id,
          'date', hd.date,
          'open', hd.open,
          'high', hd.high,
          'low', hd.low,
          'close', hd.close,
          'volume', hd.volume,
          'adjusted_close', hd.adjusted_close,
          'created_at', hd.created_at,
          'updated_at', hd.updated_at
        ) as hangseng_data
      FROM date_range dr
      LEFT JOIN calendar_data cd ON dr.date = cd.date
      LEFT JOIN hangseng_data hd ON dr.date = hd.date
      ORDER BY dr.date
    `;

    try {
      const result = await pool.query(query, [startString, endString]);

      return result.rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        calendar: row.calendar_data || null,
        hangseng: row.hangseng_data?.id ? row.hangseng_data : null
      }));
    } catch (error) {
      console.error('Error fetching combined range data:', error);
      throw error;
    }
  }

  async getCombinedDataWithAnalysis(date: Date): Promise<any> {
    const combinedData = await this.getCombinedDataForDate(date);

    // Add analysis if both data exist
    if (combinedData.calendar && combinedData.hangseng) {
      const analysis: any = {
        ...combinedData,
        analysis: {
          marketPerformance: this.analyzeMarketPerformance(combinedData.hangseng),
          lunarSignificance: this.analyzeLunarSignificance(combinedData.calendar),
          auspiciousForTrading: this.checkAuspiciousForTrading(combinedData.calendar)
        }
      };

      return analysis;
    }

    return combinedData;
  }

  private analyzeMarketPerformance(hangsengData: any): any {
    if (!hangsengData) return null;

    const change = hangsengData.close - hangsengData.open;
    const changePercent = (change / hangsengData.open) * 100;
    const volatility = ((hangsengData.high - hangsengData.low) / hangsengData.low) * 100;

    return {
      change,
      changePercent: changePercent.toFixed(2),
      volatility: volatility.toFixed(2),
      trend: change > 0 ? 'bullish' : change < 0 ? 'bearish' : 'neutral',
      volumeLevel: this.categorizeVolume(hangsengData.volume)
    };
  }

  private categorizeVolume(volume: number): string {
    const billion = 1000000000;
    if (volume > 5 * billion) return 'very high';
    if (volume > 3 * billion) return 'high';
    if (volume > 2 * billion) return 'moderate';
    return 'low';
  }

  private analyzeLunarSignificance(calendarData: any): any {
    if (!calendarData) return null;

    return {
      lunarDate: calendarData['农历日期'] || calendarData['黄历日期'],
      zodiac: calendarData['生肖'],
      solarTerm: calendarData['节气'],
      festival: calendarData['节日'],
      ganZhi: calendarData['干支日期']
    };
  }

  private checkAuspiciousForTrading(calendarData: any): any {
    if (!calendarData) return null;

    const auspicious = calendarData['宜'] || '';
    const inauspicious = calendarData['忌'] || '';

    // Check if trading-related activities are mentioned
    const tradingKeywords = ['交易', '纳财', '开市', '立券', '买车', '提车'];
    const avoidKeywords = ['破财', '诉讼', '争讼'];

    const goodForTrading = tradingKeywords.some(keyword => auspicious.includes(keyword));
    const badForTrading = avoidKeywords.some(keyword => inauspicious.includes(keyword)) ||
                          tradingKeywords.some(keyword => inauspicious.includes(keyword));

    return {
      auspicious: auspicious.split('、').filter(Boolean),
      inauspicious: inauspicious.split('、').filter(Boolean),
      tradingRecommendation: badForTrading ? 'avoid' : goodForTrading ? 'favorable' : 'neutral',
      hasFinancialActivities: goodForTrading
    };
  }

  async getMonthlyOverview(year: number, month: number): Promise<any> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    const data = await this.getCombinedDataForRange(startDate, endDate);

    // Calculate monthly statistics
    const tradingDays = data.filter(d => d.hangseng !== null);
    const calendarDays = data.filter(d => d.calendar !== null);

    let monthlyStats = null;
    if (tradingDays.length > 0) {
      const prices = tradingDays.map(d => d.hangseng.close).filter(Boolean);
      const volumes = tradingDays.map(d => d.hangseng.volume).filter(Boolean);

      monthlyStats = {
        tradingDays: tradingDays.length,
        avgClose: prices.reduce((a, b) => a + b, 0) / prices.length,
        highestClose: Math.max(...prices),
        lowestClose: Math.min(...prices),
        totalVolume: volumes.reduce((a, b) => a + b, 0),
        avgVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length
      };
    }

    return {
      year,
      month,
      totalDays: data.length,
      tradingDays: tradingDays.length,
      calendarDataAvailable: calendarDays.length,
      monthlyStats,
      data
    };
  }
}