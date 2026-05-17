const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cron = require('node-cron');

// Environment variables থেকে Token নিবে
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const API_URL = 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json';

// Token চেক
if (!TELEGRAM_BOT_TOKEN || !CHAT_ID) {
    console.error('ERROR: TELEGRAM_BOT_TOKEN and CHAT_ID must be set in environment variables');
    process.exit(1);
}

// Bot initialization with polling options
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { 
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10
        }
    }
});

let lastIssueNumber = null;
let lastResult = null;

// Proxy এবং headers সহ API fetch
async function fetchLotteryData() {
    try {
        const response = await axios.get(API_URL, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://ar-lottery01.com/',
                'Origin': 'https://ar-lottery01.com'
            },
            // CORS bypass এর জন্য
            withCredentials: false
        });
        
        if (response.data && response.data.code === 200) {
            console.log('API data fetched successfully');
            return response.data;
        } else {
            console.log('API response:', response.data);
            return null;
        }
    } catch (error) {
        if (error.response) {
            console.log(`API Error ${error.response.status}: ${error.response.statusText}`);
            // 403 error এর জন্য alternative approach
            if (error.response.status === 403) {
                console.log('Trying alternative method...');
                return await fetchWithAlternativeMethod();
            }
        } else {
            console.error('Network Error:', error.message);
        }
        return null;
    }
}

// Alternative method with different headers
async function fetchWithAlternativeMethod() {
    try {
        const response = await axios.get(API_URL, {
            timeout: 15000,
            headers: {
                'User-Agent': 'curl/7.68.0',
                'Accept': '*/*',
                'Cache-Control': 'no-cache'
            }
        });
        return response.data;
    } catch (error) {
        console.log('Alternative method also failed');
        return null;
    }
}

function formatTelegramMessage(data) {
    if (!data || !data.data || !data.data.list || data.data.list.length === 0) {
        return '⚠️ API থেকে ডেটা পাওয়া যাচ্ছে না';
    }
    
    const latestIssue = data.data.list[0];
    
    let message = '🎯 **উইনগো লটারি রেজাল্ট** 🎯\n';
    message += '━'.repeat(25) + '\n';
    message += `📅 **ইস্যু নম্বর:** ${latestIssue.issueNumber || 'N/A'}\n`;
    message += `🎲 **রেজাল্ট:** ${latestIssue.winNumber || 'N/A'}\n`;
    message += `📊 **সাম:** ${latestIssue.sumNumber || 'N/A'}\n`;
    
    if (latestIssue.drawTime) {
        const drawTime = new Date(latestIssue.drawTime);
        message += `⏰ **ড্র সময়:** ${drawTime.toLocaleString('bn-BD')}\n`;
    }
    
    message += '━'.repeat(25) + '\n';
    message += '🤖 বট দ্বারা স্বয়ংক্রিয়';
    
    return message;
}

async function sendToTelegram(message) {
    try {
        await bot.sendMessage(CHAT_ID, message, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
        console.log('✅ Message sent to Telegram');
    } catch (error) {
        console.error('❌ Telegram error:', error.message);
    }
}

async function checkAndSendNewData() {
    console.log('🔍 Checking for new data...', new Date().toLocaleString());
    
    const data = await fetchLotteryData();
    
    if (!data || !data.data || !data.data.list || data.data.list.length === 0) {
        console.log('❌ No valid data received');
        return;
    }
    
    const latestIssue = data.data.list[0];
    const currentIssueNumber = latestIssue.issueNumber;
    const currentResult = latestIssue.winNumber;
    
    if (currentIssueNumber !== lastIssueNumber || currentResult !== lastResult) {
        console.log(`🆕 New data! Issue: ${currentIssueNumber}, Result: ${currentResult}`);
        const message = formatTelegramMessage(data);
        await sendToTelegram(message);
        
        lastIssueNumber = currentIssueNumber;
        lastResult = currentResult;
    } else {
        console.log('📭 No new data found');
    }
}

// Bot commands - Bengali language support
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `🤖 **লটারি বটে স্বাগতম!** 🤖\n\n` +
        `কমান্ড সমূহ:\n` +
        `/check - সর্বশেষ রেজাল্ট দেখুন\n` +
        `/status - বটের অবস্থা দেখুন\n` +
        `/help - হেল্প দেখুন\n\n` +
        `বট স্বয়ংক্রিয়ভাবে নতুন রেজাল্ট পাঠাবে।`;
    
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `📖 **হেল্প গাইড** 📖\n\n` +
        `কমান্ড:\n` +
        `• /check - এখনই রেজাল্ট দেখুন\n` +
        `• /status - বট কানেকশন চেক করুন\n` +
        `• /start - বট রিস্টার্ট করুন\n` +
        `• /help - এই হেল্প দেখান\n\n` +
        `⏰ অটো-আপডেট: প্রতি ৩০ সেকেন্ড`;
    
    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/check/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '🔍 ডেটা আনছে...');
    
    const data = await fetchLotteryData();
    if (data && data.data && data.data.list) {
        const message = formatTelegramMessage(data);
        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } else {
        await bot.sendMessage(chatId, '❌ ডেটা পাওয়া যায়নি। পরে আবার চেষ্টা করুন।');
    }
});

bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const statusMessage = `✅ **বট স্ট্যাটাস** ✅\n\n` +
        `🟢 বট চলছে\n` +
        `📡 API: ${API_URL}\n` +
        `⏰ শেষ চেক: ${new Date().toLocaleString()}\n` +
        `📊 শেষ ইস্যু: ${lastIssueNumber || 'কোনটি নাই'}\n` +
        `🎲 শেষ রেজাল্ট: ${lastResult || 'কোনটি নাই'}\n` +
        `🔄 অটো-আপডেট: সক্রিয় (প্রতি ৩০ সেকেন্ড)`;
    
    await bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
});

// 30 seconds interval
cron.schedule('*/30 * * * * *', () => {
    checkAndSendNewData();
});

// Startup
console.log('🚀 Lottery Bot Starting...');
setTimeout(() => {
    checkAndSendNewData();
}, 3000);

// Error handlers
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

console.log('✅ Bot is running successfully');
