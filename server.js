const express = require("express");
const axios = require("axios");

const app = express();

const PORT = process.env.PORT || 3000;

const BOT_TOKEN = "7567919757:AAHm36nUzIdBY7GKMBds2xwAA6QfODBK8U4";
const CHAT_ID = "8272290670";

const API_URL =
  "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

let lastIssue = "";

async function sendTelegramMessage(message) {
  try {
    const telegramURL = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const response = await axios.post(telegramURL, {
      chat_id: CHAT_ID,
      text: message,
    });

    console.log("Message Sent:", response.data);
  } catch (err) {
    console.log(
      "Telegram Error:",
      err.response?.data || err.message
    );
  }
}

async function checkResult() {
  try {
    const response = await axios.get(API_URL);

    console.log("API DATA:", response.data);

    const result =
      response.data?.data?.list?.[0];

    if (!result) {
      console.log("No result found");
      return;
    }

    const issue = result.issueNumber || result.issue;
    const number = result.number;

    if (issue !== lastIssue) {
      lastIssue = issue;

      const size =
        Number(number) >= 5 ? "BIG" : "SMALL";

      const message = `
🎯 WINGO RESULT

🆔 Issue: ${issue}
🔢 Number: ${number}
📌 ${size}
      `;

      await sendTelegramMessage(message);
    }
  } catch (err) {
    console.log(
      "API Error:",
      err.response?.data || err.message
    );
  }
}

checkResult();

setInterval(checkResult, 30000);

app.get("/", (req, res) => {
  res.send("Bot Running");
});

app.listen(PORT, () => {
  console.log(`Server Running On ${PORT}`);
});
