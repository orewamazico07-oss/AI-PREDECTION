const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const API =
  "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

let predictionHistory = [];
let actualResultHistory = [];
let reverseMode = false;
let latestData = null;

// BASE PREDICTION
function getBasePrediction(results) {
  if (!results || results.length < 3) return "WAIT";

  let recent10 = results
    .slice(0, 10)
    .map((i) => (parseInt(i.number) >= 5 ? "BIG" : "SMALL"));

  let last5 = recent10.slice(0, 5);

  let bigCount = last5.filter((r) => r === "BIG").length;
  let smallCount = last5.filter((r) => r === "SMALL").length;

  let pred =
    bigCount >= 3
      ? "BIG"
      : smallCount >= 3
      ? "SMALL"
      : "WAIT";

  // streak system
  if (
    recent10[0] === recent10[1] &&
    recent10[1] === recent10[2]
  ) {
    pred = recent10[0] === "BIG" ? "SMALL" : "BIG";
  }

  // zigzag system
  if (
    recent10[0] !== recent10[1] &&
    recent10[1] !== recent10[2] &&
    recent10[2] !== recent10[3]
  ) {
    pred = recent10[0];
  }

  return pred;
}

// REVERSE MODE
function updateReverseMode() {
  if (
    predictionHistory.length < 5 ||
    actualResultHistory.length < 5
  )
    return;

  let last5Pred = predictionHistory.slice(-5);
  let last5Actual = actualResultHistory.slice(-5);

  let lossCount = 0;

  for (let i = 0; i < 5; i++) {
    if (last5Pred[i] !== last5Actual[i]) {
      lossCount++;
    }
  }

  reverseMode = lossCount >= 3;
}

// FINAL PREDICTION
function generatePrediction(history) {
  let base = getBasePrediction(history);

  if (base === "WAIT") return "WAIT";

  if (reverseMode) {
    return base === "BIG" ? "SMALL" : "BIG";
  }

  return base;
}

// UPDATE SYSTEM
async function updateGameData() {
  try {
    const res = await fetch(API);
    const data = await res.json();

    const list = data.data.list;

    const lastIssue = String(list[0].issueNumber);
    const nextPeriod = String(BigInt(lastIssue) + 1n);

    let prediction = generatePrediction(list);

    predictionHistory.push(prediction);

    if (predictionHistory.length > 50) {
      predictionHistory.shift();
    }

    const actualResult =
      parseInt(list[0].number) >= 5 ? "BIG" : "SMALL";

    if (
      actualResultHistory.length + 1 <= predictionHistory.length
    ) {
      actualResultHistory.push(actualResult);

      if (actualResultHistory.length > 50) {
        actualResultHistory.shift();
      }
    }

    updateReverseMode();

    prediction = generatePrediction(list);

    predictionHistory[predictionHistory.length - 1] =
      prediction;

    latestData = {
      success: true,
      period: nextPeriod,
      prediction,
      reverseMode,
      history: list.slice(0, 10).map((i) => ({
        issueNumber: i.issueNumber,
        number: i.number,
        result:
          parseInt(i.number) >= 5 ? "BIG" : "SMALL",
      })),
      bots: {
        rex:
          prediction === "WAIT"
            ? "WAIT"
            : prediction,
        xr:
          prediction === "WAIT"
            ? "WAIT"
            : prediction === "BIG"
            ? "SMALL"
            : "BIG",
      },
    };

    console.log("UPDATED:", prediction, nextPeriod);
  } catch (err) {
    console.log(err);
  }
}

// AUTO UPDATE EVERY 30 SEC
setInterval(() => {
  const sec = new Date().getSeconds();

  if (sec === 0 || sec === 30) {
    updateGameData();
  }
}, 1000);

updateGameData();

// API ROUTE
app.get("/api/predict", async (req, res) => {
  try {
    if (!latestData) {
      await updateGameData();
    }

    res.json(latestData);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ROOT
app.get("/", (req, res) => {
  res.send("P4!N X SERVER RUNNING");
});

// START
app.listen(PORT, () => {
  console.log(`SERVER RUNNING ON ${PORT}`);
});
