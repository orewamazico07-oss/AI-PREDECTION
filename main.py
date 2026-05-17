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
        log_message(f"Telegram status: {response.status_code}")
    except Exception as e:
        log_message(f"Telegram failed: {e}")

def fetch_and_send_loop():
    log_message("!!! BACKGROUND LOOP IS NOW ACTIVE !!!")
    last_issue = None
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*"
    }
    payload = {"pageIndex": 1, "pageSize": 1, "type": 1}

    while True:
        try:
            log_message("Fetching lottery data right now...")
            response = requests.post(API_URL, json=payload, headers=headers, timeout=15)
            
            if response.status_code != 200:
                response = requests.get(API_URL, headers=headers, timeout=15)
                
            log_message(f"API Code: {response.status_code}")
            
            if response.status_code == 200:
                res_data = response.json()
                try:
                    list_data = res_data.get("data", {}).get("list", [])
                    if list_data:
                        latest_record = list_data[0]
                        current_issue = latest_record.get("issue")
                        result_num = latest_record.get("number")
                        colour = latest_record.get("colour")
                        
                        if current_issue != last_issue:
                            last_issue = current_issue
                            msg = (
                                f"🎰 *WinGo 30S New Result* 🎰\n\n"
                                f"🔹 *Issue:* `{current_issue}`\n"
                                f"🔢 *Number:* `{result_num}`\n"
                                f"🎨 *Colour:* `{colour}`"
                            )
                            send_telegram_message(msg)
                    else:
                        # Fallback raw string data jodi structure onno hoy
                        raw_str = str(res_data)[:150]
                        send_telegram_message(f"🎰 WinGo Raw Data:\n`{raw_str}`")
                except Exception as parse_err:
                    send_telegram_message(f"🎰 Raw Data:\n`{str(res_data)[:150]}`")
            else:
                log_message(f"API Error Code: {response.status_code}")
        except Exception as e:
            log_message(f"Loop error: {e}")
            
        time.sleep(30)

# Ekhane amra ekta background initialization thread dicchi jeta Flask start hobar sathe sathe cholbe
@app.before_all_requests
def start_loop_once():
    # Prothom dynamic hit-e jate trigger hoy
    pass

# Flask application global scope e thread start nishchit korbe
def start_tracker():
    t = threading.Thread(target=fetch_and_send_loop, daemon=True)
    t.start()

start_tracker()

@app.route('/')
def home():
    return "WinGo 30S Tracker is active!"

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
