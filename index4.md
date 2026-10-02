# index4.html — Multi-Account Revenue Dashboard

Served at **`/index4`** (`app.js` route → `index4.html`). A full-screen, dark-themed wall dashboard showing live and historical **net revenue (MYR)** for one or more solar accounts, with Chart.js graphs, animated rain overlays, and an account-ratio footer. Built for a large desktop or TV screen. At 768px or narrower everything is hidden and a "use a PC" message is shown.

The whole page is one file: CSS in `<style>`, all logic in one inline `<script>` in `<head>`. The `<body>` only holds a few static elements. Everything else is built in JS.

---

## 1. Dependencies

| Library | Source | Used for |
|---|---|---|
| Moment.js 2.29.4 | jsDelivr | Date formatting (`DDMMYYYY`, `DD/MMM/YYYY`, `HH:mm`) |
| jQuery 3.7.1 slim | code.jquery.com | `$(document).ready`, `.text()` |
| Chart.js (latest) | jsDelivr | All charts |
| `js/SimpleDialog.js` | local | Account-picker dialog |
| `css/modal_dialog.css`, `css/simple_dialog.css` | local | Progress spinner + dialog |
| Google Font **Doto** | Google Fonts | Big dot-matrix numbers |
| `res/logo.png`, `res/sunicon.png`, `res/favicon.png` | local | Background logo, spinning sun icon |

---

## 2. Server URL configuration

```js
const testLocalServer = false;   // true → http://127.0.0.1:40555
const onlineServer   = true;     // true → "" (same origin)
let url = "https://tgapps.synology.me:40556";   // default if both false
```

`testLocalServer` wins over `onlineServer`. **Exceptions that ignore `url`:**
- `safeReload()` always pings `https://tgapps.synology.me:40556/getServerTime`.
- `getLastUpdateTime()` uses a relative path `/getLastUpdateTime/...`.
- Rain data always comes from `https://tgapps.synology.me:9234` (a separate weather service, station `63`).

---

## 3. API calls

| Function | Endpoint | Returns / used for |
|---|---|---|
| `getAllAccount()` | `GET /getAllUsername` | List of accounts `{ username, min_vindex }` for the picker |
| `getUsernameInfo()` | `GET /getUsernameInfo` | Account metadata → `usernamesHM` (`description`, `description3`) |
| `getTGSolarDataSingle(apiName, chartType, user)` | `GET /getTGSolar/:type/:user` | Indicator data or chart detail (see below) |
| `getDailyData(start, end, user)` | `GET /getDailyDateStart/:date/:user` (or `/getDailyDate/:from/:to/:user`) | Today's 5-minute readings (`json` column per row) |
| `getLastUpdateTime(user)` | `GET /getLastUpdateTime/:user` | `datetime_utc8` of last scrape; used for the staleness check |
| `getHistoryRatios()` | `GET /getHistoryRatios` | `{ min, max }` acct1/acct2 daily revenue ratio over last 3 months |
| `getHistoryMaxPVData()` | `GET /getHistoryMaxPV` | `[{ username, max }]` peak PV per account (last 3 months) |
| inline in `startRefetchInterval()` | `GET /getHighestRevenue` | `{ highest, time }`: record day revenue + date |
| `getRainData()` | `:9234/api/data/getRainDataToday/63` | Today's rain readings `[{ systemdate, value }]` |
| `getMonthlyRainData()` | `:9234/api/data/getFastRainDataByMonthYear/MM/YYYY/63` | `{ "1": mm, "2": mm, ... }` per day |

### `/getTGSolar/:type` types used

| `apiName` | `chartType` | Shape |
|---|---|---|
| `id_target_today` | `false` | 4 indicator items; index `[3]` is `earning_map` (net revenue) |
| `id_target_yesterday` | `false` | same. **Displayed as "This Month"** (see §5) |
| `id_target_last_month` | `false` | same |
| `id_target_last_month_detail` | `true` | `[{ time: "DD/Mon/YYYY", netRevenue }]` per day |
| `id_target_current_month_detail` | `true` | same, current month up to yesterday |

When an indicator response is empty, a fallback of four `"-"` items is used.

---

## 4. Page layout (built at runtime)

```
body
├── #topLeft                 "Refresh In Ns" countdown (absolute, top-left)
├── .backgroundLogo          faded res/logo.png
├── #progressDialog          loading spinner modal
├── #mobileDiv               shown only ≤768px
├── #container_top  (.divAccountContainerTop)       ← grand totals, all accounts
│   ├── Last Month    #divTodayLastMonth_Today
│   ├── This Month    #divTodayThisMonth_Today
│   └── Today  [sun → /index]
│        #divTodayTotal_Today
│        #divTotal_Yesterday      (smaller, brown: yesterday total)
│        #divTotal_HighestTime    (tiny grey date)
│        #divTotal_Highest        (cyan: record day)
├── #containerMain  (inline-flex row, one column per account)
│   └── #container_<username>  (.divAccountContainer, unique colour)
│       ├── #section_Today_<user>
│       │   ├── .energy-block > #chartBlock_<user> > canvas#thisDayDetailChart_<user>
│       │   ├── .net-revenue.net-revenue-today #divNetRevenue_<user>
│       │   │     live indicator + sun (opens account picker), trend arrow,
│       │   │     #mainValueDiv_Today_<user>, #mainValueDiv2_Today_<user> (yesterday),
│       │   │     #avgRevenue_<user> ("Avg RMx.xx/hr")
│       │   ├── .installTypeClass       description (hidden by CSS)
│       │   └── .installTypeExtraClass  description3 key/value rows
│       ├── #section_Yesterday_<user>   → "This Month" + canvas#thisMonthDetailChart_<user>
│       └── #section_LastMonth_<user>   → "Last Month" + canvas#lastMonthDetailChart_<user>
└── #bottomFooterContainer
    ├── #maxPV_left      "Max PV: x kW"  (account 1)
    ├── #accountRatio    "Ratio: (Min) a (Live) b (Max) c"
    └── #maxPV_right     "Max PV: x kW"  (account 2)
```

