const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const API = "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

// ---------- GLOBAL MEMORY ----------
let predictionHistory = [];
let actualResultHistory = [];
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

// ---------- FETCH WITH HEADERS (SOLUTION) ----------
async function fetchWithHeaders() {
    const response = await fetch(API, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.google.com/',
            'Origin': 'https://draw.ar-lottery01.com'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
}

// ---------- API: GET PREDICTION FOR NEXT PERIOD ----------
app.get('/api/prediction', async (req, res) => {
    try {
        const data = await fetchWithHeaders();
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
        
        // store actual result
        actualResultHistory.push(actualResult);
        if (actualResultHistory.length > 50) actualResultHistory.shift();
        
        // update reverse mode based on last 5 performance
        updateReverseMode();
        
        // recalc prediction with updated reverse mode
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
        console.error("Error:", error.message);
        res.status(500).json({ 
            prediction: "WAIT", 
            error: error.message,
            suggestion: "Check API or network"
        });
    }
});

// ---------- HEALTH CHECK ----------
app.get('/', (req, res) => {
    res.send('Prediction Bot Running... (Fixed with headers)');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
