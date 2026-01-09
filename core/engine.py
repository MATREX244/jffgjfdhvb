import subprocess
import json
import os
import requests
import time
from datetime import datetime
from core.bypass403 import Bypass403

class ReconEngine:
    def __init__(self, discord_webhook="https://discord.com/api/webhooks/1456906799553839157/jGQmsTAx82bZnzu32QQRwcTMuqtTjiiuQPtS80XlhY2GpS2vXm0MclJ7oqdXP7lxsNGT"):
        self.discord_webhook = discord_webhook
        self.results_dir = "data/results"
        self.bin_path = "/usr/local/bin"
        os.makedirs(self.results_dir, exist_ok=True)

    def notify_discord(self, message, severity="INFO"):
        if not self.discord_webhook:
            return
        
        colors = {
            "CRITICAL": 15158332,
            "HIGH": 15105536,
            "MEDIUM": 15844367,
            "LOW": 3447003,
            "INFO": 9807270
        }
        
        payload = {
            "embeds": [{
                "title": f"🛡️ BUG HUNTER ELITE: {severity}",
                "description": message,
                "color": colors.get(severity, 9807270),
                "timestamp": datetime.utcnow().isoformat(),
                "footer": {"text": "Manus Bug Bounty Automation"}
            }]
        }
        try:
            requests.post(self.discord_webhook, json=payload, timeout=10)
        except:
            pass

    def run_command(self, cmd, output_file=None, scan_data=None):
        if scan_data and not scan_data.get("running"):
            return "", "Stopped"
            
        try:
            print(f"[EXEC] {cmd}")
            process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            
            stdout_list = []
            while True:
                line = process.stdout.readline()
                if not line and process.poll() is not None:
                    break
                if line:
                    stdout_list.append(line)
                    if scan_data and not scan_data.get("running"):
                        process.terminate()
                        return "".join(stdout_list), "Stopped"
            
            stdout = "".join(stdout_list)
            _, stderr = process.communicate()
            
            if output_file and stdout:
                with open(output_file, "w") as f:
                    f.write(stdout)
            
            return stdout, stderr
        except Exception as e:
            return "", str(e)

    def start_recon(self, target, scan_data):
        start_time = time.time()
        print(f"[+] Iniciando Recon Profissional para: {target}")
        self.notify_discord(f"🚀 **INICIANDO RECON PROFISSIONAL**\nAlvo: `{target}`", "INFO")
        
        # --- PASSO 1: RECON (Amass) ---
        print("[*] Passo 1: Enumerando subdomínios (Amass)...")
        subdomains_file = f"{self.results_dir}/subdomains.txt"
        self.run_command(f"amass enum -d {target} -passive -o {subdomains_file}", scan_data=scan_data)
        
        # --- PASSO 2: PROBING (httpx) ---
        print("[*] Passo 2: Validando hosts vivos e tecnologias (httpx)...")
        alive_file = f"{self.results_dir}/alive.txt"
        stdout, _ = self.run_command(f"httpx -l {subdomains_file} -td -status-code -title -silent", output_file=alive_file, scan_data=scan_data)
        
        for line in stdout.splitlines():
            scan_data["subdomains"].append(line)
        
        self.notify_discord(f"🌐 **Hosts Vivos Encontrados:** `{len(scan_data['subdomains'])}`", "INFO")

        # --- PASSO 3: DISCOVERY (Katana & Gau) ---
        print("[*] Passo 3: Explorando conteúdo e histórico (Katana & Gau)...")
        urls_file = f"{self.results_dir}/urls.txt"
        self.run_command(f"katana -l {alive_file} -jc -kf all -d 3 -silent -o {self.results_dir}/katana_urls.txt", scan_data=scan_data)
        self.run_command(f"gau {target} --subs --o {self.results_dir}/gau_urls.txt", scan_data=scan_data)
        
        self.run_command(f"cat {self.results_dir}/katana_urls.txt {self.results_dir}/gau_urls.txt | sort -u > {urls_file}", scan_data=scan_data)
        
        with open(urls_file, "r") as f:
            for i, line in enumerate(f):
                if i > 500: break # Limite para o painel não travar
                scan_data["urls"].append(line.strip())

        # --- PASSO 4: VULNERABILIDADES ---
        print("[*] Passo 4: Varredura de vulnerabilidades (Nuclei)...")
        nuclei_cmd = f"nuclei -l {alive_file} -severity low,medium,high,critical -json -silent"
        stdout, _ = self.run_command(nuclei_cmd, scan_data=scan_data)
        
        for line in stdout.splitlines():
            try:
                vuln = json.loads(line)
                info = vuln.get("info", {})
                severity = info.get("severity", "INFO").upper()
                name = info.get("name")
                matched = vuln.get("matched-at")
                
                # Filtro Inteligente para LOW (Ignorar headers chatos)
                if severity == "LOW":
                    ignore_keywords = ["header", "missing", "cookie", "secure", "httponly", "x-content", "nosniff"]
                    if any(x in name.lower() for x in ignore_keywords):
                        continue
                
                scan_data["vulns"].append({
                    "name": name,
                    "severity": severity,
                    "target": matched
                })
                
                msg = f"🚨 **VULNERABILIDADE DETECTADA!**\n**Nome:** `{name}`\n**Alvo:** `{matched}`"
                self.notify_discord(msg, severity)
            except:
                continue

        # 4.2 403 Bypass
        print("[*] Passo 5: Testando 403 Bypasses...")
        with open(alive_file, "r") as f:
            for line in f:
                if "403" in line:
                    url = line.split()[0]
                    bypasser = Bypass403(url)
                    results = bypasser.run()
                    for res in results:
                        scan_data["vulns"].append({
                            "name": f"403 Bypass: {res['type']}",
                            "severity": "HIGH",
                            "target": url
                        })
                        self.notify_discord(f"🔓 **403 BYPASS DETECTADO!**\nAlvo: `{url}`\nTécnica: `{res['type']}`", "HIGH")

        duration = round((time.time() - start_time) / 60, 2)
        print(f"[+] Recon finalizado em {duration} minutos.")
        self.notify_discord(f"✅ **RECON FINALIZADO**\nAlvo: `{target}`\nDuração: `{duration} min`", "INFO")