Each account container gets the next colour from `brightColors` (`getColorRemaining()`), and `makeGradientFromMainColor()` turns it into the `--border-gradient` used by the animated border.

Elements are created once and then updated in place on later refreshes (`isNew` checks, `getElementById` lookups). Charts are kept in maps keyed by username and updated with `chart.update('none')`.

---

## 5. Data flow

### Startup (`$(document).ready`)
1. Show the spinner, then `getSelectedURL()`. **This redirects** if `localStorage.TGSolar_selectedURL` differs from the current path.
2. Fetch the account list and username info.
3. Build `#container_top`.
4. Work out which accounts to show from `localStorage.TGSolar_selectedUsers`:
   - If the saved selection matches the server list → use it.
   - If it is empty or missing → default to `available_accounts[0]`.
5. `rainSettings_Setup()` builds the rain plugins, then `startRefetchInterval()` runs.
6. In parallel: `getHistoryRatios()` fills the footer min/max, and `getHistoryMaxPVData()` fills the footer Max PV.

### `refetchDataAll(accounts)`
For each account, in order: reset the stale highlight, call `refetchData(user)`, and add up `Today_`, `ThisMonth_` (+ `ThisMonth_OtherAcc_ExtraInfo_`), `Last Month_` and `Yesterday_` from `dataHM`. It then writes the totals into `#container_top`.

If 2 or more accounts are shown, the **live ratio** is `Today[acct0] / Today[acct1]`, written into the footer.

In `finally` it starts the rain animation, then checks each account's last scrape time. **More than 15 minutes old** → that account's `.net-revenue-today` panel turns red (`#db0000`).

### `refetchData(username)`
1. Wait 1s, then fetch today, yesterday and last-month indicators, the last-month detail, the this-month detail, and today's daily rows.
2. Build or update the three sections. The `earning_map` value is stored in `dataHM` as `"<label>_<user>"`.
3. `loadLastMonthDetailChart`, then `getMonthlyRainData`, then `loadthisMonthDetailChart`, then `loadDailyDayDetailChart`.
4. Attach the account-picker click handler to `#logoSun`.

### Label mapping quirk
| Section label | Shown as | Big number comes from |
|---|---|---|
| `Today` | "Live Today" | indicator, or the daily cumulative if the server value is `null` |
| `Yesterday` | **"This Month"** | Sum of this-month chart bars (including today), set in `loadthisMonthDetailChart` |
| `Last Month` | "Last Month" | indicator, or the sum of detail bars if `null` |

"Yesterday" (the small number under Today) is the **second-to-last bar** of the this-month chart, read in `loadDailyDayDetailChart`.

### `dataHM` keys
`Today_<u>`, `Yesterday_<u>`, `Last Month_<u>`, `ThisMonth_<u>`, `ThisMonth_OtherAcc_ExtraInfo_<u>`.

### Manual fix (`manualFixData = true`)
When the server's `earning_map` value is `null` (usually the 2nd account), the page works the value out itself:
- **Today** = the cumulative from the daily readings. It is written into the last bar of the this-month chart.
- **This Month** = this-month total without today + today. Today's part is stored separately in `ThisMonth_OtherAcc_ExtraInfo_<u>` so the grand total doesn't count it twice.
- **Last Month** = the sum of the last-month detail bars.

---

## 6. Charts

### Today: `thisDayDetailChart_<user>` (line)
- Input: today's 5-min rows. `recalculateSavings(rows, 0.37)` recomputes `energyKWh`, `savingsRM` and `cumulativeRM` from `pv` (W). `aggregateByIntervalV2(rows, 30)` then groups them into **30-minute bins**, averaging pv/grid/load and summing energy/savings.
- Starts one bin before the first `pv > 0`.
- Datasets: **Rain Today** (`y2`, cyan, animated rain), **PV (W)** (`y1`, red), **Cumulative Net Revenue** (`y`, green fill).
- If the last PV bin is lower than the one before, it is bumped to previous × 1.05 to smooth the partial bin.
- **Trend arrow** (`#<user>_status`) compares the last two *raw* 5-min PV readings: ⬆ green, ⬇ red, ↔ yellow. All blink.
- `dataLabelsPlugin` draws large yellow revenue labels on every 2nd point (skips index 0 and `length-3`).
- Custom HTML legend overlay (`#legendOverlay_<user>`), so the chart doesn't resize.
- Rain is fetched **once per refresh cycle**, guarded by `accountSettings["requestRainDataOnce_<u>"]`. It is summed into the chart's 30-min intervals and cleaned by `processArray_RainData`. The function then calls itself again with `rainSums`.
- **Avg RM/hr** = total savings ÷ (bins × 0.5h).

