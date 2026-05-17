import os
import time
import threading
import requests
from flask import Flask

app = Flask(__name__)

# Server theke secure bhabe details ekhane ashbe
API_URL = os.environ.get("API_URL")
TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN")
CHAT_ID = os.environ.get("CHAT_ID")

def send_telegram_message(message):
    telegram_url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": message}
    try:
        response = requests.post(telegram_url, json=payload)
        if response.status_code != 200:
            print(f"Telegram error response: {response.text}")
    except Exception as e:
        print(f"Telegram error: {e}")

def fetch_and_send_loop():
    print("Background loop shuru hoyeche...")
    while True:
        try:
            response = requests.get(API_URL)
            if response.status_code == 200:
                data = response.json() # ba text
                
                # Telegram message ready kora
                message_text = f"🚨 New Data Alert! 🚨\n\nData: {data}"
                
                send_telegram_message(message_text)
                print("Data sent to Telegram!")
            else:
                print(f"API failed with status: {response.status_code}")
        except Exception as e:
            print(f"Loop error: {e}")
        
        time.sleep(30)  # Exactly 30 second por por kaj korbe

@app.route('/')
def home():
    return "Bot is running perfectly!"

if __name__ == "__main__":
    # Background-e 30s er loop-ti chalanor jonno thread
    threading.Thread(target=fetch_and_send_loop, daemon=True).start()
    
    # Render-er free port track kora
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
