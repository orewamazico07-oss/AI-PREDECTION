const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());

const PORT = process.env.PORT || 3000;

const API =
"https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

let history = [];

let bots = {
    1:[],
    2:[],
    3:[],
    4:[],
    5:[]
};

let currentPrediction = null;

let lastIssue = "";

function bigSmall(n){

    return n >= 5
    ? "BIG"
    : "SMALL";
}

function strategy(id,n){

    if(id==1){

        return n % 2 == 0
        ? "BIG"
        : "SMALL";
    }

    if(id==2){

        return n >= 5
        ? "SMALL"
        : "BIG";
    }

    if(id==3){

        return n % 3 == 0
        ? "BIG"
        : "SMALL";
    }

    if(id==4){

        return n % 2 == 1
        ? "BIG"
        : "SMALL";
    }

    if(id==5){

        return Math.random() > 0.5
        ? "BIG"
        : "SMALL";
    }
}

function chooseMain(){

    let selectedBot = 1;

    let lastMain =
    history[history.length - 1];

    if(lastMain &&
       lastMain.status=="LOSS"){

        for(let i=1;i<=5;i++){

            let bot = bots[i];

            let last2 =
            bot.slice(-2);

            let streak =
            last2.length==2 &&
            last2.every(
            x=>x.status=="WIN"
            );

            if(streak){

                selectedBot = i;

                break;
            }
        }

    }else{

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
        last?.prediction || "--",

        bot:selectedBot
    };
}

async function updatePrediction(){

    try{

        const res =
        await axios.get(API);

        const latest =
        res.data.data.list[0];

        const issue =
        latest.issueNumber;

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

        // old prediction result

        if(currentPrediction){

            let status =
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

                status,

                number,

                period
            });
        }

        // bot update

        for(let i=1;i<=5;i++){

            let prediction =
            strategy(i,number);

            let status =
            prediction == result
            ? "WIN"
            : "LOSS";

            bots[i].push({

                prediction,

                status,

                result,

                period
            });
        }

        // new prediction

        currentPrediction =
        chooseMain();

        console.log(
            "NEW:",
            currentPrediction.prediction
        );

    }catch(e){

        console.log(e.message);
    }
}

setInterval(updatePrediction,1000);

app.get("/api",(req,res)=>{

    let wins =
    history.filter(
    x=>x.status=="WIN"
    ).length;

    let total =
    history.length;

    let accuracy =
    total > 0
    ? ((wins/total)*100)
    .toFixed(2)
    : 0;

    res.json({

        prediction:
        currentPrediction?.prediction || "--",

        follow:
        currentPrediction?.bot || 1,

        accuracy,

        history:
        history.slice(-20).reverse()
    });
});

app.listen(PORT,()=>{

    console.log(
        "SERVER RUNNING"
    );
});