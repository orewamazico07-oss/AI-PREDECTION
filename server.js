const express = require("express");
const axios = require("axios");

const app = express();

const PORT = process.env.PORT || 3000;

// TELEGRAM
const BOT_TOKEN = "7567919757:AAHm36nUzIdBY7GKMBds2xwAA6QfODBK8U4";
const CHAT_ID = "8272290670";

// API
const API_URL =
  "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json";

let lastIssue = "";

// Telegram Message Function
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

// Fetch Wingo Result
async function checkResult() {
  try {
    const response = await axios({
      method: "POST",
      url: API_URL,

      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",

        Accept: "application/json, text/plain, */*",

        Origin: "https://draw.ar-lottery01.com",

        Referer: "https://draw.ar-lottery01.com/",

        "Content-Type": "application/json",
      },

      data: {},
    });

    console.log("API HIT SUCCESS");

    const result = response.data.data.list[0];

    const issue =
      result.issueNumber ||
      result.issue ||
      "Unknown";

    const number =
      result.number ||
      result.openNumber ||
      "0";

    const currentIssue = `${issue}-${number}`;

    // Duplicate আটকাবে
    if (currentIssue !== lastIssue) {
      lastIssue = currentIssue;

      const size =
        Number(number) >= 5
          ? "BIG"
          : "SMALL";

      const message =
`🎯 WINGO RESULT

🆔 Issue : ${issue}

🔢 Number : ${number}

📌 Size : ${size}

⏰ Auto Updated`;

      await sendTelegram(message);
    }
  } catch (err) {
    console.log(
      "API ERROR:",
      err.response?.status || err.message
    );

    console.log(
      err.response?.data || "No Response"
    );
  }
}

// Start
checkResult();

// Every 30 Seconds
setInterval(checkResult, 30000);

// Home Route
app.get("/", (req, res) => {
  res.send("WINGO BOT RUNNING");
});

// Server
app.listen(PORT, () => {
  console.log(
    `SERVER STARTED ON PORT ${PORT}`
  );
});
