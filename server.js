const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");

const app = express();

app.use(cors());

const PORT = process.env.PORT || 3000;

const API =
"https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

/* DATABASE */

if(!fs.existsSync("./database.json")){

fs.writeFileSync(
"./database.json",

JSON.stringify({

livePrediction:"WAIT",
livePeriod:null,
history:[],
stats:{
totalSignals:0,
totalWin:0,
totalLoss:0,
accuracy:0
}

},null,2)

);

}

/* READ */

function readDB(){

return JSON.parse(
fs.readFileSync("./database.json","utf8")
);

}

/* SAVE */

function saveDB(data){

fs.writeFileSync(
"./database.json",
JSON.stringify(data,null,2)
);

}

/* PREDICT */

function predict(history){

const arr = history
.slice(0,4)
.reverse()
.map(i=>
parseInt(i.number)>=5
? "B"
: "S"
);

const pattern = arr.join("");

const map = {

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

return {

pattern,
prediction:
map[pattern] || "WAIT"

};

}

let oldPrediction = null;

/* BOT */

async function runBot(){

try{

const res = await axios.get(API);

const list =
res.data.data.list;

const latest =
list[0];

const db = readDB();

const currentResult =
parseInt(latest.number)>=5
? "BIG"
: "SMALL";

/* WIN LOSS */

if(oldPrediction){

db.stats.totalSignals++;

if(oldPrediction === currentResult){

db.stats.totalWin++;

}else{

db.stats.totalLoss++;

}

db.stats.accuracy = (

(db.stats.totalWin /
db.stats.totalSignals)

* 100

).toFixed(2);

}

/* NEXT */

const next =
predict(list);

oldPrediction =
next.prediction;

db.livePrediction =
next.prediction;

db.livePeriod =
String(
Number(latest.issueNumber)+1
);

/* SAVE */

db.history.unshift({

period:latest.issueNumber,
result:currentResult,
prediction:oldPrediction,
pattern:next.pattern,
time:new Date().toLocaleString()

});

if(db.history.length > 100){

db.history.pop();

}

saveDB(db);

console.log(
"NEXT =>",
db.livePrediction
);

}catch(err){

console.log(err.message);

}

}

/* AUTO */

setInterval(
runBot,
30000
);

runBot();

/* API */

app.get("/api/live",(req,res)=>{

res.json(readDB());

});

/* START */

app.listen(PORT,()=>{

console.log(
"SERVER RUNNING"
);

});
