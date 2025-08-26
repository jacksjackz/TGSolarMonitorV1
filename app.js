const express = require('express');
const { Pool, Client } = require("pg");
const fs = require('fs');
const moment = require('moment-timezone');

const app = express();
const http = require('http');
const appServer = http.createServer(app);
const ip = require('ip');

const cors = require('cors');
const corsOptions = {
    origin: '*',
    methods: [],
    allowedHeaders: [],
    exposedHeaders: [],
    credentials: true
};


var ipCurrentIP;

require('dns').lookup(require('os').hostname(), function (err, addr, fam) 
{
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

const port = 40555;  // http 
const displayLog = false;  // false

function log(msg)
{
    if(displayLog == true)
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

if (isBlank(rawData) == false) 
{
    let parts = rawData.split("*");
    
    if (parts.length == 5) 
    {
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

app.options('/getServerTime', cors(corsOptions));
app.get('/getServerTime', cors(corsOptions), async function (req, res) 
{
    log("go here - " + new Date());

	res.send("" + new Date());
});

const mapTGSolarAccount = new Map();


// @@@
app.options('/postTGSolar', cors(corsOptions));
app.post('/postTGSolar', cors(corsOptions), async function (req, res) 
{
    let type = req.body.formData.type;
	let stringdata = req.body.formData.data;
    let myusername = req.body.formData.myusername;

    /////
    let mapTGSolar = mapTGSolarAccount.get(myusername);

    if(mapTGSolar == null) /// new map
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

app.options('/getAllUsername', cors(corsOptions));
app.get('/getAllUsername', cors(corsOptions), async function (req, res) 
{
    const query = 'SELECT MIN(vindex) as min_vindex, username FROM public.datapreviousmonth GROUP BY username order by min_vindex asc';
    const result = await pool.query(query);
    res.send(result.rows);
});


app.options('/getTGSolar', cors(corsOptions));
app.get('/getTGSolar/:type/:myusername', cors(corsOptions), async function (req, res) 
{
    let type = req.params.type;
    let myusername = req.params.myusername;

    let mapTGSolar = mapTGSolarAccount.get(myusername);

    if(mapTGSolar != null) // if existed
    {
        let data = mapTGSolar.get(type);

        if(data != null)
            res.send(data);
        else
            res.send("");
    }
    else
        res.send("");

    
});

app.options('/clear', cors(corsOptions));
app.get('/clear', cors(corsOptions), async function (req, res) 
{
   mapTGSolarAccount.clear();
   res.send("OK");
});


// @@@
// previous month data
app.options('/postDataPreviousMonth', cors(corsOptions));
app.post('/postDataPreviousMonth', cors(corsOptions), async (req, res) => {
  const monthyear = req.body.formData?.monthyear;
  const jsonData = req.body.formData?.jsonData;
  const username = req.body.formData?.username;

    //log(jsonData);

    const insertQuery = 'INSERT INTO datapreviousmonth (monthyear, json, username) VALUES ($1, $2, $3) ON CONFLICT (monthyear, username) DO UPDATE SET json = EXCLUDED.json RETURNING *';
    const result = await pool.query(insertQuery, [monthyear, JSON.stringify(jsonData), username]);   
    res.send(result.rows[0]);
});


app.options('/getDataPreviousMonth', cors(corsOptions));
app.get('/getDataPreviousMonth/:monthyear/:myusername', cors(corsOptions), async function (req, res) 
{
    let monthyear = req.params.monthyear;
    let myusername = req.params.myusername;

    const query = 'SELECT json FROM datapreviousmonth WHERE monthyear = $1 and username = $2';
    const result = await pool.query(query, [monthyear, myusername]);

    res.send(result.rows[0]);
    
});

// @@@
// current month data (post up to yesterday only)
app.options('/postDataCurrentMonth', cors(corsOptions));
app.post('/postDataCurrentMonth', cors(corsOptions), async (req, res) => {
  const monthyear = req.body.formData?.monthyear;
  const jsonData = req.body.formData?.jsonData;
  const username = req.body.formData?.username;


    const insertQuery = 'INSERT INTO datacurrentmonth (monthyear, json, username) VALUES ($1, $2, $3) ON CONFLICT (monthyear, username) DO UPDATE SET json = EXCLUDED.json RETURNING *';
    const result = await pool.query(insertQuery, [monthyear, JSON.stringify(jsonData), username]);   
    res.send(result.rows[0]);
});


app.options('/getDataCurrentMonth', cors(corsOptions));
app.get('/getDataCurrentMonth/:monthyear/:myusername', cors(corsOptions), async function (req, res) 
{
    let monthyear = req.params.monthyear;
    let myusername = req.params.myusername;

    const query = 'SELECT json FROM datacurrentmonth WHERE monthyear = $1 and username = $2';
    const result = await pool.query(query, [monthyear, myusername]);

    res.send(result.rows[0]);
});


// @@@
// daily data
app.options('/postDailyDate', cors(corsOptions));
app.post('/postDailyDate', cors(corsOptions), async (req, res) => {
  const dateonly = req.body.formData?.dateonly;
  const datetime = req.body.formData?.datetime;
  const json = req.body.formData?.json;
  const username = req.body.formData?.username;

    const insertQuery = 'INSERT INTO datadaily (dateonly, datetime, json, username) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING *';
    const result = await pool.query(insertQuery, [dateonly, datetime, JSON.stringify(json), username]);
    res.send(result.rows[0]);
});


app.options('/getDailyDateLatest', cors(corsOptions));
app.get('/getDailyDateLatest/:dateonly/:myusername', cors(corsOptions), async function (req, res) 
{
    let dateonly = req.params.dateonly;
    let myusername = req.params.myusername;

    const query = "SELECT * FROM datadaily WHERE dateonly = $1 and username = $2 order by datetime desc limit 1";
    const result = await pool.query(query, [dateonly, myusername]);

    res.send(result.rows);
});


app.get('/getDailyDateStart/:dateonly/:myusername', cors(corsOptions), async function (req, res) 
{
    let dateonly = req.params.dateonly;
    let myusername = req.params.myusername;

    const query = "SELECT * FROM datadaily WHERE dateonly = $1 and username = $2 order by datetime asc";
    const result = await pool.query(query, [dateonly, myusername]);

    res.send(result.rows);
});

app.options('/getDailyDate', cors(corsOptions));
app.get('/getDailyDate/:from/:to/:myusername', cors(corsOptions), async function (req, res) 
{
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


app.options('/getUsernameInfo', cors(corsOptions));
app.get('/getUsernameInfo', cors(corsOptions), async function (req, res)
{
    const query = "SELECT * FROM accounts";
    const result = await pool.query(query);
    res.send(result.rows);
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

async function runHouseKeeping() 
{
    // SELECT * FROM datadaily WHERE TO_DATE(dateonly, 'DDMMYYYY') <> CURRENT_DATE order by vindex desc
    let table1 = "delete FROM datadaily WHERE TO_DATE(dateonly, 'DDMMYYYY') <> CURRENT_DATE";
    await pool.query(table1);
    
}

///////////
app.get(function (req, res) {
	res.sendFile(app.get('appPath') + '/index.html');
});

//ignore all not found pages
app.use((req, res, next) => {
	res.send("");
});

appServer.listen(port, async function () 
{

    console.log("server started");

});