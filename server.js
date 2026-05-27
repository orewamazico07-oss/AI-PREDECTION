const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const API = "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

// ---------- GLOBAL MEMORY ----------
let predictionHistory = [];      // last predictions made
let actualResultHistory = [];    // last actual results
let reverseMode = false;

// ---------- CORE PREDICTION (TREND BASED) ----------
function getBasePrediction(results) {
    if (!results || results.length < 3) return "WAIT";
    
    const recent10 = results.slice(0, 10).map(i => parseInt(i.number) >= 5 ? "BIG" : "SMALL");
    const last5 = recent10.slice(0, 5);
    let bigCount = last5.filter(r => r === "BIG").length;
    let smallCount = last5.filter(r => r === "SMALL").length;
    
    let pred = (bigCount >= 3) ? "BIG" : (smallCount >= 3) ? "SMALL" : "WAIT";
    
    // streak of 3
    if (recent10[0] === recent10[1] && recent10[1] === recent10[2]) {
        pred = (recent10[0] === "BIG") ? "SMALL" : "BIG";
    }
    
    // zigzag
    if (recent10[0] !== recent10[1] && recent10[1] !== recent10[2] && recent10[2] !== recent10[3]) {
        pred = recent10[0];
    }
    
    return pred;
}

// ---------- UPDATE REVERSE MODE BASED ON LAST 5 WINS/LOSSES ----------
function updateReverseMode() {
    if (predictionHistory.length < 5 || actualResultHistory.length < 5) return;
    
    const last5Pred = predictionHistory.slice(-5);
    const last5Actual = actualResultHistory.slice(-5);
    let lossCount = 0;
    
    for (let i = 0; i < 5; i++) {
        if (last5Pred[i] !== last5Actual[i]) lossCount++;
    }
    
    reverseMode = (lossCount >= 3);
}

// ---------- FINAL PREDICTION (WITH REVERSE MODE) ----------
function generateFinalPrediction(results) {
    let base = getBasePrediction(results);
    if (base === "WAIT") return "WAIT";
    if (reverseMode) {
        return (base === "BIG") ? "SMALL" : "BIG";
    }
    return base;
}

// ---------- API: GET PREDICTION FOR NEXT PERIOD ----------
app.get('/api/prediction', async (req, res) => {
    try {
        const response = await fetch(API);
        const data = await response.json();
        const list = data.data.list;
        
        if (!list || list.length === 0) {
            return res.json({ prediction: "WAIT", error: "No data" });
        }
        
        // actual result of most recent period
        const actualResult = (parseInt(list[0].number) >= 5) ? "BIG" : "SMALL";
        
        // generate prediction for next period
        let newPred = generateFinalPrediction(list);
        
        // store prediction in history
        predictionHistory.push(newPred);
        if (predictionHistory.length > 50) predictionHistory.shift();
        
        // store actual result for the previous period (matching with prediction)
        if (predictionHistory.length > 0 && actualResultHistory.length + 1 <= predictionHistory.length) {
            actualResultHistory.push(actualResult);
            if (actualResultHistory.length > 50) actualResultHistory.shift();
        }
        
        // update reverse mode based on last 5 performance
        updateReverseMode();
        
        // recalc prediction with updated reverse mode (if changed)
        let finalPred = generateFinalPrediction(list);
        if (predictionHistory.length > 0) {
            predictionHistory[predictionHistory.length - 1] = finalPred;
        }
        
        // prepare history data for response
        const historyData = list.slice(0, 10).map(i => ({
            period: i.issueNumber,
            number: i.number,
            bigSmall: (parseInt(i.number) >= 5) ? "BIG" : "SMALL"
        }));
        
        res.json({
            prediction: finalPred,
            reverseMode: reverseMode,
            nextPeriod: String(BigInt(list[0].issueNumber) + 1n),
            lastResults: historyData
        });
        
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ prediction: "WAIT", error: error.message });
    }
});

// ---------- HEALTH CHECK ----------
app.get('/', (req, res) => {
    res.send('Prediction Bot Running...');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
