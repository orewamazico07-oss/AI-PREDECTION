const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cron = require('node-cron');

// Environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!TELEGRAM_BOT_TOKEN || !CHAT_ID) {
    console.error('ERROR: Set TELEGRAM_BOT_TOKEN and CHAT_ID in environment variables');
    process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

let lastIssueNumber = null;
let lastResult = null;

// Multiple methods to fetch data
async function fetchLotteryData() {
    // Method 1: Direct API
    let data = await fetchDirect();
    if (data) return data;
    
    // Method 2: Using CORS proxy
    data = await fetchWithProxy();
    if (data) return data;
    
    // Method 3: Using different proxy
    data = await fetchWithAltProxy();
    if (data) return data;
    
    return null;
}

async function fetchDirect() {
    try {
        const response = await axios.get('https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache'
            }
        });
        if (response.data && response.data.code === 200) {
            console.log('✅ Direct fetch successful');
            return response.data;
        }
    } catch (error) {
        console.log('Direct fetch failed:', error.message);
    }
    return null;
}

async function fetchWithProxy() {
    const proxies = [
        'https://api.allorigins.win/raw?url=',
        'https://cors-anywhere.herokuapp.com/',
        'https://proxy.cors.sh/'
    ];
    
    for (const proxy of proxies) {
        try {
            const url = proxy + encodeURIComponent('https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json');
            const response = await axios.get(url, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'origin': 'https://ar-lottery01.com'
                }
            });
            
            let data = response.data;
            // If proxy returns string, parse it
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            
            if (data && data.code === 200) {
                console.log(`✅ Proxy successful: ${proxy}`);
                return data;
            }
        } catch (error) {
            console.log(`Proxy ${proxy} failed`);
        }
    }
    return null;
}

async function fetchWithAltProxy() {
    try {
        // Using different approach - fetch through a different endpoint
        const response = await axios.get('https://corsproxy.io/?' + encodeURIComponent('https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json'), {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        if (response.data && response.data.code === 200) {
            console.log('✅ Alternative proxy successful');
            return response.data;
        }
    } catch (error) {
        console.log('Alternative proxy failed');
    }
    return null;
}

// Fallback: Mock data for testing (Remove in production if real data works)
function getMockData() {
    return {
        code: 200,
        data: {
            list: [
                {
                    issueNumber: `20260517${Math.floor(Math.random() * 100)}`,
                    winNumber: Math.floor(Math.random() * 10).toString(),
                    sumNumber: Math.floor(Math.random() * 30).toString(),
                    drawTime: new Date().toISOString()
                }
            ]
        }
    };
}

function formatTelegramMessage(data) {
    let latestIssue;
    
    if (data && data.data && data.data.list && data.data.list.length > 0) {
        latestIssue = data.data.list[0];
    } else {
        // Use mock data if real data not available
        const mockData = getMockData();
        latestIssue = mockData.data.list[0];
        return '⚠️ *সতর্কতা: রিয়েল টাইম ডেটা পাওয়া যায়নি*\n\n' +
               `🎯 **টেস্ট রেজাল্ট** 🎯\n` +
               `📅 ইস্যু: ${latestIssue.issueNumber}\n` +
               `🎲 রেজাল্ট: ${latestIssue.winNumber}\n` +
               `📊 সাম: ${latestIssue.sumNumber}\n\n` +
               `🔧 API সংযোগে সমস্যা হচ্ছে`;
    }
    
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
        console.log('✅ Message sent');
    } catch (error) {
        console.error('❌ Send error:', error.message);
    }
}

async function checkAndSendNewData() {
    console.log('🔍 Checking for new data...', new Date().toLocaleString());
    
    let data = await fetchLotteryData();
    
    // If no real data, send status update
    if (!data) {
        console.log('❌ No API data, sending status update');
        const statusMsg = `⚠️ *API সংযোগ সমস্যা*\n\n` +
                         `রিয়েল টাইম ডেটা পাওয়া যাচ্ছে না।\n` +
                         `সময়: ${new Date().toLocaleString()}\n\n` +
                         `বট চেক করতে থাকবে।`;
        await sendToTelegram(statusMsg);
        return;
    }
    
    if (data.data && data.data.list && data.data.list.length > 0) {
        const latestIssue = data.data.list[0];
        const currentIssueNumber = latestIssue.issueNumber;
        const currentResult = latestIssue.winNumber;
        
        if (currentIssueNumber !== lastIssueNumber || currentResult !== lastResult) {
            console.log(`🆕 New data! Issue: ${currentIssueNumber}`);
            const message = formatTelegramMessage(data);
            await sendToTelegram(message);
            lastIssueNumber = currentIssueNumber;
            lastResult = currentResult;
        }
    }
}

// Bot commands
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 
        `🤖 *লটারি বটে স্বাগতম!*\n\n` +
        `কমান্ড:\n` +
        `/check - রেজাল্ট দেখুন\n` +
        `/status - বট স্ট্যাটাস\n` +
        `/testapi - API টেস্ট করুন\n\n` +
        `বট প্রতি ৩০ সেকেন্ডে আপডেট চেক করে।`,
        { parse_mode: 'Markdown' }
    );
});

bot.onText(/\/check/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '🔍 ডেটা আনছে...');
    const data = await fetchLotteryData();
    const message = formatTelegramMessage(data);
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const statusMsg = `✅ *বট স্ট্যাটাস*\n\n` +
                     `🟢 বট চলছে\n` +
                     `⏰ সময়: ${new Date().toLocaleString()}\n` +
                     `📊 শেষ ইস্যু: ${lastIssueNumber || 'নাই'}\n` +
                     `🔄 আপডেট: সক্রীয় (৩০ সেকেন্ড)\n` +
                     `🌐 API: ${lastIssueNumber ? 'কাজ করছে' : 'সংযোগ বিচ্ছিন্ন'}`;
    await bot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
});

bot.onText(/\/testapi/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, '🧪 API টেস্ট শুরু হচ্ছে...');
    
    const direct = await fetchDirect();
    const proxy = await fetchWithProxy();
    
    let result = `📊 *API টেস্ট রেজাল্ট*\n\n`;
    result += `Direct API: ${direct ? '✅ কাজ করে' : '❌ কাজ করে না'}\n`;
    result += `Proxy API: ${proxy ? '✅ কাজ করে' : '❌ কাজ করে না'}\n\n`;
    result += `সর্বশেষ স্ট্যাটাস: ${lastIssueNumber ? 'সংযোগ স্থাপিত' : 'সংযোগহীন'}`;
    
    await bot.sendMessage(chatId, result, { parse_mode: 'Markdown' });
});

// Auto-check every 30 seconds
cron.schedule('*/30 * * * * *', () => {
    checkAndSendNewData();
});

// Initial check
setTimeout(() => {
    checkAndSendNewData();
}, 5000);

console.log('🚀 Bot started successfully');
console.log('📡 Monitoring API with multiple methods');
