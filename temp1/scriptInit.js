    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

//    const myusername = "tgrsolar1@teckguan.com";



    function isBlank(val) {
        if (val != undefined && String(val).trim().length != 0 && val != null && val != 'null')
            return false;
        return true;
    }

//    function calculateCumulativeRM_Daily(data, ratePerKWh = 0.37, intervalMinutes = 5) {
//        let cumulativeRM = 0;
//        const results = [];
//
//        data.forEach((entry, index) => {
//
//            const pvW = entry.pv ?? 0;
//            const grid = entry.grid ?? 0;
//            const load = entry.load ?? 0;
//
//            const energyKWh = (pvW / 1000) * (intervalMinutes / 60); // Convert to kWh
//            const savingsRM = energyKWh * ratePerKWh;
//
//            // Round to nearest sen (0.01)
//            const roundedRM = Math.floor(savingsRM * 100) / 100;
//
//            // Only add real RM value (0.01 and above)
//            cumulativeRM += roundedRM;
//
//            results.push({
//                time: entry.time,
//                pv: entry.pv || 0,
//                grid: entry.grid || 0,
//                load: entry.load || 0,
//                energyKWh: energyKWh || 0,
//                savingsRM: roundedRM || 0,
//                cumulativeRM: cumulativeRM || 0
//            });
//        });
//
//        return results;
//    }

function getWattType()
{
    let wattTypeTemp = "kw";

    try
    {
        let divCheckWattType = document.getElementsByClassName("el-table__header-wrapper")[0].children[0].children[1].children[0].children[1].children[0].innerText;

        if(isBlank(divCheckWattType) == false)
        {
            if (divCheckWattType.toLowerCase().includes("kw"))
            {
                wattTypeTemp = "kw";
            }
            else if (divCheckWattType.toLowerCase().includes("w"))
            {
                wattTypeTemp = "w";
            }
        }
    }
    catch(err)
    {
        console.log(err);
    }

    return wattTypeTemp;
}

