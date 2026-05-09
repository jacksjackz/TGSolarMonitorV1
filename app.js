const express = require('express');
const { Pool, Client } = require("pg");
const fs = require('fs');
const moment = require('moment-timezone');

const app = express();
const http = require('http');
const appServer = http.createServer(app);
const ip = require('ip');

const cors = require('cors');
// const corsOptions = {
//     origin: '*',
//     methods: [],
//     allowedHeaders: [],
//     exposedHeaders: [],
//     credentials: true
// };



const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
};



var ipCurrentIP;

require('dns').lookup(require('os').hostname(), function (err, addr, fam) {
    console.log('addr: ' + addr + ":" + port);
    console.log('addr2: ' + ip.address() + ":" + port);

    ipCurrentIP = ip.address();

    //log(ipCurrentIP);
});

app.use(cors({
    origin: 'http://' + ipCurrentIP,
    preflightContinue: true,
}),
);

const protectPath = function (regex) {
    return function (req, res, next) {
        if (!regex.test(req.url)) {
            return next();
        }

        res.end('Oops, you are not allowed here.');
    };
};


app.use(protectPath(/^\/protected\/.*$/));
app.use(express.static(__dirname + '/'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Disable browser caching for all API responses
app.use(function (req, res, next) {
    res.set('Cache-Control', 'no-store');
    next();
});

const port = 40555;  // http 
const displayLog = true;  // false

function log(msg) {
    if (displayLog == true)
        console.log(msg)
}

function isBlank(val) {
    if (val != undefined && String(val).trim().length != 0 && val != null && val != 'null')
        return false;
    return true;
}

//
let sqlDataCreden = "protected/sql.txt";
let rawData = fs.readFileSync(sqlDataCreden, { encoding: "utf8" });

let sqlHost;
let sqlDb;
let sqlUser;
let sqlPassword;
let sqlPort;

if (isBlank(rawData) == false) {
    let parts = rawData.split("*");

    if (parts.length == 5) {
        sqlHost = parts[0];
        sqlDb = parts[1];
        sqlUser = parts[2];
        sqlPassword = parts[3];
        sqlPort = parts[4];
    }
}


// postgres credentials
const postgres_credentials = {
    host: sqlHost,
    database: sqlDb,
    user: sqlUser,
    password: sqlPassword,
    port: sqlPort
};

var pool = new Pool(postgres_credentials);

(async () => {
    let table1 = "CREATE TABLE IF NOT EXISTS datapreviousmonth ( vindex BIGSERIAL PRIMARY KEY, monthyear TEXT UNIQUE, json text);";
    await pool.query(table1);

    let table2 = "CREATE TABLE IF NOT EXISTS datacurrentmonth ( vindex BIGSERIAL PRIMARY KEY, monthyear TEXT UNIQUE, json text);";
    await pool.query(table2);

    let table3 = "CREATE TABLE IF NOT EXISTS datadaily ( vindex BIGSERIAL PRIMARY KEY, dateonly TEXT, datetime timestamp without time zone , json text);";
    await pool.query(table3);

    let table3_index = "CREATE INDEX IF NOT EXISTS idx_datadaily_dateonly_datetime ON datadaily(dateonly, datetime);";
    await pool.query(table3_index);

    let table4 = "CREATE TABLE IF NOT EXISTS accounts  ( vindex BIGSERIAL PRIMARY KEY, username TEXT, description text);";
    await pool.query(table4);




})();


//

app.options('/getHistoryMaxPV', cors(corsOptions));
app.options('/getHistoryRatios', cors(corsOptions));
app.options('/getServerTime', cors(corsOptions));
app.options('/postTGSolar', cors(corsOptions));
app.options('/getAllUsername', cors(corsOptions));
app.options('/getTGSolar', cors(corsOptions));
app.options('/clear', cors(corsOptions));
app.options('/postDataPreviousMonth', cors(corsOptions));
app.options('/getDataPreviousMonth', cors(corsOptions));
app.options('/postDataCurrentMonth', cors(corsOptions));
app.options('/getDataCurrentMonth', cors(corsOptions));
app.options('/postDailyDate', cors(corsOptions));
app.options('/getDailyDateLatest', cors(corsOptions));
app.options('/clearTodayData', cors(corsOptions));
app.options('/getDailyDate', cors(corsOptions));
app.options('/getUsernameInfo', cors(corsOptions));


app.get('/getServerTime', cors(corsOptions), async function (req, res) {
    log("go here - " + new Date());

    res.send("" + new Date());
});

const mapTGSolarAccount = new Map();


// @@@

app.post('/postTGSolar', cors(corsOptions), async function (req, res) {
    let type = req.body.formData.type;
    let stringdata = req.body.formData.data;
    let myusername = req.body.formData.myusername;

    /////
    let mapTGSolar = mapTGSolarAccount.get(myusername);

    if (mapTGSolar == null) /// new map
    {
        mapTGSolar = new Map();
        mapTGSolar.set(type, stringdata);
        mapTGSolarAccount.set(myusername, mapTGSolar);
    }
    else // existing account
    {
        mapTGSolar.set(type, stringdata);
        mapTGSolarAccount.set(myusername, mapTGSolar);
    }

    res.send("OK");
});


app.get('/getAllUsername', cors(corsOptions), async function (req, res) {
    const query = 'SELECT MIN(vindex) as min_vindex, username FROM public.datapreviousmonth GROUP BY username order by min_vindex asc';
    const result = await pool.query(query);
    res.send(result.rows);
});



function getHighestRevenueByUsername_previousmonth(username) {
    return new Promise(async (resolve, reject) => {
        const query = 'SELECT json FROM datapreviousmonth WHERE username = $1 order by vindex desc limit 3';
        const result = await pool.query(query, [username]);
        const jsonRows = result.rows;
        let highestRevenue = 0;
        let highestTime = '';

        for (let j = 0; j < jsonRows.length; j++) {
            let dailyEntries = JSON.parse(jsonRows[j].json);
            for (let k = 0; k < dailyEntries.length; k++) {
                let netRevenue = parseFloat(dailyEntries[k].netRevenue) || 0;
                if (netRevenue > highestRevenue) {
                    highestRevenue = netRevenue;
                    highestTime = dailyEntries[k].time || '';


                }
            }
        }

        //  log(highestRevenue + " | " + highestTime);
        resolve({ highest: highestRevenue, time: highestTime });
    });
}



function getLastUpdateTimeByUsername(username) {
    return new Promise(async (resolve, reject) => {
        let dateonly = moment().utc().add(8, 'hours').format("DDMMYYYY");

        const query = 'SELECT * FROM datadaily WHERE dateonly = $1 AND username = $2 order by vindex desc limit 1';
        const result = await pool.query(query, [dateonly, username]);

        // also return in utc + 8
        let datetime = result.rows[0].datetime;
        let datetime_utc8 = moment(datetime).utc().add(8, 'hours').format("YYYY-MM-DD HH:mm:ss");
        resolve({ datetime: datetime, datetime_utc8: datetime_utc8 });
    });
}

function getHighestRevenueDailyByUsernameAndDate(username, dateonly) {
    return new Promise(async (resolve, reject) => {
        const query = 'SELECT json FROM datadaily WHERE dateonly = $1 AND username = $2';
        const result = await pool.query(query, [dateonly, username]);
        let totalSavingsRM = 0;
        for (let i = 0; i < result.rows.length; i++) {
            let entry = JSON.parse(result.rows[i].json);
            totalSavingsRM += parseFloat(entry.savingsRM) || 0;
        }
        resolve({ totalSavingsRM: Math.round(totalSavingsRM * 100) / 100 });
    });
}

function getHighestRevenueByUsername_currentmonth(username) {
    return new Promise(async (resolve, reject) => {
        const now = new Date();
        const monthyear = String(now.getMonth() + 1).padStart(2, '0') + String(now.getFullYear());
        const query = 'SELECT json FROM datacurrentmonth WHERE username = $1 AND monthyear = $2';
        const result = await pool.query(query, [username, monthyear]);
        const jsonRows = result.rows;
        let highestRevenue = 0;
        let highestTime = '';

        //log(jsonRows);

        for (let j = 0; j < jsonRows.length; j++) {
            let dailyEntries = JSON.parse(jsonRows[j].json);
            for (let k = 0; k < dailyEntries.length; k++) {
                let netRevenue = parseFloat(dailyEntries[k].netRevenue) || 0;
                if (netRevenue > highestRevenue) {
                    highestRevenue = netRevenue;
                    highestTime = dailyEntries[k].time || '';


                }
            }
        }

        //  log(highestRevenue + " | " + highestTime);
        resolve({ highest: highestRevenue, time: highestTime });
    });
}


app.get('/getAllUNP/:location', cors(corsOptions), async function (req, res) {
    let location = req.params.location;

    const query = 'SELECT vindex, username, password FROM public.accounts where location = $1';
    const result = await pool.query(query, [location]);
    res.send(result.rows);
});


app.get('/getTGSolar/:type/:myusername', cors(corsOptions), async function (req, res) {
    let type = req.params.type;
    let myusername = req.params.myusername;

    let mapTGSolar = mapTGSolarAccount.get(myusername);

    if (mapTGSolar != null) // if existed
    {
        let data = mapTGSolar.get(type);

        if (data != null)
            res.send(data);
        else
            res.send("");
    }
    else
        res.send("");


});


app.get('/clear', cors(corsOptions), async function (req, res) {
    mapTGSolarAccount.clear();
    res.send("OK");
});


// @@@
// previous month data

app.post('/postDataPreviousMonth', cors(corsOptions), async (req, res) => {
    const monthyear = req.body.formData?.monthyear;
    const jsonData = req.body.formData?.jsonData;
    const username = req.body.formData?.username;

    //log(jsonData);

    const insertQuery = 'INSERT INTO datapreviousmonth (monthyear, json, username) VALUES ($1, $2, $3) ON CONFLICT (monthyear, username) DO UPDATE SET json = EXCLUDED.json RETURNING *';
    const result = await pool.query(insertQuery, [monthyear, JSON.stringify(jsonData), username]);
    res.send(result.rows[0]);
});



app.get('/getDataPreviousMonth/:monthyear/:myusername', cors(corsOptions), async function (req, res) {
    let monthyear = req.params.monthyear;
    let myusername = req.params.myusername;

    const query = 'SELECT json FROM datapreviousmonth WHERE monthyear = $1 and username = $2';
    const result = await pool.query(query, [monthyear, myusername]);

    res.send(result.rows[0]);

});

// @@@
// current month data (post up to yesterday only)

app.post('/postDataCurrentMonth', cors(corsOptions), async (req, res) => {
    const monthyear = req.body.formData?.monthyear;
    const jsonData = req.body.formData?.jsonData;
    const username = req.body.formData?.username;


    const insertQuery = 'INSERT INTO datacurrentmonth (monthyear, json, username) VALUES ($1, $2, $3) ON CONFLICT (monthyear, username) DO UPDATE SET json = EXCLUDED.json RETURNING *';
    const result = await pool.query(insertQuery, [monthyear, JSON.stringify(jsonData), username]);
    res.send(result.rows[0]);
});



app.get('/getDataCurrentMonth/:monthyear/:myusername', cors(corsOptions), async function (req, res) {
    let monthyear = req.params.monthyear;
    let myusername = req.params.myusername;

    const query = 'SELECT json FROM datacurrentmonth WHERE monthyear = $1 and username = $2';
    const result = await pool.query(query, [monthyear, myusername]);

    res.send(result.rows[0]);
});


// @@@
// daily data

app.post('/postDailyDate', cors(corsOptions), async (req, res) => {
    const dateonly = req.body.formData?.dateonly;
    const datetime = req.body.formData?.datetime;
    const json = req.body.formData?.json;
    const username = req.body.formData?.username;

    if (json.pv != null) {
        const insertQuery = 'INSERT INTO datadaily (dateonly, datetime, json, username) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING *';
        const result = await pool.query(insertQuery, [dateonly, datetime, JSON.stringify(json), username]);
        res.send(result.rows[0]);
    }
    else
        res.send("from Server: not posted");
});



app.get('/getDailyDateLatest/:dateonly/:myusername', cors(corsOptions), async function (req, res) {
    let dateonly = req.params.dateonly;
    let myusername = req.params.myusername;

    const query = "SELECT * FROM datadaily WHERE dateonly = $1 and username = $2 order by datetime desc limit 1";
    const result = await pool.query(query, [dateonly, myusername]);

    res.send(result.rows);
});



app.get('/clearTodayData/:email', cors(corsOptions), async function (req, res) {
    let email = req.params.email;

    let query = 'delete FROM public.datadaily where username = $1 and dateonly = TO_CHAR(CURRENT_DATE, \'DDMMYYYY\')';
    await pool.query(query, [email]);
    res.send("OK");

});

app.get('/getHistoryRatios', cors(corsOptions), async function (req, res) {
    const query = 'SELECT MIN(vindex) as min_vindex, username FROM public.datapreviousmonth GROUP BY username order by min_vindex asc';
    const result = await pool.query(query);
    const jsonRows = result.rows;

    let mapData = new Map();

    let arrayData = [];

    for (let i = 0; i < jsonRows.length; i++) {
        let myusername = jsonRows[i].username;

        //log(myusername);

        /////////////////
        let query2 = "SELECT * FROM datapreviousmonth WHERE username = $1 order by vindex desc limit 3";

        //let query2 = "SELECT * FROM datapreviousmonth WHERE username = $1";
        let result2 = await pool.query(query2, [myusername]);
        let jsonRows2 = result2.rows;

        for (let j = 0; j < jsonRows2.length; j++) {
            let eachJSONData = JSON.parse(jsonRows2[j].json);

            eachJSONData.forEach(function (obj) {
                let netRevenue = obj.netRevenue;
                let time = obj.time;

                let netRevenueSaved = mapData.get(time);

                if (netRevenueSaved == undefined) {
                    if (netRevenue != 0) {
                        mapData.set(time, netRevenue);
                    }
                }
                else {
                    if (netRevenue != 0) {
                        // 1st acc must be higher revenue than the 2nd account due to higher kilowatt 

                        if (netRevenueSaved > netRevenue) {
                            let ratioEach = netRevenueSaved / netRevenue;

                            // max for min is > 1
                            // max for max is <= 2.5
                            if (ratioEach >= 1 && ratioEach < 2.5) {
                                arrayData.push(ratioEach);
                            }


                            // if (ratioEach >= 1.9 && ratioEach < 2.5)
                            //   log(netRevenueSaved + " / " + netRevenue + " | " + ratioEach + " | " + time);
                        }
                    }

                }
            });
        }
    }


    //
    const min = Math.min(...arrayData);
    const max = Math.max(...arrayData);

    //log(min); 
    //log(max);

    //

    let obj = new Object();
    obj.min = min;
    obj.max = max;

    res.send(obj);
});


app.get('/getHistoryMaxPV', cors(corsOptions), async function (req, res) {
    const query = 'SELECT MIN(vindex) as min_vindex, username FROM public.datapreviousmonth GROUP BY username order by min_vindex asc';
    const result = await pool.query(query);
    const jsonRows = result.rows;


    let arrayDataMain = [];


    for (let i = 0; i < jsonRows.length; i++) {
        let arrayData = [];

        let myusername = jsonRows[i].username;

        /////////////////
        let query2 = "SELECT * FROM datapreviousmonth WHERE username = $1 order by vindex desc limit 3";

        //let query2 = "SELECT * FROM datapreviousmonth WHERE username = $1";
        let result2 = await pool.query(query2, [myusername]);
        let jsonRows2 = result2.rows;

        for (let j = 0; j < jsonRows2.length; j++) {
            let eachJSONData = JSON.parse(jsonRows2[j].json);

            eachJSONData.forEach(function (obj) {
                let pv = obj.pv;
                arrayData.push(pv);
            });
        }

        const max = Math.max(...arrayData);

        let obj = new Object();
        obj.username = myusername;
        obj.max = max;

        arrayDataMain.push(obj);

    }

    res.send(JSON.stringify(arrayDataMain));
});



app.get('/getDailyDateStart/:dateonly/:myusername', cors(corsOptions), async function (req, res) {
    let dateonly = req.params.dateonly;
    let myusername = req.params.myusername;

    const query = "SELECT * FROM datadaily WHERE dateonly = $1 and username = $2 order by datetime asc";
    const result = await pool.query(query, [dateonly, myusername]);

    res.send(result.rows);
});


app.get('/getDailyDate/:from/:to/:myusername', cors(corsOptions), async function (req, res) {
    let from = req.params.from;
    let to = req.params.to;
    let myusername = req.params.myusername;

    const query = "SELECT * FROM datadaily WHERE datetime BETWEEN $1 AND $2 AND username = $3 ORDER BY datetime asc;";
    const result = await pool.query(query, [from, to, myusername]);

    res.send(result.rows);
});


app.post('/postUsernameInfo', async (req, res) => {
    const username = req.body.formData?.username;
    const description = req.body.formData?.description;

    if (!username) {
        return res.status(400).json({ error: "username is required" });
    }

    try {
        const upsertQuery = `
      INSERT INTO accounts (username, description)
      VALUES ($1, $2)
      ON CONFLICT (username)
      DO UPDATE SET description = EXCLUDED.description
      RETURNING *;
    `;
        const result = await pool.query(upsertQuery, [username, description]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Database Error", detail: err.message });
    }
});



app.get('/getUsernameInfo', cors(corsOptions), async function (req, res) {
    const query = "SELECT * FROM accounts";
    const result = await pool.query(query);
    res.send(result.rows);
});

app.get('/getLastUpdateTime/:myusername', cors(corsOptions), async function (req, res) {
    let myusername = req.params.myusername;
    let result = await getLastUpdateTimeByUsername(myusername);
    res.send(result);
});

////////////
var midnight = "0:00:00";
// var midnight = "13:51:25";
var now = null;
//clear temp data every midnight
setInterval(async function () {
    now = moment().utc().add(8, 'hours').format("H:mm:ss");

    if (now === midnight) {
        await runHouseKeeping();
    }
}, 1000);

async function runHouseKeeping() {
    // SELECT * FROM datadaily WHERE TO_DATE(dateonly, 'DDMMYYYY') <> CURRENT_DATE order by vindex desc
    let table1 = "delete FROM datadaily WHERE TO_DATE(dateonly, 'DDMMYYYY') <> CURRENT_DATE";
    await pool.query(table1);

}

app.get('/index', function (req, res) {
    var path = __dirname + "/index.html";
    res.sendFile(path);
});

app.get('/index2', function (req, res) {
    var path = __dirname + "/index2.html";
    res.sendFile(path);
});

app.get('/index3', function (req, res) {
    var path = __dirname + "/index3.html";
    res.sendFile(path);
});

///////////
app.get(function (req, res) {
    res.sendFile(app.get('appPath') + '/index.html');
});

// get highest revenue from all months data
app.get('/getHighestRevenue', cors(corsOptions), async function (req, res) {
    const [previousMonth1, previousMonth2, currentMonth1, currentMonth2] = await Promise.all([
        getHighestRevenueByUsername_previousmonth("tgrsolar@teckguan.com"),
        getHighestRevenueByUsername_previousmonth("tgrsolar1@teckguan.com"),
        getHighestRevenueByUsername_currentmonth("tgrsolar@teckguan.com"),
        getHighestRevenueByUsername_currentmonth("tgrsolar1@teckguan.com")
    ]);

    let previousMonthTotal = previousMonth1.highest + previousMonth2.highest;
    let currentMonthTotal = currentMonth1.highest + currentMonth2.highest;

    // round half up, then round to nearest integer
    // 366.855 -> 367
    let highest = parseFloat(Math.max(previousMonthTotal, currentMonthTotal));
    highest = Math.round(highest).toFixed(0);

    let time = previousMonthTotal >= currentMonthTotal ? previousMonth1.time : currentMonth1.time;
    if (time) {
        const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
        const [dd, mmm, yyyy] = time.split('/');
        time = `${dd}/${months[mmm] || mmm}/${yyyy}`;
    }

    ///
    //let daily1 = await getHighestRevenueDailyByUsernameAndDate('tgrsolar@teckguan.com', '09042026');
    //let daily2 = await getHighestRevenueDailyByUsernameAndDate('tgrsolar1@teckguan.com', '09042026');
    //let dailyTotal = daily1.totalSavingsRM + daily2.totalSavingsRM;

    //log(daily1.totalSavingsRM + " | " + daily2.totalSavingsRM + " | " + dailyTotal);

    // res.send({ previousMonthTotal, currentMonthTotal, highest });
    res.send({ highest, time });
});

//ignore all not found pages
app.use((req, res, next) => {
    res.send("");
});

appServer.listen(port, async function () {

    console.log("server started");


    //let test = await getLastUpdateTimeByUsername("tgrsolar@teckguan.com");
    //log(test);


});