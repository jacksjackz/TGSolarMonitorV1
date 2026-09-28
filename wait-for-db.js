// Blocks until Postgres accepts TCP connections, then exits 0 so the
// container command can hand off to app.js.
// Host/port come from DB_HOST/DB_PORT env vars if set, otherwise from
// protected/sql.txt (same file app.js uses: host*db*user*password*port).
const fs = require("fs");
const net = require("net");

let host = process.env.DB_HOST;
let port = process.env.DB_PORT;

if (!host || !port) {
    try {
        let parts = fs.readFileSync("protected/sql.txt", { encoding: "utf8" }).split("*");
        if (parts.length == 5) {
            host = host || parts[0].trim();
            port = port || parts[4].trim();
        }
    } catch (err) {
        console.log("wait-for-db: cannot read protected/sql.txt - " + err.message);
    }
}

if (!host || !port) {
    console.log("wait-for-db: no DB host/port found, skipping wait");
    process.exit(0);
}

const RETRY_MS = 2000;

function tryConnect() {
    const socket = net.connect({ host: host, port: Number(port) });
    socket.setTimeout(3000);

    socket.once("connect", function () {
        socket.destroy();
        console.log("wait-for-db: Postgres is up at " + host + ":" + port + " - starting app");
        process.exit(0);
    });

    const retry = function (reason) {
        socket.destroy();
        console.log("wait-for-db: Postgres not ready (" + reason + ") - retrying in " + RETRY_MS / 1000 + "s");
        setTimeout(tryConnect, RETRY_MS);
    };

    socket.once("timeout", function () { retry("timeout"); });
    socket.once("error", function (err) { retry(err.code || err.message); });
}

console.log("wait-for-db: waiting for Postgres at " + host + ":" + port + " ...");
tryConnect();
