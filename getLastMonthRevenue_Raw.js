const containers = document.getElementsByClassName("displayInlineBlock el-tooltip__trigger el-tooltip__trigger");

    for (const container of containers) {
        const icon = container.querySelector('i'); // Get the <i> tag inside
        if (icon && icon.className.includes("tool-vertical-line icon-G2_List_241 iconfont")) {
            icon.click();

            await sleep(2000); // Wait for the table to load

            ///
            const rows = document.querySelectorAll('.el-table__body tbody tr');

            const data = [];

            for (const row of rows) {
                const cells = row.querySelectorAll('td .cell');
                data.push({
                    time: cells[0].textContent.trim(),
                    pv: cells[1].textContent.trim(),
                    purchased_energy: cells[2].textContent.trim(),
                    feed_in: cells[3].textContent.trim(),
                    load: cells[4].textContent.trim(),
                    netRevenue: parseFloat(cells[1].textContent.trim()) * 0.37
                });
            }

            console.log(data);


            postTGSolarLive(data, "id_target_last_month_detail");


            ///

            break;
        }
    }