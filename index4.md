# index4.html — Multi-Account Revenue Dashboard

Served at **`/index4`** (`app.js` route → `index4.html`). A full-screen, dark-themed wall dashboard showing live and historical **net revenue (MYR)** for one or more solar accounts, with Chart.js graphs and an account-ratio footer. Accounts are grouped into **pages** (slides) that rotate automatically, each for its own time (default 20s, see §8). An account can be on more than one page, e.g. account 1 + 2 together, then each on its own page. Built for a large desktop or TV screen. At 768px or narrower everything is hidden and a "use a PC" message is shown.

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

---

## 3. API calls

| Function | Endpoint | Returns / used for |
|---|---|---|
| `getAllAccount()` | `GET /getAllUsername` | List of accounts `{ username, min_vindex }` for the picker |
| `getUsernameInfo()` | `GET /getUsernameInfo` | Account metadata → `usernamesHM` (`description`, `description3`) |
| `getTGSolarDataSingle(apiName, chartType, user)` | `GET /getTGSolar/:type/:user` | Indicator data or chart detail (see below) |
| `getDailyData(start, end, user)` | `GET /getDailyDateStart/:date/:user` (or `/getDailyDate/:from/:to/:user`) | Today's 5-minute readings (`json` column per row) |
| `getLastUpdateTime(user)` | `GET /getLastUpdateTime/:user` | `datetime_utc8` of last scrape; used for the staleness check |
| `getHistoryRatios(user1, user2)` | `POST /getHistoryRatiosByUsername` (body `{ formData: { username1, username2 } }`) (falls back to `GET /getHistoryRatios` when a username is blank) | `{ min, max }` user1/user2 daily revenue ratio over last 3 months (`null` if no matching days). Called once per page that has exactly 2 accounts, with that page's pair |
| `getHistoryMaxPVData()` | `GET /getHistoryMaxPV` | `[{ username, max }]` peak PV per account (last 3 months). Matched to `#maxPV_<username>` by username |
| `loadHighestRevenue(pageIndex)` | `POST /getHighestRevenueByUsernames` (body `{ formData: { usernames: [...] } }`) | `{ highest, time }`: record day revenue + date for the accounts on that page. Called once per page from `startRefetchInterval()` |

`GET /getHighestRevenue` (hard-coded to `tgrsolar` + `tgrsolar1`) still exists, but index4 no longer uses it. Both endpoints share `getHighestRevenueByUsernames()` in `app.js`.

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
├── #slider  (overflow hidden)
│   └── #sliderTrack  (flex row, slides with transform: translateX(-N × 100%))
│       └── .page#page_<i>   one per page, 100% wide, clips its own overflow
│           ├── #container_top_p<i>  (.divAccountContainerTop)   ← totals of THIS page's accounts
│           │   ├── #pageTitle_p<i>  (.pageTitle)  usernames on the page ("tgrsolar + tgrsolar1"), set into the
│           │   │                    top border like a tab; each name in its account's border colour,
│           │   │                    then .pageTitleLocation "📍 <location>" (accounts.location, each
│           │   │                    distinct location once via getPageLocations(), hidden if none set)
│           │   ├── Last Month    #divTodayLastMonth_Today_p<i>
│           │   ├── This Month    #divTodayThisMonth_Today_p<i>
│           │   └── Today  [sun → /index]
│           │        #divTodayTotal_Today_p<i>
│           │        #divTotal_Yesterday_p<i>      (smaller, brown: yesterday total)
│           │        #divTotal_HighestTime_p<i>    (tiny grey date)
│           │        #divTotal_Highest_p<i>        (cyan: record day)
│           ├── #containerMain_<i>  (.containerMain, inline-flex row, one column per account)
│           │   └── #container_<slot>  (.divAccountContainer, one colour per account)
│           │       ├── #section_Today_<slot>
│           │       │   ├── .energy-block > #chartBlock_<slot> > canvas#thisDayDetailChart_<slot>
│           │       │   ├── .net-revenue.net-revenue-today #divNetRevenue_<slot>  [data-username]
│           │       │   │     live indicator + sun (.logoSun → Page Settings), trend arrow,
│           │       │   │     #mainValueDiv_Today_<slot>, #mainValueDiv2_Today_<slot> (yesterday),
│           │       │   │     #avgRevenue_<slot> ("Avg RMx.xx/hr")
│           │       │   ├── .installTypeClass       description (hidden by CSS)
│           │       │   └── .installTypeExtraClass  description3 key/value rows
│           │       ├── #section_Yesterday_<slot>   → "This Month" + canvas#thisMonthDetailChart_<slot>
│           │       └── #section_LastMonth_<slot>   → "Last Month" + canvas#lastMonthDetailChart_<slot>
│           └── #bottomFooterContainer_p<i>  (.pageFooter)
│               ├── #maxPV_<slot>.maxPV[data-username]   "Max PV: x kW", one per account on the page
│               └── #accountRatio_p<i>   "Ratio: (Min) a (Live) b (Max) c", only on a page of
│                                        exactly 2 accounts (between the two Max PVs)
└── #pageDots                (absolute, under the countdown; only with 2+ pages)
    └── .pageDot × pages     in the page's colour; click to jump; .active = current page (filled)
