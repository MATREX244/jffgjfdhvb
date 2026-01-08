from flask import Flask, render_template, request, jsonify
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core.engine import ReconEngine

app = Flask(__name__)
engine = ReconEngine(discord_webhook=os.getenv("DISCORD_WEBHOOK_URL"))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start')
def start_scan():
    target = request.args.get('target')
    if not target:
        return jsonify({"error": "Target is required"}), 400
    
    # Rodar em background (simplificado para exemplo)
    import threading
    threading.Thread(target=engine.start_recon, args=(target,)).start()
    
    return jsonify({"message": f"Scan started for {target}", "status": "running"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
