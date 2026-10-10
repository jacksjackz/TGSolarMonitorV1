APIs used (base: https://tgapps.synology.me:40556)

#  Method  Endpoint                                     scriptInit  scriptPost  Target
-  ------  -------------------------------------------  ----------  ----------  ----------------------------------
1  POST    /postTGSolar                                 Yes         Yes         In-memory mapTGSolarAccount (live)
2  GET     /getDataPreviousMonth/{MMYYYY}/{username}    Yes         -           datapreviousmonth table
3  POST    /postDataPreviousMonth                       Yes         -           datapreviousmonth table
4  GET     /getDataCurrentMonth/{MMYYYY}/{username}     Yes         -           datacurrentmonth table
5  POST    /postDataCurrentMonth                        Yes         -           datacurrentmonth table
6  GET     /getDailyDateLatest/{DDMMYYYY}/{username}    Yes         -           datadaily table
7  POST    /postDailyDate                               Yes         -           datadaily table

Notes:
- scriptPost.js calls only #1 (type: id_target_today).
- scriptInit.js calls all 7.
- Both scripts are in temp1/.


Request format
--------------
All POSTs: header "Content-Type: application/json", body wrapped as { formData: { ... } }.

Date formats:
- MMYYYY     month zero-padded, e.g. "092026"
- DDMMYYYY   day and month zero-padded, e.g. "05102026"
- datetime   "YYYY-MM-D HH:mm", e.g. "2026-10-5 11:55" (day not padded)


1. POST /postTGSolar
   Body:
   {
     "formData": {
       "data": <array, see below>,
       "type": "id_target_today",
       "myusername": "tgrsolar@teckguan.com"      <- key is myusername, not username
     }
   }
   Response: "OK"
   Read back with GET /getTGSolar/{type}/{username}

   type values and their data:
   - id_target_today, id_target_yesterday, id_target_last_month
       [ { "type": "...", "value": 123.4, "unit": "kWh", "data_type": "..." }, ... ]
   - id_target_last_month_detail, id_target_current_month_detail
       month detail array (same as jsonData in #3 / #5)


2. GET /getDataPreviousMonth/{MMYYYY}/{username}
4. GET /getDataCurrentMonth/{MMYYYY}/{username}
   Response: { "json": "<stringified array>" }, or empty body if no row
   Parse twice: JSON.parse(JSON.parse(response).json)


3. POST /postDataPreviousMonth
5. POST /postDataCurrentMonth
   Body:
   {
     "formData": {
       "monthyear": "092026",
       "jsonData": [
         {
           "time": "2026-09-01",
           "pv": "1,234.5",                 <- string, raw table cell (may contain commas)
           "purchased_energy": "456.7",     <- string
           "feed_in": "0",                  <- string
           "load": "1,691.2",               <- string
           "netRevenue": 550.587            <- number, parseFloat(pv) * 0.4460
         },
         ...
       ],
       "username": "tgrsolar@teckguan.com"
     }
   }
   Response: the upserted row (insert, or update json on same monthyear + username)
   - Previous month: monthyear = last month
   - Current month:  monthyear = this month, rows up to yesterday only (today removed)


6. GET /getDailyDateLatest/{DDMMYYYY}/{username}
   Response: array with 0 or 1 row (latest by datetime)
   [ { "vindex": 1, "dateonly": "05102026", "datetime": "...", "json": "<stringified reading>", "username": "..." } ]
   Empty array = no readings yet today


7. POST /postDailyDate
   Body:
   {
     "formData": {
       "dateonly": "05102026",
       "datetime": "2026-10-5 11:55",
       "json": {
         "time": "11:55",
         "pv": 12500,             <- W
         "grid": 300,             <- W
         "load": 12800,           <- W
         "energyKWh": 1.0417,     <- pv kW * 5/60
         "savingsRM": 0.46,       <- energyKWh * 0.4460, rounded to 0.01
         "cumulativeRM": 45.12    <- running total of savingsRM for the day
       },
       "username": "tgrsolar@teckguan.com"
     }
   }
   Response: the inserted row, or "from Server: not posted" if json.pv is null
   - One POST per 5-minute reading, 200ms apart, only readings newer than #6's latest.