// 0.376 (for factory / workshop)
function calculateCumulativeRM_Daily(data, ratePerKWh = 0.37, intervalMinutes = 5) {
    let cumulativeRM = 0;
    const results = [];

    let wattType = getWattType(); // 'kw' or 'w'
    console.log("WattType: " + wattType);

    data.forEach((entry, index) => {
        // Parse and normalize to W for processing and output
        let pvW, gridW, loadW;

        if (wattType == 'kw') {
            pvW = (entry.pv ?? 0) * 1000;
            gridW = (entry.grid ?? 0) * 1000;
            loadW = (entry.load ?? 0) * 1000;
        } else { // assume W
            pvW = entry.pv ?? 0;
            gridW = entry.grid ?? 0;
            loadW = entry.load ?? 0;
        }

        // Calculate kWh: (W / 1000) * (intervalMinutes / 60)
        const energyKWh = (pvW / 1000) * (intervalMinutes / 60);
        const savingsRM = energyKWh * ratePerKWh;

        // Round to nearest sen (0.01)
        const roundedRM = Math.floor(savingsRM * 100) / 100;

        // Only add real RM value (0.01 and above)
        cumulativeRM += roundedRM;

        results.push({
            time: entry.time,
            pv: pvW,
            grid: gridW,
            load: loadW,
            energyKWh,
            savingsRM: roundedRM,
            cumulativeRM
        });
    });

    return results;
}

    function extractIndicators(rootElement) {
        const items = rootElement.querySelectorAll('.indicator-item');
        const result = [];
        items.forEach(item => {
            const type = item.querySelector('.item-type')?.innerText.trim();
            const valueText = item.querySelector('.item-value')?.innerText.trim();
            // Remove thousands separators
            let value = Number(valueText.replace(/,/g, ''));
            const unit = item.querySelector('.item-unit')?.innerText.trim();
            const data_type = item.getAttribute('data-type');
            result.push({ type, value, unit, data_type });
        });
        return result;
    }

    async function getPreviousMonthData(monthyear) {

        return new Promise(async (resolve, reject) =>
        {
            fetch("https://tgapps.synology.me:40556/getDataPreviousMonth/" + monthyear + "/" + myusername)
                .then(response => {
                    return response.text();
                })
                .then(data => {
                    resolve(data);
                });
        });
    }

    async function getDailyData(fulldate) {

        console.log("https://tgapps.synology.me:40556/getDailyDateLatest/" + fulldate + "/" + myusername)

        return new Promise(async (resolve, reject) =>
        {
            fetch("https://tgapps.synology.me:40556/getDailyDateLatest/" + fulldate + "/" + myusername)
                .then(response => {
                    return response.text();
                })
                .then(data => {
                    resolve(data);
                });
        });
    }


    async function getDataCurrentMonth(monthyear) {

        return new Promise(async (resolve, reject) =>
        {
            fetch("https://tgapps.synology.me:40556/getDataCurrentMonth/" + monthyear + "/" + myusername)
                .then(response => {
                    return response.text();
                })
                .then(data => {
                    resolve(data);
                });
        });
    }


    function itIsToday(inputDateToCompare)
    {
        const today = new Date();

        // Compare only the date parts (year, month, day)
        const isToday =
        inputDateToCompare.getFullYear() === today.getFullYear() &&
        inputDateToCompare.getMonth() === today.getMonth() &&
        inputDateToCompare.getDate() === today.getDate();

        return isToday;
     }

    function isSameDay(date1, date2) {
        return (
         date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate()
        );
    }


    function todayMinusOne()
    {
        const today = new Date();
        today.setDate(today.getDate() - 1);
        return today;
    }

    async function postDataPreviousMonth(monthyear, jsonData)
    {
        return new Promise(async (resolve, reject) =>
        {
             let ip = "https://tgapps.synology.me:40556/postDataPreviousMonth";

            let obj = new Object();
            obj.monthyear = monthyear;
            obj.jsonData = jsonData;
            obj.username = myusername;

            let listJSON = new Object();
            listJSON.formData = obj;

            let finalJSON = JSON.stringify(listJSON);

            console.log(finalJSON);

            fetch(ip,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: finalJSON
                })
                .then(response => response.text())
                .then(data =>
                {
                    resolve(data);
                });
        });
    }


    async function postDataCurrentMonth(monthyear, jsonData)
    {
        return new Promise(async (resolve, reject) =>
        {
             let ip = "https://tgapps.synology.me:40556/postDataCurrentMonth";

            let obj = new Object();
            obj.monthyear = monthyear;
            obj.jsonData = jsonData;
            obj.username = myusername;

            let listJSON = new Object();
            listJSON.formData = obj;
            let finalJSON = JSON.stringify(listJSON);

            console.log(finalJSON);

            fetch(ip,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: finalJSON
                })
                .then(response => response.text())
                .then(data =>
                {
                    resolve(data);
                });
        });
    }

    async function postDataDaily(dateonly, datetime, json)
    {
        return new Promise(async (resolve, reject) =>
        {
            let ip = "https://tgapps.synology.me:40556/postDailyDate";

            dateonly = formatDate_AddZeros(dateonly);
            console.log("JSON");
            console.log("PV: " + json.pv);

            let obj = new Object();
            obj.dateonly = dateonly;
            obj.datetime = datetime;
            obj.json = json;
            obj.username = myusername;

            let listJSON = new Object();
            listJSON.formData = obj;

            let finalJSON = JSON.stringify(listJSON);

            console.log(finalJSON);

            fetch(ip,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: finalJSON
                })
                .then(response => response.text())
                .then(data =>
                {
                    console.log("posted daily data")
                    resolve(data);
                });
        });
    }


    function postTGSolarLive(dataInput, typeInput) {
        let ip = "https://tgapps.synology.me:40556/postTGSolar";

        const formData = {
            data: dataInput,
            type: typeInput,
            myusername: myusername
        };

        fetch(ip,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    formData: formData
                })
            })
            .then(response => response.text())
            .then(data => {
                console.log(data);
            })
            .catch(error => {
                console.log(error);
            });
    }

    // get yesterday data

    document.getElementsByClassName('iconfont icon-a-G2_Leftarrow_20')[0].click();
    await sleep(3000);
    var target_yesterday = document.getElementsByClassName("el-row indicator-list")[0];
    target_yesterday.id = "id_target_yesterday";
    var clone_target_yesterday = target_yesterday.cloneNode(true);


    // get today data
    document.getElementsByClassName('iconfont icon-a-G2_Rightarrow_20')[0].click();
    await sleep(3000);
    var target_today = document.getElementsByClassName("el-row indicator-list")[0];
    target_today.id = "id_target_today";
    var clone_target_today = target_today.cloneNode(true);

    // get last month data
    document.getElementsByClassName('el-tabs__item is-top')[2].click();
    await sleep(3000);
    document.getElementsByClassName('iconfont icon-a-G2_Leftarrow_20')[0].click();
    await sleep(3000);
    var target_last_month = document.getElementsByClassName('el-row indicator-list')[0];
    target_last_month.id = "id_target_last_month";
    var clone_target_last_month = target_last_month.cloneNode(true);


    let clearHTML = false;
    if(clearHTML == true)
    {
        // Clear the body
        document.body.innerHTML = '';
        // Append the clone
        document.body.appendChild(clone_target_today);
        document.body.appendChild(clone_target_yesterday);
        document.body.appendChild(clone_target_last_month);

    }



    console.log(extractIndicators(clone_target_today));
    console.log(extractIndicators(clone_target_yesterday));
    console.log(extractIndicators(clone_target_last_month));


    ////
    // Post the data
    postTGSolarLive(extractIndicators(clone_target_today), "id_target_today");
    postTGSolarLive(extractIndicators(clone_target_yesterday), "id_target_yesterday");
    postTGSolarLive(extractIndicators(clone_target_last_month), "id_target_last_month");

    if(clearHTML == true)
    {
        // hide question mark (today)
        document.querySelectorAll('.iconfont.tip-icon.icon-a-G2_Support_28_20.el-tooltip__trigger').forEach(function (el) {
            el.style.display = 'none';
        });


        //// hide question mark (yesterday)
        document.getElementsByClassName('iconfont tip-icon icon-a-G2_Support_28_20 el-tooltip__trigger el-tooltip__trigger')[0].remove();

        /// remove selected
        document.querySelectorAll('.el-col.el-col-6.indicator-item.indicator-select').forEach(function (el) {
            el.classList.remove('indicator-select');
        });
    }



    // get last month detail (but currently at previous date)
    {
        let previousMonthDate_NoSlash = getMonthYear();
        let getPreviousMonthData_Results = await getPreviousMonthData(previousMonthDate_NoSlash);

        if(isBlank(getPreviousMonthData_Results) == true)
        {

            console.log("blank getPreviousMonthData_Results");

            await sleep(5000); // Wait for the table to load


            const containers = document.getElementsByClassName("displayInlineBlock el-tooltip__trigger el-tooltip__trigger");

            for (const container of containers) {
                const icon = container.querySelector('i'); // Get the <i> tag inside
                if (icon && icon.className.includes("tool-vertical-line icon-G2_List_241 iconfont"))
                {
                    icon.click(); // to click the vertical table

                    await sleep(2000); // Wait for the table to load

                    ///
                    const rows = document.querySelectorAll('.el-table__body tbody tr');

                    const data_PreviousMonth_Detail = [];

                   for (const row of rows) {
                       const cells = row.querySelectorAll('td .cell');
                       data_PreviousMonth_Detail.push({
                           time: cells[0] ? cells[0].textContent.trim() : null,
                           pv: cells[1] ? cells[1].textContent.trim() : 0,
                           purchased_energy: cells[2] ? cells[2].textContent.trim() : 0,
                           feed_in: cells[3] ? cells[3].textContent.trim() : 0,
                           load: cells[4] ? cells[4].textContent.trim() : 0,
                           netRevenue: cells[1] ? (parseFloat(cells[1].textContent.trim().replace(/,/g, '')) * 0.37) : 0,
                       });
                   }

                    //console.log(data_PreviousMonth_Detail);


                    // post to back-end memory
                    postTGSolarLive(data_PreviousMonth_Detail, "id_target_last_month_detail");

                    //post to db
                    await postDataPreviousMonth(previousMonthDate_NoSlash, data_PreviousMonth_Detail);
                    console.log("posted data previous month");


                    ///

                    break;
                }
            }
        }
        else
        {
            let dataParsedJSON = JSON.parse(getPreviousMonthData_Results).json;
            let lastMonthDataJSON = JSON.parse(dataParsedJSON);
            postTGSolarLive(lastMonthDataJSON, "id_target_last_month_detail");

            console.log("from db (id_target_last_month_detail)");
            console.log(lastMonthDataJSON);
        }
    }


    // get current month detail (but currently at previous date, at table display)
    {
        // go to next month
        let nextMonthDate_NoSlash = getMonthYear(1);
        let getCurrentMonthData_Results = await getDataCurrentMonth(nextMonthDate_NoSlash);

        console.log("getCurrentMonthData_Results: " + getCurrentMonthData_Results);

        if(isBlank(getCurrentMonthData_Results) == true) // blank
        {
            document.getElementsByClassName('iconfont icon-a-G2_Rightarrow_20')[0].click();
            await sleep(3000);

            //////
            const rows = document.querySelectorAll('.el-table__body tbody tr');

            const data_CurrentMonth_Detail = [];

             for (const row of rows) {
                 const cells = row.querySelectorAll('td .cell');
                 data_CurrentMonth_Detail.push({
                     time: cells[0] ? cells[0].textContent.trim() : null,
                     pv: cells[1] ? cells[1].textContent.trim() : 0,
                     purchased_energy: cells[2] ? cells[2].textContent.trim() : 0,
                     feed_in: cells[3] ? cells[3].textContent.trim() : 0,
                     load: cells[4] ? cells[4].textContent.trim() : 0,
                     netRevenue: cells[1] ? (parseFloat(cells[1].textContent.trim().replace(/,/g, '')) * 0.37) : 0,
                 });
             }

            const lastItem = data_CurrentMonth_Detail[data_CurrentMonth_Detail.length - 1];
            //console.log(lastItem.time);

            const dateStrLastDay = lastItem.time;
            const formattedDate = new Date(dateStrLastDay);

            let isToday = itIsToday(formattedDate)

            if(isToday == true)
            {
                data_CurrentMonth_Detail.pop();
            }

            //console.log(data_CurrentMonth_Detail);


            let resultsPostData = await postDataCurrentMonth(nextMonthDate_NoSlash, data_CurrentMonth_Detail);
            console.log("posted data current month 1");
            console.log(resultsPostData);
        }
        else // not blank
        {
            let dataParsedJSON = JSON.parse(getCurrentMonthData_Results).json;
            let currentMonthDataJSON = JSON.parse(dataParsedJSON);
            postTGSolarLive(currentMonthDataJSON, "id_target_current_month_detail");
            console.log("from db (id_target_current_month_detail)");
            console.log(dataParsedJSON);
            console.log("currentMonthDataJSON: " + currentMonthDataJSON);

            if(isBlank(currentMonthDataJSON) == false)
            {
                const lastItemFromDB = currentMonthDataJSON[currentMonthDataJSON.length - 1];

                console.log("lastItemFromDB: " + lastItemFromDB);

                const formattedDateFromDB = new Date(lastItemFromDB.time);
                console.log(formattedDateFromDB);

                let yesterday = todayMinusOne(formattedDateFromDB);
                let sameDay = isSameDay(yesterday, formattedDateFromDB)

                if(sameDay == false) // false means need to fetch latest data
                {
                    console.log("data not match, to get new data from web");
                    document.getElementsByClassName('iconfont icon-a-G2_Rightarrow_20')[0].click();
                    await sleep(3000);

                    //////
                    const rows = document.querySelectorAll('.el-table__body tbody tr');

                    const data_CurrentMonth_Detail = [];

                    for (const row of rows)
                    {
                        const cells = row.querySelectorAll('td .cell');
                        data_CurrentMonth_Detail.push({
                            time: cells[0] ? cells[0].textContent.trim() : null,
                            pv: cells[1] ? cells[1].textContent.trim() : 0,
                            purchased_energy: cells[2] ? cells[2].textContent.trim() : 0,
                            feed_in: cells[3] ? cells[3].textContent.trim() : 0,
                            load: cells[4] ? cells[4].textContent.trim() : 0,
                            netRevenue: cells[1] ? (parseFloat(cells[1].textContent.trim().replace(/,/g, '')) * 0.37) : 0,
                        });
                    }

                    const lastItem = data_CurrentMonth_Detail[data_CurrentMonth_Detail.length - 1];
                    //console.log(lastItem.time);

                    const dateStrLastDay = lastItem.time;
                    const formattedDate = new Date(dateStrLastDay);

                    let isToday = itIsToday(formattedDate)

                    if(isToday == true)
                    {
                        data_CurrentMonth_Detail.pop();
                    }

                    //console.log(data_CurrentMonth_Detail);

                    let resultsPostData = await postDataCurrentMonth(nextMonthDate_NoSlash, data_CurrentMonth_Detail);
                    console.log("posted data current month 2");
                    console.log(resultsPostData);
                }
            }
            else // blank  (first of the month might have blank JSON array)
            {
                document.getElementsByClassName('iconfont icon-a-G2_Rightarrow_20')[0].click();
                await sleep(3000);

                //////
                const rows = document.querySelectorAll('.el-table__body tbody tr');

                const data_CurrentMonth_Detail = [];

                for (const row of rows) {
                    const cells = row.querySelectorAll('td .cell');
                    data_CurrentMonth_Detail.push({
                        time: cells[0] ? cells[0].textContent.trim() : null,
                        pv: cells[1] ? cells[1].textContent.trim() : 0,
                        purchased_energy: cells[2] ? cells[2].textContent.trim() : 0,
                        feed_in: cells[3] ? cells[3].textContent.trim() : 0,
                        load: cells[4] ? cells[4].textContent.trim() : 0,
                        netRevenue: cells[1] ? (parseFloat(cells[1].textContent.trim().replace(/,/g, '')) * 0.37) : 0,
                    });
                }

                const lastItem = data_CurrentMonth_Detail[data_CurrentMonth_Detail.length - 1];
                //console.log(lastItem.time);

                const dateStrLastDay = lastItem.time;
                const formattedDate = new Date(dateStrLastDay);

                let isToday = itIsToday(formattedDate)

                if(isToday == true)
                {
                data_CurrentMonth_Detail.pop();
                }

                //console.log(data_CurrentMonth_Detail);

                let resultsPostData = await postDataCurrentMonth(nextMonthDate_NoSlash, data_CurrentMonth_Detail);
                console.log("posted data current month 3");
                console.log(resultsPostData);
            }

        }





    }


    // to get daily data
    {

        document.getElementsByClassName('iconfont icon-a-G2_Rightarrow_20')[0].click(); //go to the right (latest date)
        await sleep(3000);
        document.getElementsByClassName('iconfont icon-a-G2_Rightarrow_20')[0].click();  //go to the right (latest date)
        await sleep(3000);
        document.getElementsByClassName('el-tabs__item is-top')[0].click();  // click daily tab
        await sleep(3000);


        // if not yet in table mode
        if(document.getElementsByClassName("tool-vertical-line icon-G2_List_241 iconfont").length == 1)
        {
            console.log("not yet in table mode");

            document.getElementsByClassName("tool-vertical-line icon-G2_List_241 iconfont")[0].click();
            await sleep(3000);

            // Select all table rows in the tbody
            const rowsDaily = document.querySelectorAll('.el-table__body tbody tr');

            // Extract the data from each row
            const jsonDataDaily = Array.from(rowsDaily).map(row => {
                const cellsDaily = row.querySelectorAll('td .cell');
                return {
                    time: cellsDaily[0]?.innerText.trim(),
                    pv: parseFloat(cellsDaily[1]?.innerText.trim().replace(/,/g, '')), // Convert to number
                    grid: parseFloat(cellsDaily[2]?.innerText.trim().replace(/,/g, '')),
                    load: parseFloat(cellsDaily[3]?.innerText.trim().replace(/,/g, ''))
                };
            });


            let resultDailyLive = calculateCumulativeRM_Daily(jsonDataDaily);
            await processDailyData(resultDailyLive);

        }
        else // already in table mode
        {
            console.log("already in table mode");
            // Select all table rows in the tbody
            const rowsDaily = document.querySelectorAll('.el-table__body tbody tr');

            // Extract the data from each row
            const jsonDataDaily = Array.from(rowsDaily).map(row => {
            const cellsDaily = row.querySelectorAll('td .cell');
                return {
                    time: cellsDaily[0]?.innerText.trim(),
                    pv: parseFloat(cellsDaily[1]?.innerText.trim().replace(/,/g, '')), // Convert to number
                    grid: parseFloat(cellsDaily[2]?.innerText.trim().replace(/,/g, '')),
                    load: parseFloat(cellsDaily[3]?.innerText.trim().replace(/,/g, ''))
                };
            });

            ////////////////////////////////////////////////////////////////
            let resultDailyLive = calculateCumulativeRM_Daily(jsonDataDaily);
            await processDailyData(resultDailyLive);

        }

    }

    async function processDailyData(resultDailyLive)
    {
        let resultDailyAPI = await getDailyData(getCurrentFullDate(true));
        let resultDailyAPI_Size = JSON.parse(resultDailyAPI).length;

        if(resultDailyAPI_Size == 0)  // new day
        {
            for(const item of resultDailyLive)
            {

                let dateonly = getCurrentFullDate(true);
                let datetime = getCurrentFullDate_ForDB() + " " + item.time;
                let json = item;

                if(json.pv != null)
                {
                    await postDataDaily(dateonly, datetime, json)
                    await sleep(200);
                }


            }

        }
        else // (not a new day, already existed some in db)
        {
            console.log("data from db : " + resultDailyAPI_Size);
            let dataJSON_daily_extracted = JSON.parse(JSON.parse(resultDailyAPI)[0].json);
            let dataJSON_time_DB = dataJSON_daily_extracted.time;
            let lastItem_time = resultDailyLive[resultDailyLive.length - 1].time;

            console.log("last db data: " + dataJSON_time_DB + " | live data: " + lastItem_time);
            console.log("dataJSON_daily_extracted: " + dataJSON_daily_extracted);

            if(dataJSON_time_DB != lastItem_time)  // 10:55 | 11:55
            {
                // not match, so need to post new data into server

                let dateStringTest0 = getCurrentFullDate_ForDB() + " " + dataJSON_time_DB;
                let dateRaw0 = new Date(dateStringTest0);

                for(const item of resultDailyLive)
                {

                    let dateonly = getCurrentFullDate(true);
                    let datetime = getCurrentFullDate_ForDB() + " " + item.time;
                    let json = item;

                    //console.log(json);
                    let dateStringTest1 = getCurrentFullDate_ForDB() + " " + item.time;
                    let dateRaw1 = new Date(dateStringTest1);

                    if(dateRaw1 > dateRaw0)
                    {
                        console.log(dateStringTest0 + " | " + dateStringTest1 + " | " + dateRaw0.getTime() + " | " + dateRaw1.getTime());

                        if(json.pv != null)
                        {
                            await postDataDaily(dateonly, datetime, json)
                            await sleep(200);
                        }
                    }
                }
            }
        }
    }

    ////
    function getCurrentMonthYear()
    {
      let dateFormatted = null;

      const inputs = document.getElementsByClassName("el-input__inner");

      for (let i = 0; i < inputs.length; i++)
      {
          let dateString = inputs[i].value;


          if(dateString != '' && dateString.length > 4)
          {
              let dateCurrent = new Date(dateString.replace(" ", "T"));
              dateFormatted = (dateCurrent.getMonth()+1) + "" + dateCurrent.getFullYear();
              break;
          }

      }
      return dateFormatted;
    }


    function getCurrentFullDate(removeSymbols)
    {
        let dateFormatted = null;

          const inputs = document.getElementsByClassName("el-input__inner");

          for (let i = 0; i < inputs.length; i++)
          {
              let dateString = inputs[i].value;


              if(dateString != '' && dateString.length > 4)
              {
                  let dateCurrent = new Date(dateString.replace(" ", "T"));

                  let monthValue = (dateCurrent.getMonth()+1).toString().padStart(2, '0');

                  if(isBlank(removeSymbols) == true || removeSymbols == true)
                  {
                    dateFormatted = (dateCurrent.getDate() + "" + (monthValue) + "" + dateCurrent.getFullYear());
                  }
                  else
                  {
                    dateFormatted = (dateCurrent.getDate() + "/" + (monthValue) + "/" + dateCurrent.getFullYear());
                  }


                  break;
              }
          }
          return dateFormatted;
    }

    function getCurrentFullDate_ForDB()
    {
        let dateFormatted = null;

          const inputs = document.getElementsByClassName("el-input__inner");

          for (let i = 0; i < inputs.length; i++)
          {
              let dateString = inputs[i].value;


              if(dateString != '' && dateString.length > 4)
              {
                  let dateCurrent = new Date(dateString.replace(" ", "T"));

                  let monthValue = (dateCurrent.getMonth()+1).toString().padStart(2, '0');

                  dateFormatted = (dateCurrent.getFullYear() + "-" + (monthValue) + "-" + dateCurrent.getDate());


                  break;
              }
          }
          return dateFormatted;
    }

    function getMonthYear(monthsToAdd) {
        // Handle blank or undefined monthsToAdd
        if (monthsToAdd == null || monthsToAdd === '' || isNaN(monthsToAdd)) {
            monthsToAdd = 0;
        } else {
            monthsToAdd = parseInt(monthsToAdd, 10);
        }

        let dateFormatted = null;
        const inputs = document.getElementsByClassName("el-input__inner");

        for (let i = 0; i < inputs.length; i++) {
            let dateString = inputs[i].value.trim();

            if (dateString && dateString.length > 4) {
                // Try to parse date
                let dateCurrent = new Date(dateString.replace(" ", "T"));

                if (!isNaN(dateCurrent.getTime())) {
                    let month = dateCurrent.getMonth(); // 0-based
                    let year = dateCurrent.getFullYear();

                    // Add months correctly
                    month = month + monthsToAdd;
                    year = year + Math.floor(month / 12);
                    month = month % 12;
                    if (month < 0) {
                        month += 12;
                        year -= 1;
                    }

                    // Format as "MM/YYYY"
                    const nextMonth = (month + 1).toString().padStart(2, '0');
                    dateFormatted = `${nextMonth}${year}`;
                    break;
                }
            }
        }
        return dateFormatted;
    }

    function formatDate_AddZeros(number)
    {
        let dateStr = number.toString().padStart(8, '0');

        // Extract parts assuming format is DDMMYYYY
        const day = dateStr.slice(0, 2);
        const month = dateStr.slice(2, 4);
        const year = dateStr.slice(4, 8);

        const formattedDate = `${day}${month}${year}`;
        return formattedDate;
    }


