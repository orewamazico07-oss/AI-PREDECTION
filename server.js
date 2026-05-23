// server.js

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());

const PORT = process.env.PORT || 3000;

const API_URL =
"https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

let lastPrediction = null;
let reverseMode = false;

const FETCHERS = [

(url) => url,

(url) =>
`https://corsproxy.io/?${encodeURIComponent(url)}`,

(url) =>
`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,

(url) =>
`https://cors.isomorphic-git.org/${url}`,

(url) =>
`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`

];

async function smartFetch(){

    for(const buildUrl of FETCHERS){

        try{

            const controller =
            new AbortController();

            const timeout =
            setTimeout(()=>{

                controller.abort();

            },8000);

            const response = await fetch(

                buildUrl(API_URL),

                {
                    signal:controller.signal,
                    headers:{
                        "User-Agent":"Mozilla/5.0"
                    }
                }

            );

            clearTimeout(timeout);

            if(!response.ok){

                continue;

            }

            const text =
            await response.text();

            let json;

            try{

                json = JSON.parse(text);

            }catch{

                continue;

            }

            return json;

        }catch(err){

            console.log(
                "FETCH FAILED:",
                err.message
            );

        }

    }

    throw new Error(
        "ALL FETCH METHODS FAILED"
    );

}

function getHistory(data){

    if(data?.data?.list){

        return data.data.list;

    }

    if(data?.list){

        return data.list;

    }

    return [];

}

function nextPeriod(issue){

    try{

        return String(
            BigInt(issue) + 1n
        );

    }catch{

        return "UNKNOWN";

    }

}

function predict(history){

    const nums = history
    .slice(0,15)
    .map(x=>

        Number(
            x.number ||
            x.openNumber ||
            0
        )

    );

    let big = 0;
    let small = 0;

    nums.forEach(n=>{

        if(n >= 5){

            big++;

        }else{

            small++;

        }

    });

    let streak = 1;
    let current = 1;

    for(let i=1;i<nums.length;i++){

        const now =
        nums[i] >= 5;

        const prev =
        nums[i-1] >= 5;

        if(now === prev){

            current++;

            streak =
            Math.max(
                streak,
                current
            );

        }else{

            current = 1;

        }

    }

    const latest =

    nums[0] >= 5
    ? "BIG"
    : "SMALL";

    let prediction;

    // LOSS RECOVERY

    if(reverseMode){

        prediction =

        lastPrediction === "BIG"
        ? "SMALL"
        : "BIG";

        reverseMode = false;

    }

    // LONG STREAK REVERSAL

    else if(streak >= 4){

        prediction =

        latest === "BIG"
        ? "SMALL"
        : "BIG";

    }

    // PRESSURE

    else if(big > small + 2){

        prediction = "SMALL";

    }

    else if(small > big + 2){

        prediction = "BIG";

    }

    // MOMENTUM

    else{

        prediction = latest;

    }

    lastPrediction = prediction;

    return prediction;

}

app.get("/",(req,res)=>{

    res.json({

        status:true,

        message:
        "Prediction API Running"

    });

});

app.get("/api/predict", async(req,res)=>{

    try{

        const raw =
        await smartFetch();

        const history =
        getHistory(raw);

        if(!history.length){

            return res.status(500).json({

                success:false,

                error:"NO HISTORY"

            });

        }

        const latest =
        history[0];

        const currentIssue =

        latest.issueNumber ||
        latest.issue ||
        latest.gameId;

        const nextIssue =
        nextPeriod(currentIssue);

        const actual =

        Number(
            latest.number ||
            latest.openNumber ||
            0
        ) >= 5

        ? "BIG"
        : "SMALL";

        if(lastPrediction){

            if(lastPrediction !== actual){

                reverseMode = true;

            }

        }

        const prediction =
        predict(history);

        res.json({

            period: nextIssue,

            prediction: prediction

        });

    }catch(err){

        console.log(err);

        res.status(500).json({

            success:false,

            error:err.message

        });

    }

});

app.listen(PORT,()=>{

    console.log(

        `SERVER RUNNING ${PORT}`

    );

});
