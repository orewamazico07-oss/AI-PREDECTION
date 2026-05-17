const express = require("express");
const axios = require("axios");

const app = express();

const PORT = process.env.PORT || 3000;

const BOT_TOKEN = "7567919757:AAHm36nUzIdBY7GKMBds2xwAA6QfODBK8U4";
const CHAT_ID = "8272290670";

let lastIssue = "";

async function sendTelegram(text) {
  try {
    await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        params: {
          chat_id: CHAT_ID,
          text,
        },
      }
    );

    console.log("Telegram Message Sent");
  } catch (e) {
    console.log("Telegram Error:", e.message);
  }
}

async function checkResult() {
  try {
    const response = await axios.get(
      "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          Accept: "application/json",
          Referer: "https://draw.ar-lottery01.com/",
        },
      }
    );

    console.log("API HIT");

    const result = response.data.data.list[0];

    const issue = result.issueNumber;
    const number = result.number;

    if (issue !== lastIssue) {
      lastIssue = issue;

      const size =
        Number(number) >= 5 ? "BIG" : "SMALL";

      const text =
`🎯 WINGO RESULT

🆔 ${issue}
🔢 ${number}
📌 ${size}`;

      await sendTelegram(text);
    }
  } catch (e) {
    console.log("API ERROR:", e.message);
  }
}

checkResult();

setInterval(checkResult, 30000);

app.get("/", (req, res) => {
  res.send("BOT RUNNING");
});

app.listen(PORT, () => {
  console.log("SERVER STARTED");
});
