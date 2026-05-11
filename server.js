const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());

const PORT = process.env.PORT || 3000;

// ORIGINAL RESULT API

const SOURCE_API =
"https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

// STORAGE

let history = [];

let bots = {
    1:[],
    2:[],
    3:[],
    4:[],
    5:[]
};

// CURRENT MAIN PREDICTION

let currentPrediction = {

    prediction:
    Math.random() > 0.5
    ? "BIG"
    : "SMALL",

    bot:1
};

let lastIssue = "";

// BIG SMALL

function bigSmall(n){

    return n >= 5
    ? "BIG"
    : "SMALL";
}

// 5 AI MATH RANDOM SYSTEM

function strategy(id,n,last){

    // AI 1
    // EVEN ODD

    if(id==1){

        return n % 2 == 0
        ? "BIG"
        : "SMALL";
    }

    // AI 2
    // REVERSE

    if(id==2){

        return n >= 5
        ? "SMALL"
        : "BIG";
    }

    // AI 3
    // MOD RANDOM

    if(id==3){

        return (
            n +
            Math.floor(Math.random()*10)
        ) % 2 == 0
        ? "BIG"
        : "SMALL";
    }

    // AI 4
    // FOLLOW LAST

    if(id==4){

        return last=="BIG"
        ? "SMALL"
        : "BIG";
    }

    // AI 5
    // PURE RANDOM

    if(id==5){

        return Math.random() > 0.5
        ? "BIG"
        : "SMALL";
    }
}

// MAIN SYSTEM

function chooseMain(){

    let selectedBot = 1;

    let lastMain =
    history[history.length - 1];

    // যদি last LOSS হয়
    // তাহলে যেই bot এর টানা 2 WIN
    // সেই bot follow

    if(lastMain &&
       lastMain.status=="LOSS"){

        for(let i=1;i<=5;i++){

            let bot =
            bots[i];

            let last2 =
            bot.slice(-2);

            let streak2 =
            last2.length==2 &&
            last2.every(
            x=>x.status=="WIN"
            );

            if(streak2){

                selectedBot = i;

                break;
            }
        }

    }else{

        // normal best AI

        let maxWin = 0;

        for(let i=1;i<=5;i++){

            let recent =
            bots[i].slice(-3);

            let wins =
            recent.filter(
            x=>x.status=="WIN"
            ).length;

            if(wins > maxWin){

                maxWin = wins;

                selectedBot = i;
            }
        }
    }

    let bot =
    bots[selectedBot];

    let last =
    bot[bot.length - 1];

    return {

        prediction:
        last?.prediction ||

        (
            Math.random() > 0.5
            ? "BIG"
            : "SMALL"
        ),

        bot:selectedBot
    };
}

// UPDATE SYSTEM

async function updatePrediction(){

    try{

        const res =
        await axios.get(SOURCE_API);

        const latest =
        res.data.data.list[0];

        const issue =
        latest.issueNumber;

        // duplicate stop

        if(issue === lastIssue){

            return;
        }

        lastIssue = issue;

        let number =
        Number(latest.number);

        let result =
        bigSmall(number);

        let period =
        issue.slice(-2);

        // OLD MAIN RESULT CHECK

        if(currentPrediction){

            let mainStatus =

            currentPrediction.prediction
            == result

            ? "WIN"
            : "LOSS";

            history.push({

                prediction:
                currentPrediction.prediction,

                bot:
                currentPrediction.bot,

                result,

                status:
                mainStatus,

                number,

                period,

                time:
                new Date()
                .toLocaleTimeString()
            });
        }

        // AI UPDATE

        for(let i=1;i<=5;i++){

            let lastBot =
            bots[i][
                bots[i].length - 1
            ];

            let prediction =
            strategy(
                i,
                number,
                lastBot?.prediction
            );

            let status =

            prediction == result

            ? "WIN"
            : "LOSS";

            bots[i].push({

                prediction,

                result,

                status,

                period
            });
        }

        // NEW MAIN PREDICTION

        currentPrediction =
        chooseMain();

        console.log(

            "NEW PREDICTION =>",

            currentPrediction.prediction,

            "| BOT =>",

            currentPrediction.bot
        );

    }catch(e){

        console.log(e.message);
    }
}

// AUTO RUN

updatePrediction();

setInterval(updatePrediction,1000);

// MAIN API

app.get("/api",(req,res)=>{

    let wins =
    history.filter(
    x=>x.status=="WIN"
    ).length;

    let losses =
    history.filter(
    x=>x.status=="LOSS"
    ).length;

    let total =
    wins + losses;

    let accuracy =

    total > 0

    ? ((wins/total)*100)
    .toFixed(2)

    : 0;

    res.json({

        prediction:
        currentPrediction.prediction,

        follow:
        currentPrediction.bot,

        wins,

        losses,

        accuracy,

        history:
        history.slice(-10).reverse()
    });
});

// ROOT

app.get("/",(req,res)=>{

    res.send("AI SERVER RUNNING");
});

// START

app.listen(PORT,()=>{

    console.log(

        "SERVER RUNNING ON",

        PORT
    );
});
