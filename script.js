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