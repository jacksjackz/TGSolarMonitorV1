# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TG Solar Monitor is a solar energy monitoring dashboard for tracking PV (photovoltaic) generation, grid usage, and revenue from solar installations in Malaysia (using TNB commercial rate ~RM0.37/kWh). It consists of a Node.js/Express API server backed by PostgreSQL, multiple HTML dashboard frontends, and browser console scripts that scrape data from a third-party solar monitoring portal.

## Running the Application

```bash
# Install dependencies
npm install

# Start the server (runs on port 40555)
node app.js
```

The server requires PostgreSQL credentials in `protected/sql.txt` (asterisk-delimited format: `host*db*user*password*port`). This file is blocked from web access by the `protectPath` middleware.

## Deployment

Deployed via Docker to a Synology NAS (`tgapps.synology.me`). See `how to deploy synology.txt` for full commands.

```bash
# One-liner rebuild and redeploy
sudo docker build -t tgsolarmonitor . && sudo docker stop tgsolarmonitor && sudo docker rm -f tgsolarmonitor && sudo docker create --name tgsolarmonitor --network=tgappsnetwork --restart=always -p 40555:40555 tgsolarmonitor && sudo docker start tgsolarmonitor
```

The container uses the `tgappsnetwork` Docker network (shared with other services including the PostgreSQL database).

## Architecture

### Backend (`app.js`)
Single Express server handling both API routes and static file serving. Uses an in-memory `Map` (`mapTGSolarAccount`) for live/realtime solar data keyed by username, and PostgreSQL for persistent historical data. A midnight housekeeping job (UTC+8) clears non-current-day rows from `datadaily`.

### Database (PostgreSQL)
Four tables, auto-created on startup:
- **`datapreviousmonth`** - Completed month summaries (unique on `monthyear` + `username`)
- **`datacurrentmonth`** - Current month data up to yesterday (unique on `monthyear` + `username`)
- **`datadaily`** - Intraday readings with timestamps (cleaned up nightly)
- **`accounts`** - User accounts with descriptions (unique on `username`)

### Frontend Pages
- **`index2.html`** (`/index2`) - **Main page.** Detailed analytics with revenue ratios, historical comparisons, and Chart.js graphs
- **`index.html`** (`/index`) - Dashboard showing live solar data, daily charts, and account info
- **`index3.html`** (`/index3`) - Battery/PV visualization with animated battery component

All frontends use Chart.js for graphs, jQuery, Moment.js, and inline `<script>` blocks that fetch from the API.

### Browser Scraping Scripts (run in browser console on the solar portal)
- **`script.js`** - Scrapes today's, yesterday's, and last month's indicator data, posts to `/postTGSolar`

These scripts interact with DOM elements of the third-party solar portal (class names like `el-row`, `indicator-list`, `el-table__body`).

### Highest Revenue Feature
- **Backend**: `getHighestRevenueByUsername_previousmonth(username)` and `getHighestRevenueByUsername_currentmonth(username)` in `app.js` iterate daily entries in the `json` column (array of objects with `netRevenue`) to find the single highest daily net revenue.
- **API**: `GET /getHighestRevenue` returns `{ highest }` — the max daily `netRevenue` across both users (`tgrsolar@teckguan.com`, `tgrsolar1@teckguan.com`) and both `datapreviousmonth` (last 3 months) and `datacurrentmonth` tables.
- **Frontend**: `divTotal_Highest` in `index2.html` displays the result, fetched once (not on interval) at the start of `startRefetchInterval()`.

### API Pattern
All API routes use explicit CORS preflight (`app.options`) and `cors(corsOptions)` middleware. POST endpoints expect `req.body.formData.*` structure. Data is stored/returned as JSON strings in the `json` text column.

## Key Files

- `protected/sql.txt` - PostgreSQL credentials (never commit actual values)
- `js/SimpleDialog.js` - Shared dialog component used across frontends
- `css/simple_dialog.css`, `css/modal_dialog.css` - Dialog styles