### This Month: `thisMonthDetailChart_<user>` (bar + line)
- Bars: daily `netRevenue` (purple). Today is appended using `dataHM.Today_<u>`.
- Overlay: **Rain (mm)** line on axis `y-rain` from the monthly rain data, with `monthlyRainPlugin`.

### Last Month: `lastMonthDetailChart_<user>` (bar)
- Daily `netRevenue`, yellow bars, white border.

### Chart sizing
Canvas width = `innerWidth − netRevenuePanelWidth − 10% innerWidth`, and the first account's size is reused for the others (`firstAccount_*Chart_Size*`). The today chart starts at width 0 and fills its flex container.

### Rain animation
`rainPlugin` and `monthlyRainPlugin` share one `rainDrops` array (100 drops). Each clips to the area under its dataset and draws falling cyan lines. `animateRain()` runs a `requestAnimationFrame` loop calling `update('none')` on every daily and monthly chart, and skips any chart with an active tooltip. Each chart's `beforeDraw` advances the shared drops, so more charts means faster rain. That is why `defaultSpeed` drops from 1.5 to 0.5 when 2 or more accounts are selected.

### `processArray_RainData(arr)`
Turns long runs of zeros into `null` so the filled rain line only shows around actual rain. It keeps one `0` on each side of a non-zero run as a ramp, and turns an all-zero array into all `null`.

---

## 7. Refresh cycle

```js
const minuteGap = 2;                 // refresh every 2 min
const gapToRefetch = minuteGap * 60; // seconds
```
- `startRefetchInterval()` fetches `/getHighestRevenue` **once**, runs `refetchDataAll`, then starts a 1-second countdown shown in `#topLeft`.
- When the countdown hits 0, `refreshCount++`. Every **30th** refresh (about 60 min at 2-min gaps) it does a full page reload via `safeReload()`, after a `getUsernameInfo()` call raced against a 10s timeout. Otherwise it calls `refetchDataAll`.
- `safeReload()` pings `/getServerTime` (10s timeout) and only reloads if the server answers. It retries up to 3 times, 5s apart, so a working page is never swapped for an error page.

---

## 8. User interaction

| Click target | Action |
|---|---|
| Sun icon in **top** container | Go to `/index` and save it as `TGSolar_selectedURL` |
| Sun icon (`#logoSun`) in an account's Today panel | Open the `SimpleDialog` account picker (checkboxes). Changes save straight to `TGSolar_selectedUsers`. On close: stop the interval, show the spinner, default to the first account if none selected, then `safeReload()` |

### localStorage
| Key | Content |
|---|---|
| `TGSolar_selectedUsers` | JSON array of selected account objects (sorted by username on read) |
| `TGSolar_selectedURL` | Last chosen dashboard path; **the page redirects there on load** |

---

## 9. Account `description3`
If `usernamesHM.get(user).description3` is valid JSON, each key/value pair is shown as a `desc-key: desc-val` row beside the Today panel. Otherwise the raw string is shown.

---

## 10. Things to know / gotchas

- **`getSelectedURL()` redirect.** If a viewer last clicked the top sun (which saves `/index`), opening `/index4` sends them back to `/index`. index4 never saves `/index4` itself.
- **Tariff mismatch.** The daily chart recomputes savings at **RM0.37/kWh** (`recalculateSavings`, `calculateCumulativeRM_Daily`). CLAUDE.md says the TNB commercial rate is ~RM0.4460. The daily cumulative used for the manual fix (2nd account) is based on 0.37.
- **Hanging promises.** `getTGSolarDataSingle`, `getDailyData` and `getAllAccount` `throw` inside `new Promise(async ...)` executors. On an HTTP error the promise never settles, so `refetchData` waits forever. The 30-minute reload path works around this for `getUsernameInfo` with `Promise.race`.
- **Footer built in three places** (`refetchDataAll`, `getHistoryRatios().then`, `getHistoryMaxPVData().then`) with different placeholder styles: `#88FBE7`/1.5vw vs `#ff0000`/1vw. Whichever runs first sets the look.
- **The footer and ratio assume 2 accounts**, in username order (`tgrsolar` then `tgrsolar1`). `/getHistoryMaxPV` orders by `min_vindex`, not username.
- **`/getHighestRevenue`** adds each account's own best day together, which may be different dates. The `time` shown is account 1's best-day date.
- `installTypeExtra` is an implicit global (no `let`).
- `loadthisMonthDetailChart` is called with a 4th argument (`todayData`) that it ignores.
- `.installTypeClass` has `display: none`, so the account `description` is hidden; only `description3` shows.
- Font sizes use `vw` units heavily, so the layout is tuned for a wide screen.