```

`buildPages()` builds every page's skeleton up front: top, empty `.containerMain` and footer. `refetchData(username, pageIndex)` then adds the account's column to `#containerMain_<pageIndex>`. Look up the `_p<i>` elements with `getPageElement(baseId, pageIndex)`.

### Slots (one account on several pages)
Each copy of an account is a **slot**, with `getSlotKey(username, pageIndex)` = `<username>_p<pageIndex>` (e.g. `tgrsolar@teckguan.com_p1`). Element ids (`<slot>` above), the chart maps and the `dataHM` keys all use the slot key, so the copies never clash. API calls, `usernamesHM`, the name shown in the panel, `data-username` (stale check, Max PV) and the border colour (`accountColorHM`) use the real username.

Each page has its own colour (`getPageColor(pageIndex, firstPageColor)`), so pages can be told apart. Page 1 uses the first colour from `brightColors`, and pages 2+ take turns through `pageColors` (blue, pink, lavender, amber, teal, coral, silver), which are picked to stand apart from the account colours. The page colour is used for the top container's border, the page's `.pageDot` (via `--page-color`; the active dot is filled and scaled up) and a glow at the top of the `.page` (`--page-glow`, only when there are 2+ pages). The glow strength (alpha, `Off`–100%, default 50%) is the **Page glow** dropdown in Page Settings. It's applied straight away (`applyPageGlow()`) and saved in `localStorage.TGSolar_pageGlow`. `buildPages()` then gives each account the next colour from `brightColors`, in page order (`accountColorHM`), so the page title can use the same colours. An account keeps its colour on every page. `.page` has `padding-top: 1.2vw` to leave room for the title tab above the border.

`makeGradientFromMainColor()` turns each colour from `getColorRemaining()` into the `--border-gradient` used by the animated border.

Elements are created once and then updated in place on later refreshes (`isNew` checks, `getElementById` lookups). This includes each `.net-revenue` panel: its `innerHTML` is only built when `isNew`, and later refreshes only update the value. Charts are kept in maps keyed by username and updated with `chart.update('none')`.

### Value animation
- `animateNumber(el, to)` counts an element from the number it shows to `to` (1.2s, easeOutCubic, plain `requestAnimationFrame`, no library). After that it flashes green (`.value-flash-up`) if the value went up, red (`.value-flash-down`) if it went down. The first value an element gets only counts up from 0 and doesn't flash. Unchanged values do nothing. Non-numeric values (`"-"`) are written as-is.
- Used directly for the top totals and `#divTotal_Highest`.
- For account panels, all writes go through `setPendingValue(el, v)` (stored in `data-pending`). `commitPendingValues(container)` runs in `refetchData`'s `finally` and animates each element once. This matters because one refresh can write the same element several times (e.g. "This Month" gets the server value first, then the chart total, then the manual-fix total). **Don't read these elements' text back mid-refresh.** Read `dataHM` instead.

