const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cron = require('node-cron');

// আপনার সঠিক TOKEN এবং CHAT_ID দিন
const TELEGRAM_BOT_TOKEN = '7567919757:AAEKbFDInu7mskhyxlW78_qtQrMBXUF1zV4';
const CHAT_ID = '7567919757';

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

let lastIssueNumber = null;

// সঠিকভাবে API থেকে ডেটা নেওয়ার ফাংশন
async function fetchLotteryData() {
    try {
        const response = await axios({
            method: 'get',
            url: 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json',
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://www.ar-lottery01.com/',
                'Origin': 'https://www.ar-lottery01.com',
                'Connection': 'keep-alive',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site'
            }
        });
        
        console.log('API Response Status:', response.status);
        
        if (response.data && response.data.code === 200) {
            console.log('✅ Data fetched successfully');
            return response.data;
        } else {
            console.log('API returned:', response.data);
            return null;
        }
    } catch (error) {
        console.log('Error:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Headers:', error.response.headers);
        }
        return null;
    }
}

// মেসেজ ফরম্যাট করা
function formatMessage(data) {
    if (!data || !data.data || !data.data.list || data.data.list.length === 0) {
        return '❌ কোনো ডেটা পাওয়া যায়নি';
    }
    
    const item = data.data.list[0];
    let msg = '🎯 **উইনগো লটারি রেজাল্ট** 🎯\n';
    msg += '━━━━━━━━━━━━━━━━━━━━━━\n';
    msg += `📌 **ইস্যু:** ${item.issueNumber}\n`;
    msg += `🎲 **রেজাল্ট:** \`${item.winNumber}\`\n`;
    msg += `🔢 **সাম:** ${item.sumNumber}\n`;
    msg += `⏰ **সময়:** ${new Date(item.drawTime).toLocaleString('bn-BD')}\n`;
    msg += '━━━━━━━━━━━━━━━━━━━━━━\n';
    msg += '🤖 *স্বয়ংক্রিয় বট*';
    return msg;
}

// টেলিগ্রামে পাঠানো
async function sendToTelegram(message) {
    try {
        await bot.sendMessage(CHAT_ID, message, {
            parse_mode: 'Markdown'
        });
        console.log('✅ Message sent');
    } catch (error) {
        console.error('❌ Send error:', error.message);
    }
}

// ডেটা চেক করা
async function checkData() {
    console.log('🔍 Checking data...', new Date().toLocaleTimeString());
    
    const data = await fetchLotteryData();
    
    if (data && data.data && data.data.list && data.data.list.length > 0) {
        const currentIssue = data.data.list[0].issueNumber;
        
        if (currentIssue !== lastIssueNumber) {
            const message = formatMessage(data);
            await sendToTelegram(message);
            lastIssueNumber = currentIssue;
            console.log('✅ New data sent:', currentIssue);
        } else {
            console.log('📭 No new data');
        }
    } else {
        console.log('❌ Failed to fetch data');
        // স্ট্যাটাস মেসেজ পাঠানো (ঐচ্ছিক)
        await sendToTelegram('⚠️ বট চালু আছে কিন্তু API থেকে ডেটা আসছে না');
    }
}

// বট কমান্ড
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 
        `🤖 *লটারি বট চালু আছে*\n\n` +
        `📌 /check - রেজাল্ট দেখুন\n` +
        `📊 /status - বট স্ট্যাটাস\n\n` +
        `বট প্রতি ৩০ সেকেন্ডে আপডেট দিবে`,
        { parse_mode: 'Markdown' }
    );
});

bot.onText(/\/check/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '🔍 ডেটা নেওয়া হচ্ছে...');
    const data = await fetchLotteryData();
    const message = formatMessage(data);
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    const status = `📊 *বট স্ট্যাটাস*\n\n` +
                   `✅ বট চলছে\n` +
                   `🕐 সময়: ${new Date().toLocaleString()}\n` +
                   `📌 শেষ ইস্যু: ${lastIssueNumber || 'নাই'}\n` +
                   `🔄 আপডেট: প্রতি ৩০ সেকেন্ডে`;
    bot.sendMessage(chatId, status, { parse_mode: 'Markdown' });
});

// প্রতি ৩০ সেকেন্ডে ডেটা চেক
cron.schedule('*/30 * * * * *', () => {
    checkData();
});

// শুরুতে একবার চেক
setTimeout(() => {
    checkData();
    console.log('🚀 Bot started');
}, 3000);
