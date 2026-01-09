from flask import Flask, render_template, request, jsonify
import threading
import sys
import os

# Adicionar o diretório pai ao path para importar o core
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from core.engine import ReconEngine

app = Flask(__name__)

# Estado global para monitoramento
scan_data = {
    "running": False,
    "target": "",
    "logs": [],
    "subdomains": [],
    "urls": [],
    "vulns": []
}

engine_instance = None

class WebLogger:
    def write(self, message):
        if message.strip():
            scan_data["logs"].append(message.strip())
            if len(scan_data["logs"]) > 500: # Limite de logs na memória
                scan_data["logs"].pop(0)
    def flush(self):
        pass

def run_recon_thread(target):
    global engine_instance
    scan_data["running"] = True
    scan_data["target"] = target
    scan_data["logs"] = []
    scan_data["subdomains"] = []
    scan_data["urls"] = []
    scan_data["vulns"] = []
    
    # Redirecionar stdout para capturar logs do engine
    original_stdout = sys.stdout
    sys.stdout = WebLogger()
    
    try:
        engine_instance = ReconEngine()
        engine_instance.start_recon(target, scan_data)
    except Exception as e:
        print(f"[ERROR] {str(e)}")
    finally:
        scan_data["running"] = False
        sys.stdout = original_stdout

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start', methods=['POST'])
def start():
    data = request.json
    target = data.get('target')
    if not scan_data["running"]:
        thread = threading.Thread(target=run_recon_thread, args=(target,))
        thread.start()
        return jsonify({"status": "started"})
    return jsonify({"status": "already_running"}), 400

@app.route('/stop', methods=['POST'])
def stop():
    if scan_data["running"]:
        scan_data["running"] = False
        # Nota: O processo subprocess ainda pode rodar até o próximo check no engine
        return jsonify({"status": "stopped"})
    return jsonify({"status": "not_running"}), 400

@app.route('/status')
def status():
    return jsonify(scan_data)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