---

## 5. Data flow

### Startup (`$(document).ready`)
1. Show the spinner, then `getSelectedURL()`. **This redirects** if `localStorage.TGSolar_selectedURL` differs from the current path.
2. Fetch the account list and username info.
3. `getSavedPages()` reads `localStorage.TGSolar_pages` and checks it against the server list. Unknown accounts are dropped, an account is only kept once per page (it may be on several pages), empty pages are removed, and accounts inside a page are sorted by username. If nothing is left (or nothing was saved yet), it falls back to one page with `TGSolar_selectedUsers`, then to `available_accounts[0]`. It returns `[{ accounts, seconds }]`, which is saved back with `savePages()` and then split into the `pages` and `pageSeconds` globals.
4. `buildPages()` builds the slider with one slide per page, then goes back to the page shown before the last reload (`sessionStorage.TGSolar_index4_page`).
5. `startRefetchInterval()` runs, then `startSlideTimer()`.
6. In parallel: `getHistoryRatios()` fills the min/max of each page that has 2 accounts, and `getHistoryMaxPVData()` fills every `#maxPV_<username>`.

### `refetchDataAll(pages)`
It first clears `refreshFetchCache`. Then for each page, and each account on it in order: call `refetchData(user, pageIndex)`, and add up `Today_<slot>`, `ThisMonth_<slot>` (+ `ThisMonth_OtherAcc_ExtraInfo_<slot>`), `Last Month_<slot>` and `Yesterday_<slot>` from `dataHM`. It then writes **that page's** totals into `#container_top_p<i>`. Every account is refreshed every cycle, whichever page is showing. All 6 requests in `refetchData` go through `getCachedData()`, so an account on several pages is still fetched **once** per refresh. Each slot gets its own `structuredClone` of the response.

If the page has exactly 2 accounts, the **live ratio** is `Today[acct0] / Today[acct1]` (username order). It is stored in `pageRatios[i].live` and drawn by `renderPageRatio(i)`.

In `finally` it checks each account's last scrape time, once per account. This marks every copy of the account. **More than 15 minutes old** → that account's `.net-revenue-today` panel turns red (`#db0000`). If the scrape is recent, or the time can't be fetched, the panel goes back to transparent. The colour is set once per refresh (it isn't cleared first), and the change fades over 0.8s.

### `refetchData(username)`
1. Wait 1s, then fetch today, yesterday and last-month indicators, the last-month detail, the this-month detail, and today's daily rows.
2. Build or update the three sections. The `earning_map` value is stored in `dataHM` as `"<label>_<slot>"`.
3. `loadLastMonthDetailChart`, then `loadthisMonthDetailChart`, then `loadDailyDayDetailChart`.
4. Attach `openPageSettingsDialog` to every `.logoSun`.

### Label mapping quirk
| Section label | Shown as | Big number comes from |
|---|---|---|
| `Today` | "Live Today" | indicator, or the daily cumulative if the server value is `null` |
| `Yesterday` | **"This Month"** | Sum of this-month chart bars (including today), set in `loadthisMonthDetailChart` |
| `Last Month` | "Last Month" | indicator, or the sum of detail bars if `null` |

"Yesterday" (the small number under Today) is the **second-to-last bar** of the this-month chart, read in `loadDailyDayDetailChart`.

### `dataHM` keys
`Today_<slot>`, `Yesterday_<slot>`, `Last Month_<slot>`, `ThisMonth_<slot>`, `ThisMonth_OtherAcc_ExtraInfo_<slot>`. Every slot of the same account ends up with the same values, because each slot runs the full calculation on its own copy of the data.

