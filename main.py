import os
import time
import threading
import requests
import sys
from flask import Flask

app = Flask(__name__)

def log_message(msg):
    print(msg)
    sys.stdout.flush()

API_URL = os.environ.get("API_URL")
TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN")
CHAT_ID = os.environ.get("CHAT_ID")

def send_telegram_message(message):
    telegram_url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": message, "parse_mode": "Markdown"}
    try:
        response = requests.post(telegram_url, json=payload, timeout=10)
        log_message(f"Telegram Server Response: {response.status_code}")
    except Exception as e:
        log_message(f"Telegram post failed: {e}")

def fetch_and_send_loop():
    log_message("Background loop strictly started for WinGo 30S...")
    last_issue = None
    
    # Lottery API er jonno standard browser headers o payload
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*"
    }
    
    # API data format onujayi standard request payload
    payload = {
        "pageIndex": 1,
        "pageSize": 1,
        "type": 1
    }

    while True:
        try:
            log_message("Fetching dynamic lottery data...")
            # WinGo API tader server e bhed e POST req o nite pare, tai dynamic fetch helper:
            response = requests.post(API_URL, json=payload, headers=headers, timeout=15)
            
            # Jodi POST reject kore, tobe GET try korbe fallback hisebe
            if response.status_code != 200:
                response = requests.get(API_URL, headers=headers, timeout=15)
                
            log_message(f"API Server Code: {response.status_code}")
            
            if response.status_code == 200:
                res_data = response.json()
                
                # Dynamic data parsing (WinGo normal structure code context):
                # Data list theke prothom/latest record ber kora
                try:
                    list_data = res_data.get("data", {}).get("list", [])
                    if list_data:
                        latest_record = list_data[0]
                        current_issue = latest_record.get("issue")
                        result_num = latest_record.get("number")
                        colour = latest_record.get("colour")
                        
                        # Shudhu jodi notun data/issue ashe, toboi msg pathabe (repeat bondho korte)
                        if current_issue != last_issue:
                            last_issue = current_issue
                            
                            msg = (
                                f"🎰 *WinGo 30S New Result* 🎰\n\n"
                                f"🔹 *Issue:* `{current_issue}`\n"
                                f"🔢 *Number:* `{result_num}`\n"
                                f"🎨 *Colour:* `{colour}`"
                            )
                            send_telegram_message(msg)
                            log_message(f"Success: New Issue {current_issue} sent to Telegram.")
                    else:
                        # Jodi API raw structure alada hoy, puro object data map kore pathabe
                        send_telegram_message(f"🎰 *WinGo Alert* 🎰\n\nRaw Data:\n`{str(res_data)[:200]}`")
                except Exception as parse_err:
                    log_message(f"Parsing error: {parse_err}")
                    send_telegram_message(f"🎰 *WinGo Raw Alert* 🎰\n\nData:\n`{str(res_data)[:200]}`")
            else:
                log_message(f"API down/error code: {response.status_code}")
                
        except Exception as e:
            log_message(f"Loop error: {e}")
            
        time.sleep(30)

@app.route('/')
def home():
    return "WinGo 30S Tracker is running perfectly!"

# App context thread shuru
threading.Thread(target=fetch_and_send_loop, daemon=True).start()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
