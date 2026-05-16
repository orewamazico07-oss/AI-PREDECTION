
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
CONFIG
========================= */

const API =
"https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

const FETCH_INTERVAL = 30000;

/* =========================
PATTERNS
========================= */

const PATTERNS = {

"BBBB":"BIG",
"BBBS":"BIG",
"BBSB":"BIG",
"BBSS":"BIG",

"BSBB":"SMALL",
"BSBS":"BIG",
"BSSB":"SMALL",
"BSSS":"BIG",

"SBBB":"SMALL",
"SBBS":"SMALL",
"SBSB":"SMALL",
"SBSS":"BIG",

"SSBB":"BIG",
"SSBS":"BIG",
"SSSB":"SMALL",
"SSSS":"SMALL"

};

/* =========================
DATABASE
========================= */

const DB = "database.json";

if(!fs.existsSync(DB)){

fs.writeFileSync(DB,JSON.stringify({

stats:{
totalSignals:0,
totalWin:0,
totalLoss:0,
accuracy:0,

currentWinStreak:0,
currentLossStreak:0,

maxWinStreak:0,
maxLossStreak:0,

marketMode:"UNKNOWN",
marketStrength:"NORMAL"
},

history:[],

patterns:{},

livePrediction:"WAIT",
livePeriod:null

},null,2));

}

/* =========================
HELPER
========================= */

function readDB(){

return JSON.parse(
fs.readFileSync(DB,"utf8")
);

}

function saveDB(data){

fs.writeFileSync(
DB,
JSON.stringify(data,null,2)
);

}

function getType(number){

return parseInt(number) >= 5
? "B"
: "S";

}

/* =========================
MARKET DETECT
========================= */

function detectMarket(history){

const arr = history
.slice(0,10)
.map(i=>getType(i.number));

const str = arr.join("");

if(
str.includes("BBBBBB") ||
str.includes("SSSSSS")
){

return {

mode:"TREND",
strength:"STRONG"

};

}

let chop = 0;

for(let i=1;i<arr.length;i++){

if(arr[i] !== arr[i-1]){

chop++;

}

}

if(chop >= 7){

return {

mode:"CHOPPY",
strength:"DANGEROUS"

};

}

return {

mode:"NORMAL",
strength:"MEDIUM"

};

}

/* =========================
PREDICT
========================= */

function generatePrediction(history){

const pattern = history
.slice(0,4)
.reverse()
.map(i=>getType(i.number))
.join("");

const prediction =
PATTERNS[pattern] || "WAIT";

return {

pattern,
prediction

};

}

/* =========================
LIVE VARIABLES
========================= */

let previousPrediction = null;
let previousPeriod = null;

/* =========================
MAIN BOT
========================= */

async function runBot(){

try{

const res = await axios.get(API);

const history =
res.data.data.list;

const latest =
history[0];

const result =
parseInt(latest.number) >= 5
? "BIG"
: "SMALL";

const db = readDB();

/* =========================
CHECK WIN LOSS
========================= */

if(previousPrediction){

const status =
previousPrediction === result
? "WIN"
: "LOSS";

db.stats.totalSignals++;

if(status === "WIN"){

db.stats.totalWin++;

db.stats.currentWinStreak++;

db.stats.currentLossStreak = 0;

if(
db.stats.currentWinStreak >
db.stats.maxWinStreak
){

db.stats.maxWinStreak =
db.stats.currentWinStreak;

}

}else{

db.stats.totalLoss++;

db.stats.currentLossStreak++;

db.stats.currentWinStreak = 0;

if(
db.stats.currentLossStreak >
db.stats.maxLossStreak
){

db.stats.maxLossStreak =
db.stats.currentLossStreak;

}

}

/* ACCURACY */

db.stats.accuracy = (

(db.stats.totalWin /
db.stats.totalSignals)

* 100

).toFixed(2);

/* MARKET */

const market =
detectMarket(history);

db.stats.marketMode =
market.mode;

db.stats.marketStrength =
market.strength;

/* PATTERN */

const currentPattern = history
.slice(0,4)
.reverse()
.map(i=>getType(i.number))
.join("");

if(!db.patterns[currentPattern]){

db.patterns[currentPattern] = {

total:0,
win:0,
loss:0,
accuracy:0

};

}

db.patterns[currentPattern].total++;

if(status === "WIN"){

db.patterns[currentPattern].win++;

}else{

db.patterns[currentPattern].loss++;

}

db.patterns[currentPattern].accuracy = (

(db.patterns[currentPattern].win /

db.patterns[currentPattern].total)

* 100

).toFixed(2);

/* SAVE HISTORY */

db.history.unshift({

period:latest.issueNumber,

prediction:previousPrediction,

result,

status,

pattern:currentPattern,

time:new Date().toLocaleString()

});

/* LAST 100 */

if(db.history.length > 100){

db.history.pop();

}

}

/* =========================
NEXT PREDICTION
========================= */

const next =
generatePrediction(history);

previousPrediction =
next.prediction;

previousPeriod =
String(
BigInt(latest.issueNumber) + 1n
);

db.livePrediction =
previousPrediction;

db.livePeriod =
previousPeriod;

saveDB(db);

console.log(
`NEXT ${previousPeriod} => ${previousPrediction}`
);

}catch(err){

console.log(err.message);

}

}

/* =========================
AUTO RUN
========================= */

setInterval(
runBot,
FETCH_INTERVAL
);

runBot();

/* =========================
API
========================= */

app.get("/api/live",(req,res)=>{

const db = readDB();

res.json(db);

});

/* =========================
START SERVER
========================= */

app.listen(3000,()=>{

console.log(
"SERVER RUNNING ON 3000"
);

});
```
