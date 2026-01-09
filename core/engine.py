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
            print(f"⚙️ Executando: {cmd.split()[0]}")
            process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
            
            stdout_list = []
            for line in iter(process.stdout.readline, ""):
                if not scan_data.get("running"):
                    process.terminate()
                    break
                
                line_clean = line.strip()
                if line_clean:
                    stdout_list.append(line)
                    # Enviar progresso real para o painel se for algo relevante
                    if any(x in line_clean.lower() for x in ["found", "http", "vuln", "target"]):
                        print(f"  > {line_clean[:100]}")
            
            process.wait()
            stdout = "".join(stdout_list)
            
            if output_file and stdout:
                with open(output_file, "w") as f:
                    f.write(stdout)
            
            return stdout, ""
        except Exception as e:
            print(f"❌ Erro: {str(e)}")
            return "", str(e)

    def start_recon(self, target, scan_data):
        while True:
            if not scan_data.get("running"):
                print("🛑 Recon interrompido pelo usuário.")
                break
                
            start_time = time.time()
            print(f"🚀 Iniciando Ciclo de Recon: {target}")
            self.notify_discord(f"🚀 **INICIANDO CICLO DE RECON**\nAlvo: `{target}`", "INFO")
            
            # --- PASSO 1: RECON (Subfinder & Assetfinder) ---
            print("🔍 Buscando subdomínios...")
            subdomains_file = f"{self.results_dir}/subdomains.txt"
            self.run_command(f"/usr/local/bin/subfinder -d {target} -silent > {subdomains_file}", scan_data=scan_data)
            self.run_command(f"/usr/local/bin/assetfinder --subs-only {target} >> {subdomains_file}", scan_data=scan_data)
            self.run_command(f"sort -u {subdomains_file} -o {subdomains_file}", scan_data=scan_data)
        
            # --- PASSO 2: PROBING (httpx) ---
            print("🌐 Validando hosts vivos...")
            alive_file = f"{self.results_dir}/alive.txt"
            stdout, _ = self.run_command(f"/usr/local/bin/httpx -l {subdomains_file} -td -status-code -title -silent", output_file=alive_file, scan_data=scan_data)
        
            if stdout:
                for line in stdout.splitlines():
                    if line.strip() and line not in scan_data["subdomains"]:
                        scan_data["subdomains"].append(line.strip())
            
            self.notify_discord(f"🌐 **Hosts Vivos Encontrados:** `{len(scan_data['subdomains'])}`", "INFO")

            # --- PASSO 3: DISCOVERY (Katana & Gau) ---
            if os.path.exists(alive_file) and os.path.getsize(alive_file) > 0:
                print("📂 Mapeando URLs e endpoints...")
                urls_file = f"{self.results_dir}/urls.txt"
                self.run_command(f"/usr/local/bin/katana -l {alive_file} -jc -kf all -d 3 -silent -o {self.results_dir}/katana_urls.txt", scan_data=scan_data)
                self.run_command(f"/usr/local/bin/gau {target} --subs --o {self.results_dir}/gau_urls.txt", scan_data=scan_data)
                
                self.run_command(f"cat {self.results_dir}/katana_urls.txt {self.results_dir}/gau_urls.txt | sort -u > {urls_file}", scan_data=scan_data)
                
                if os.path.exists(urls_file):
                    with open(urls_file, "r") as f:
                        for i, line in enumerate(f):
                            if i > 500: break 
                            url = line.strip()
                            if url and url not in scan_data["urls"]:
                                scan_data["urls"].append(url)

            # --- PASSO 4: VULNERABILIDADES ---
            if os.path.exists(alive_file) and os.path.getsize(alive_file) > 0:
                print("🛡️ Analisando vulnerabilidades...")
                nuclei_cmd = f"/usr/local/bin/nuclei -l {alive_file} -severity low,medium,high,critical -json -silent"
                stdout, _ = self.run_command(nuclei_cmd, scan_data=scan_data)
                
                if stdout:
                    for line in stdout.splitlines():
                        try:
                            vuln = json.loads(line)
                            info = vuln.get("info", {})
                            severity = info.get("severity", "INFO").upper()
                            name = info.get("name")
                            matched = vuln.get("matched-at")
                            
                            if severity == "LOW":
                                ignore_keywords = ["header", "missing", "cookie", "secure", "httponly", "x-content", "nosniff"]
                                if any(x in name.lower() for x in ignore_keywords):
                                    continue
                            
                            vuln_entry = {"name": name, "severity": severity, "target": matched}
                            if vuln_entry not in scan_data["vulns"]:
                                scan_data["vulns"].append(vuln_entry)
                                self.notify_discord(f"🚨 **VULNERABILIDADE DETECTADA!**\n**Nome:** `{name}`\n**Alvo:** `{matched}`", severity)
                        except:
                            continue

                # 4.2 403 Bypass
                print("🔓 Testando bypass de 403...")
                with open(alive_file, "r") as f:
                    for line in f:
                        if "403" in line:
                            url = line.split()[0]
                            bypasser = Bypass403(url)
                            results = bypasser.run()
                            for res in results:
                                vuln_entry = {"name": f"403 Bypass: {res['type']}", "severity": "HIGH", "target": url}
                                if vuln_entry not in scan_data["vulns"]:
                                    scan_data["vulns"].append(vuln_entry)
                                    self.notify_discord(f"🔓 **403 BYPASS DETECTADO!**\nAlvo: `{url}`\nTécnica: `{res['type']}`", "HIGH")

            duration = round((time.time() - start_time) / 60, 2)
            print(f"✅ Ciclo finalizado em {duration} min. Reiniciando em 30 segundos...")
            self.notify_discord(f"✅ **CICLO FINALIZADO**\nAlvo: `{target}`\nDuração: `{duration} min`", "INFO")
            
            # Pausa entre ciclos
            for _ in range(30):
                if not scan_data.get("running"): break
                time.sleep(1)
