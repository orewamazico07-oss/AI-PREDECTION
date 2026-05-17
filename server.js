const express = require("express");
const axios = require("axios");

const app = express();

const PORT = process.env.PORT || 3000;

// তোমার Telegram Bot Token
const BOT_TOKEN = "7567919757:AAHm36nUzIdBY7GKMBds2xwAA6QfODBK8U4";

// তোমার Chat ID
const CHAT_ID = "8272290670";

// Wingo API
const API_URL =
  "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

let lastIssue = null;

// Telegram এ message পাঠানোর function
async function sendTelegramMessage(message) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    await axios.post(url, {
      chat_id: CHAT_ID,
      text: message,
    });

    console.log("Telegram message sent");
  } catch (error) {
    console.log("Telegram Error:", error.message);
  }
}

// API check করার function
async function checkResult() {
  try {
    const response = await axios.get(API_URL);

    const data = response.data;

    // নিচের path টা API response অনুযায়ী adjust লাগতে পারে
    const result = data?.data?.list?.[0];

    if (!result) {
      console.log("No result found");
      return;
    }

    const issue = result.issueNumber || result.issue || "Unknown";
    const number = result.number || result.openNumber || "0";
    const color = result.color || "Unknown";

    // duplicate message আটকানোর জন্য
    if (issue !== lastIssue) {
      lastIssue = issue;

      let bigSmall = Number(number) >= 5 ? "BIG" : "SMALL";

      const message = `
🎯 WINGO RESULT

🆔 Issue: ${issue}
🔢 Number: ${number}
📌 Size: ${bigSmall}
🎨 Color: ${color}

⏰ Auto Update Every 30 Seconds
      `;

      console.log(message);

      await sendTelegramMessage(message);
    }
  } catch (error) {
    console.log("API Error:", error.message);
  }
}

// প্রতি 30 সেকেন্ড পর API check করবে
setInterval(checkResult, 30000);

// server start
app.get("/", (req, res) => {
  res.send("Wingo Telegram Bot Running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
