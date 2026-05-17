const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cron = require('node-cron');

// Configuration
const TELEGRAM_BOT_TOKEN = '7567919757:AAEKbFDInu7mskhyxlW78_qtQrMBXUF1zV4'; // Replace with your bot token
const CHAT_ID = 'ID: 7567919757'; // Replace with your Telegram chat ID
const API_URL = 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json';

// Initialize bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Store last fetched data to avoid duplicate sends
let lastIssueNumber = null;
let lastResult = null;

// Function to fetch data from API
async function fetchLotteryData() {
    try {
        const response = await axios.get(API_URL, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (response.data && response.data.code === 200) {
            return response.data;
        } else {
            console.log('API response error:', response.data);
            return null;
        }
    } catch (error) {
        console.error('Error fetching data:', error.message);
        return null;
    }
}

// Function to format data for Telegram message
function formatTelegramMessage(data) {
    if (!data || !data.data || !data.data.list || data.data.list.length === 0) {
        return '⚠️ No data available from API';
    }
    
    const latestIssue = data.data.list[0];
    
    let message = '🎯 **WinGo Lottery Result** 🎯\n';
    message += '━'.repeat(25) + '\n';
    message += `📅 **Issue Number:** ${latestIssue.issueNumber || 'N/A'}\n`;
    message += `🎲 **Result:** ${latestIssue.winNumber || 'N/A'}\n`;
    message += `📊 **Sum:** ${latestIssue.sumNumber || 'N/A'}\n`;
    
    if (latestIssue.drawTime) {
        const drawTime = new Date(latestIssue.drawTime);
        message += `⏰ **Draw Time:** ${drawTime.toLocaleString()}\n`;
    }
    
    message += '━'.repeat(25) + '\n';
    message += '🤖 Powered by Telegram Bot';
    
    return message;
}

// Function to send message to Telegram
async function sendToTelegram(message) {
    try {
        await bot.sendMessage(CHAT_ID, message, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
        console.log('Message sent to Telegram successfully');
    } catch (error) {
        console.error('Error sending to Telegram:', error.message);
    }
}

// Function to check and send new data
async function checkAndSendNewData() {
    console.log('Checking for new lottery data...', new Date().toLocaleString());
    
    const data = await fetchLotteryData();
    
    if (!data || !data.data || !data.data.list || data.data.list.length === 0) {
        console.log('No valid data received');
        return;
    }
    
    const latestIssue = data.data.list[0];
    const currentIssueNumber = latestIssue.issueNumber;
    const currentResult = latestIssue.winNumber;
    
    // Check if this is new data
    if (currentIssueNumber !== lastIssueNumber || currentResult !== lastResult) {
        console.log(`New data found! Issue: ${currentIssueNumber}, Result: ${currentResult}`);
        
        const message = formatTelegramMessage(data);
        await sendToTelegram(message);
        
        // Update stored data
        lastIssueNumber = currentIssueNumber;
        lastResult = currentResult;
    } else {
        console.log('No new data found');
    }
}

// Command handlers
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `🤖 **Welcome to Lottery Bot!** 🤖\n\n` +
        `Available commands:\n` +
        `/check - Check latest lottery result\n` +
        `/status - Check bot status\n` +
        `/help - Show this help message\n\n` +
        `Bot will automatically send new results when available.`;
    
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `📖 **Help Guide** 📖\n\n` +
        `Commands:\n` +
        `• /check - Get latest lottery result immediately\n` +
        `• /status - Check bot connection status\n` +
        `• /start - Restart bot\n` +
        `• /help - Show this help\n\n` +
        `⏰ Auto-update: Every 30 seconds\n` +
        `📡 API: WinGo Lottery`;
    
    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/check/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '🔍 Fetching latest lottery data...');
    
    const data = await fetchLotteryData();
    if (data) {
        const message = formatTelegramMessage(data);
        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } else {
        await bot.sendMessage(chatId, '❌ Failed to fetch data. Please try again later.');
    }
});

bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const statusMessage = `✅ **Bot Status** ✅\n\n` +
        `🟢 Bot is running\n` +
        `📡 API: ${API_URL}\n` +
        `⏰ Last check: ${new Date().toLocaleString()}\n` +
        `📊 Last issue: ${lastIssueNumber || 'None'}\n` +
        `🎲 Last result: ${lastResult || 'None'}\n` +
        `🔄 Auto-update: Active (every 30s)`;
    
    await bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
});

// Auto-check every 30 seconds (since WinGo_30S suggests 30-second intervals)
cron.schedule('*/30 * * * * *', () => {
    checkAndSendNewData();
});

// Also check immediately on startup
console.log('Starting Lottery Bot...');
setTimeout(() => {
    checkAndSendNewData();
}, 2000);

// Error handling for bot
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

bot.on('error', (error) => {
    console.error('Bot error:', error);
});

console.log('Telegram Lottery Bot is running...');
console.log(`Monitoring API: ${API_URL}`);
console.log('Waiting for commands and auto-updates...');