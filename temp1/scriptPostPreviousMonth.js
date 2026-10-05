// Post previous month data only.
// Run in the browser console on the solar portal (same page as scriptInit.js).
// Always scrapes and posts (upsert), even if the month already exists in the DB.

// const myusername = "tgrsolar1@teckguan.com";

(async () => {

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    const ratePerKWh = 0.4460;

    // month to post, as "MMYYYY" (e.g. "082026"); leave blank for previous month
    const targetMonth = "072026";

    if (typeof myusername === 'undefined' || !myusername) {
        console.log("myusername is not defined, stopped");
        return;
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
                    month = ((month % 12) + 12) % 12;

                    // Format as "MMYYYY"
                    const nextMonth = (month + 1).toString().padStart(2, '0');
                    dateFormatted = `${nextMonth}${year}`;
                    break;
                }
            }
        }
        return dateFormatted;
    }

    function isBlankMonth(val) {
        return val == null || String(val).trim().length == 0;
    }

    async function postJSON(ip, body) {
        const response = await fetch(ip,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

        if (!response.ok)
            throw new Error(ip + " returned HTTP " + response.status);

        return response.text();
    }

    async function postDataPreviousMonth(monthyear, jsonData) {
        return postJSON("https://tgapps.synology.me:40556/postDataPreviousMonth", {
            formData: {
                monthyear: monthyear,
                jsonData: jsonData,
                username: myusername
            }
        });
    }

    async function postTGSolarLive(dataInput, typeInput) {
        return postJSON("https://tgapps.synology.me:40556/postTGSolar", {
            formData: {
                data: dataInput,
                type: typeInput,
                myusername: myusername
            }
        });
    }


    // go to month tab, then previous month
    document.getElementsByClassName('el-tabs__item is-top')[2].click();
    await sleep(3000);
    document.getElementsByClassName('iconfont icon-a-G2_Leftarrow_20')[0].click();
    await sleep(3000);

    let previousMonthDate_NoSlash = getMonthYear();
    if (isBlankMonth(previousMonthDate_NoSlash)) {
        console.log("could not read month from date input, stopped");
        return;
    }
    const actualPreviousMonth = previousMonthDate_NoSlash;
    console.log("previous month: " + actualPreviousMonth);

    // go to targetMonth, if set
    if (!isBlankMonth(targetMonth) && targetMonth != previousMonthDate_NoSlash) {
        if (!/^(0[1-9]|1[0-2])\d{4}$/.test(targetMonth)) {
            console.log("targetMonth must be MMYYYY (e.g. 082026), stopped");
            return;
        }

        // "MMYYYY" -> YYYYMM number, so months can be compared
        const toSortable = monthyear => Number(monthyear.slice(2) + monthyear.slice(0, 2));

        if (toSortable(targetMonth) > toSortable(actualPreviousMonth)) {
            console.log("targetMonth " + targetMonth + " is not a completed month, stopped");
            return;
        }

        for (let step = 0; step < 36 && previousMonthDate_NoSlash != targetMonth; step++) {
            document.getElementsByClassName('iconfont icon-a-G2_Leftarrow_20')[0].click();
            await sleep(3000);
            previousMonthDate_NoSlash = getMonthYear();
            console.log("at month: " + previousMonthDate_NoSlash);
        }

        if (previousMonthDate_NoSlash != targetMonth) {
            console.log("could not reach targetMonth " + targetMonth + ", stopped");
            return;
        }
    }

    // switch to table mode (icon is only there when not yet in table mode)
    const listIcon = document.getElementsByClassName("tool-vertical-line icon-G2_List_241 iconfont")[0];
    if (listIcon) {
        console.log("not yet in table mode");
        listIcon.click();
        await sleep(3000);
    }
    else {
        console.log("already in table mode");
    }

    const rows = document.querySelectorAll('.el-table__body tbody tr');
    if (rows.length == 0) {
        console.log("no table rows found, stopped");
        return;
    }

    const data_PreviousMonth_Detail = [];

    for (const row of rows) {
        const cells = row.querySelectorAll('td .cell');
        data_PreviousMonth_Detail.push({
            time: cells[0] ? cells[0].textContent.trim() : null,
            pv: cells[1] ? cells[1].textContent.trim() : 0,
            purchased_energy: cells[2] ? cells[2].textContent.trim() : 0,
            feed_in: cells[3] ? cells[3].textContent.trim() : 0,
            load: cells[4] ? cells[4].textContent.trim() : 0,
            netRevenue: cells[1] ? (parseFloat(cells[1].textContent.trim().replace(/,/g, '')) * ratePerKWh) : 0,
        });
    }

    console.log(data_PreviousMonth_Detail);

    try {
        // post to back-end memory (dashboards treat this as last month, so skip for older months)
        if (previousMonthDate_NoSlash == actualPreviousMonth) {
            await postTGSolarLive(data_PreviousMonth_Detail, "id_target_last_month_detail");
        }

        // post to db
        await postDataPreviousMonth(previousMonthDate_NoSlash, data_PreviousMonth_Detail);
        console.log("posted data previous month (" + previousMonthDate_NoSlash + ", " + data_PreviousMonth_Detail.length + " rows)");
    }
    catch (error) {
        console.log("post failed");
        console.log(error);
    }

})();