### Manual fix (`manualFixData = true`)
When the server's `earning_map` value is `null` (usually the 2nd account), the page works the value out itself:
- **Today** = the cumulative from the daily readings. It is written into the last bar of the this-month chart.
- **This Month** = this-month total without today + today. Today's part is stored separately in `ThisMonth_OtherAcc_ExtraInfo_<slot>` so the grand total doesn't count it twice.
- **Last Month** = the sum of the last-month detail bars.

---

## 6. Charts

### Today: `thisDayDetailChart_<slot>` (line)
- Input: today's 5-min rows. `recalculateSavings(rows, 0.37)` recomputes `energyKWh`, `savingsRM` and `cumulativeRM` from `pv` (W). `aggregateByIntervalV2(rows, 30)` then groups them into **30-minute bins**, averaging pv/grid/load and summing energy/savings.
- Starts one bin before the first `pv > 0`.
- Datasets: **PV (W)** (`y1`, red), **Cumulative Net Revenue** (`y`, green fill).
- If the last PV bin is lower than the one before, it is bumped to previous × 1.05 to smooth the partial bin.
- **Trend arrow** (`#<user>_status`) compares the last two *raw* 5-min PV readings: ⬆ green, ⬇ red, ↔ yellow. All blink.
- `dataLabelsPlugin` draws large yellow revenue labels on every 2nd point (skips index 0 and `length-3`).
- Custom HTML legend overlay (`#legendOverlay_<slot>`), so the chart doesn't resize.
- **Avg RM/hr** = total savings ÷ (bins × 0.5h).

### This Month: `thisMonthDetailChart_<slot>` (bar)
- Bars: daily `netRevenue` (purple). Today is appended using `dataHM.Today_<slot>`.

### Last Month: `lastMonthDetailChart_<slot>` (bar)
- Daily `netRevenue`, yellow bars, white border.

### Chart sizing
Canvas width = `innerWidth − netRevenuePanelWidth − 10% innerWidth`, and the first account's size is reused for the others (`firstAccount_*Chart_Size*`). The today chart starts at width 0 and fills its flex container.

---

## 7. Refresh cycle

```js
const minuteGap = 2;                 // refresh every 2 min
const gapToRefetch = minuteGap * 60; // seconds
```
- `startRefetchInterval()` calls `loadHighestRevenue()` **once** for each page, runs `refetchDataAll(pages)`, then starts a 1-second countdown shown in `#topLeft`.
- When the countdown hits 0, `refreshCount++`. Every **30th** refresh (about 60 min at 2-min gaps) it does a full page reload via `safeReload()`, after a `getUsernameInfo()` call raced against a 10s timeout. Otherwise it calls `refetchDataAll`.
- `safeReload()` pings `/getServerTime` (10s timeout) and only reloads if the server answers. It retries up to 3 times, 5s apart, so a working page is never swapped for an error page.

---

## 8. User interaction

| Click target | Action |
|---|---|
| Sun icon in **top** container | Go to `/index` and save it as `TGSolar_selectedURL` |
| Sun icon (`.logoSun`) in any account's Today panel | Open **Page Settings** (`openPageSettingsDialog`, a `SimpleDialog`, large fonts for the TV). It is a grid of checkboxes with one row per server account (username, with its `📍 location` underneath when set) and one column per page: the current pages plus one empty column, and **+ Add Page** adds more. An account can be ticked on several pages, and an account ticked nowhere is hidden. Each column header has a **✕** that removes the page; the columns after it renumber. A bottom **Show for** row has a dropdown per page (5s – 5 min) for how long that page stays up. It closes with **Done** or a click outside. On close, pages are built from the columns in order. Empty columns are skipped too, so "Page 1 + Page 3" becomes 2 pages. If every account is hidden, it defaults to the first account. **If nothing changed, it just closes.** Otherwise it calls `savePages()`, stops the refresh and slide timers, shows the spinner and runs `safeReload()` |
| Page dot (`.pageDot`) | Jump to that page |
| ← / → keys | Previous / next page (wraps around; ignored while a dialog is open) |
| Swipe left / right (touch) | Next / previous page |

