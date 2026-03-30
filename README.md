# USE Stock Dashboard

A Next.js dashboard for Uganda Securities Exchange (USE) stocks with real-time data, sentiment analysis, and candlestick charts.

## Features

- **Real-time Stock Prices**: Automatically updated daily from African Financials
- **Candlestick Charts**: Interactive charts with daily, weekly, monthly, and yearly views
- **Sentiment Analysis**: AI-powered news sentiment analysis
- **Dividend Tracking**: Track dividend announcements and payments
- **Corporate Actions**: Monitor AGMs, earnings releases, and other corporate events
- **News Articles**: Latest news with sentiment scores
- **Financial Filings**: Latest USE-listed company documents from African Financials

## Data Source

Stock prices and filings are sourced from [African Financials](https://africanfinancials.com/uganda-securities-exchange-share-prices/)

## Daily Updates

The dashboard automatically updates stock prices daily via a cron job:
- **Schedule**: 9:00 AM UTC, Monday through Saturday
- **Endpoint**: `/api/update-prices`
- **Authentication**: Protected with `CRON_SECRET` environment variable

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables (optional for local development):
```bash
CRON_SECRET=your-secret-key-here
```

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm start
```

## Deployment

### Vercel (Recommended)

1. Deploy to Vercel:
```bash
vercel
```

2. Set up cron job:
   - Go to Vercel Dashboard → Project → Settings → Cron Jobs
   - The cron job is configured in `vercel.json`
   - Set `CRON_SECRET` environment variable in Vercel dashboard

### Manual Cron Setup

For other hosting platforms, set up a cron job to call:
```
https://your-domain.com/api/update-prices
Authorization: Bearer YOUR_CRON_SECRET
```

Schedule: `0 9 * * 1-6` (9:00 AM UTC, Monday through Saturday)

## API Endpoints

- `GET /api/stocks/[ticker]` - Get stock data for a ticker
- `GET /api/historical/[ticker]?timeframe=daily|weekly|monthly|yearly` - Get historical price data
- `GET /api/update-prices` - Manually trigger price update (requires auth)

## Chart Timeframes

- **Daily**: Last 30 days
- **Weekly**: Last 52 weeks
- **Monthly**: Last 12 months
- **Yearly**: Last 5 years

## Technologies

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Recharts
- date-fns
