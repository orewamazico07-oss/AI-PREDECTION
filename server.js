const express = require("express");
const axios = require("axios");

const app = express();

const PORT = process.env.PORT || 3000;

const BOT_TOKEN = "7567919757:AAHm36nUzIdBY7GKMBds2xwAA6QfODBK8U4";
const CHAT_ID = "8272290670";

const API_URL =
  "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

let lastResult = "";

async function sendTelegram(text) {
  try {
    await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        params: {
          chat_id: CHAT_ID,
          text: text,
        },
      }
    );

    console.log("Telegram Message Sent");
  } catch (err) {
    console.log("Telegram Error:", err.message);
  }
}

async function checkWingo() {
  try {
    const response = await axios.get(API_URL);

    console.log(response.data);

    const result = response.data.data.list[0];

    const issue = result.issueNumber;
    const number = result.number;

    const current = `${issue}-${number}`;

    if (current !== lastResult) {
      lastResult = current;

      const size =
        Number(number) >= 5 ? "BIG" : "SMALL";

      const message =
`🎯 WINGO RESULT

🆔 Issue: ${issue}
🔢 Number: ${number}
📌 ${size}`;

      await sendTelegram(message);
    }
  } catch (err) {
    console.log("API ERROR:", err.message);
  }
}

checkWingo();

setInterval(checkWingo, 30000);

app.get("/", (req, res) => {
  res.send("Bot Running Successfully");
});

app.listen(PORT, () => {
  console.log("Server Running On Port " + PORT);
});
