const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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

function postTGSolarLive(dataInput, typeInput) {
    let ip = "https://tgapps.synology.me:40556/postTGSolar";

    const formData = {
        data: dataInput,
        type: typeInput
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



// get last month data
document.getElementsByClassName('el-tabs__item is-top')[2].click();
await sleep(3000);
document.getElementsByClassName('iconfont icon-a-G2_Leftarrow_20')[0].click();
await sleep(3000);
var target_last_month = document.getElementsByClassName('el-row indicator-list')[0];
target_last_month.id = "id_target_last_month";
var clone_target_last_month = target_last_month.cloneNode(true);


{


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



            ///

            break;
        }
    }

}
