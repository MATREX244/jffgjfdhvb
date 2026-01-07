import subprocess
import json
import os
import requests
from datetime import datetime

class ReconEngine:
    def __init__(self, discord_webhook=None):
        self.discord_webhook = discord_webhook
        self.results_dir = "data/results"
        os.makedirs(self.results_dir, exist_ok=True)

    def notify_discord(self, message, severity="INFO"):
        if not self.discord_webhook:
            return
        
        colors = {
            "CRITICAL": 15158332,
            "HIGH": 15105536,
            "MEDIUM": 15844367,
            "LOW": 3447003,
            "INFO": 3447003
        }
        
        payload = {
            "embeds": [{
                "title": f"🛡️ Manus-Recon-Elite: {severity}",
                "description": message,
                "color": colors.get(severity, 3447003),
                "timestamp": datetime.utcnow().isoformat()
            }]
        }
        try:
            requests.post(self.discord_webhook, json=payload)
        except Exception as e:
            print(f"Error sending notification: {e}")

    def run_command(self, cmd):
        try:
            process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            stdout, stderr = process.communicate()
            return stdout, stderr
        except Exception as e:
            return "", str(e)

    def start_recon(self, target):
        self.notify_discord(f"🚀 Iniciando Recon Massivo para: **{target}**", "INFO")
        
        # 1. Subdomain Enumeration
        print(f"[*] Enumerating subdomains for {target}...")
        self.run_command(f"subfinder -d {target} -o {self.results_dir}/subdomains.txt")
        
        # 2. HTTP Probing
        print(f"[*] Probing alive hosts...")
        self.run_command(f"httpx -l {self.results_dir}/subdomains.txt -o {self.results_dir}/alive.txt -silent")
        
        # 3. Vulnerability Scanning (Nuclei)
        print(f"[*] Running Nuclei scans...")
        stdout, _ = self.run_command(f"nuclei -l {self.results_dir}/alive.txt -json -silent")
        
        # Process Nuclei Results for Notifications
        for line in stdout.splitlines():
            try:
                vuln = json.loads(line)
                severity = vuln.get("info", {}).get("severity", "INFO").upper()
                if severity in ["CRITICAL", "HIGH", "MEDIUM"]:
                    name = vuln.get("info", {}).get("name")
                    matched = vuln.get("matched-at")
                    self.notify_discord(f"🚨 **{name}** detectado em `{matched}`", severity)
            except:
                continue

        self.notify_discord(f"✅ Recon finalizado para: **{target}**", "INFO")
