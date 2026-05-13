from flask import Flask, render_template, jsonify,request
from functions.settings import APP_ENV
import requests
import json, time, os
from functions.functions import combine_log
#from functions.azure_keys import fetch_secret
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# -----------------------
# Flask routes
# -----------------------
@app.route("/")
def index():
    return render_template("index.html")

# -----------------------
# Entrypoint
# -----------------------

@app.route("/api/speech-token", methods=["GET"])
def get_speech_token():
    """Return a short-lived Azure Speech token + region to the frontend."""
    
    #speech_key = fetch_secret(speech_key_code)
    speech_key = os.getenv("AZURE_SPEECH_KEY")
    speech_region = os.getenv("AZURE_SPEECH_REGION")
    
    if not speech_key or not speech_region:
        return jsonify({"error": "Missing Azure credentials"}), 500

    fetch_url = f"https://{speech_region}.api.cognitive.microsoft.com/sts/v1.0/issuetoken"
    headers = {"Ocp-Apim-Subscription-Key": speech_key}

    try:
        r = requests.post(fetch_url, headers=headers)
        r.raise_for_status()
    except requests.RequestException as e:
        return jsonify({"error": f"Failed to fetch token: {e}"}), 500

    token = r.text
    return jsonify({"token": token, "region": speech_region})

@app.route("/save-log", methods=["POST"])
def save_log():
    data = request.get_json(force=True)
    if not data:
        return jsonify({"error": "No log data provided"}), 400

    os.makedirs("./temp", exist_ok=True)
    filename = f"session_log_{APP_ENV}_{int(time.time())}.json"
    filepath = os.path.join("./temp", filename)

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    log_combined = combine_log(data)

    return jsonify({"message": "Log saved", "file": log_combined})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)