### localStorage
| Key | Content |
|---|---|
| `TGSolar_pages` | JSON array of pages `{ accounts: [usernames], seconds }`, e.g. `[{"accounts":["a@x","b@x"],"seconds":30},{"accounts":["a@x"],"seconds":10}]`. A username can appear on several pages. The first version saved plain arrays of usernames (`[["a@x","b@x"],["a@x"]]`); those still load with the default 20s and are rewritten in the new format. Owned by index4 |
| `TGSolar_pageGlow` | Page glow strength, a number 0–1 (alpha of the page colour, `0` = off, default `0.5`). Set in Page Settings. Owned by index4 |
| `TGSolar_selectedUsers` | JSON array of selected account objects (sorted by username on read). Shared with the other dashboards. index4 only reads it as the first-run fallback; `savePages()` keeps it in step with every account on any page (each account once) |
| `TGSolar_selectedURL` | Last chosen dashboard path; **the page redirects there on load** |

`sessionStorage.TGSolar_index4_page` remembers the current page, so the hourly reload comes back to the same slide.

### Slides
```js
const defaultSlideSeconds = 20;  // how long a page stays up when not set
const slideSecondsOptions = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 300]; // "Show for" choices
const slidePauseSeconds = 60;    // after a manual move
```
Each page has its own time (`pageSeconds[i]`, read through `getPageSeconds(i)`). `startSlideTimer()` checks every second and calls `goToPage(currentPage + 1)` once `nextSlideAt` has passed, then sets `nextSlideAt` from the **new** page's time (only when there are 2+ pages). Because of the 1-second check, a page can stay up to 1s longer than its setting. The dot tooltips show each page's time. Dots, keys and swipes go through `manualGoToPage()`, which pushes `nextSlideAt` back by `slidePauseSeconds`. Pages are never set to `display:none`. They all stay laid out side by side so Chart.js keeps their sizes.

---

## 9. Account `description3`
If `usernamesHM.get(user).description3` is valid JSON, each key/value pair is shown as a `desc-key: desc-val` row beside the Today panel. Otherwise the raw string is shown.

---

## 10. Things to know / gotchas

- **`getSelectedURL()` redirect.** If a viewer last clicked the top sun (which saves `/index`), opening `/index4` sends them back to `/index`. index4 never saves `/index4` itself.
- **Tariff mismatch.** The daily chart recomputes savings at **RM0.37/kWh** (`recalculateSavings`, `calculateCumulativeRM_Daily`). CLAUDE.md says the TNB commercial rate is ~RM0.4460. The daily cumulative used for the manual fix (2nd account) is based on 0.37.
- **Hanging promises.** `getTGSolarDataSingle`, `getDailyData` and `getAllAccount` `throw` inside `new Promise(async ...)` executors. On an HTTP error the promise never settles, so `refetchData` waits forever. The 30-minute reload path works around this for `getUsernameInfo` with `Promise.race`.
- **The ratio only shows on pages with exactly 2 accounts**, in username order (account 1 / account 2). A page with 1 or 3+ accounts shows only the Max PVs.
- **Record day** (`/getHighestRevenueByUsernames`) adds each account's own best day together, which may be different dates. The `time` shown is the best-day date of the page's first account.
- **The new endpoint needs the new `app.js`.** Against an older server, `/getHighestRevenueByUsernames` hits the catch-all, and the record day stays `-` (logged as `loadHighestRevenue error`).
- **Narrow screens.** At 1920px the layout is already wider than the screen (this was true before paging too). Each `.page` clips its own overflow so it can't spill into the next slide, so on such a screen the right edge is cut off instead of scrolling.
- `installTypeExtra` is an implicit global (no `let`).
- `loadthisMonthDetailChart` is called with a 4th argument (`todayData`) that it ignores.
- `.installTypeClass` has `display: none`, so the account `description` is hidden; only `description3` shows.
- Font sizes use `vw` units heavily, so the layout is tuned for a wide screen.
