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
        self.bin_path = "/home/ubuntu/go/bin"
        os.makedirs(self.results_dir, exist_ok=True)
        # Garantir que o path do Go esteja no ambiente
        os.environ["PATH"] += os.pathsep + self.bin_path

    def notify_discord(self, message, severity="INFO"):
        if not self.discord_webhook:
            return
        
        colors = {
            "CRITICAL": 15158332, # Vermelho
            "HIGH": 15105536,     # Laranja
            "MEDIUM": 15844367,   # Amarelo
            "LOW": 3447003,       # Azul
            "INFO": 9807270       # Cinza
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
        except Exception as e:
            print(f"Error sending notification: {e}")

    def run_command(self, cmd, output_file=None):
        try:
            print(f"[*] Executing: {cmd}")
            process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            stdout, stderr = process.communicate()
            
            if output_file and stdout:
                with open(output_file, "w") as f:
                    f.write(stdout)
            
            return stdout, stderr
        except Exception as e:
            return "", str(e)

    def start_recon(self, target):
        start_time = time.time()
        self.notify_discord(f"🚀 **INICIANDO RECON PROFISSIONAL**\nAlvo: `{target}`", "INFO")
        
        # --- PASSO 1: RECON (Amass) ---
        print(f"[*] Enumerating subdomains with Amass for {target}...")
        subdomains_file = f"{self.results_dir}/subdomains.txt"
        self.run_command(f"amass enum -d {target} -passive -o {subdomains_file}")
        
        # --- PASSO 2: PROBING (httpx) ---
        print(f"[*] Probing alive hosts and detecting technologies...")
        alive_file = f"{self.results_dir}/alive.txt"
        # httpx com tech detection e status codes
        stdout, _ = self.run_command(f"httpx -l {subdomains_file} -td -status-code -title -silent", output_file=alive_file)
        
        # Notificar hosts vivos encontrados
        alive_count = len(stdout.splitlines())
        self.notify_discord(f"🌐 **Hosts Vivos Encontrados:** `{alive_count}`", "INFO")

        # --- PASSO 3: DISCOVERY (Katana & Gau) ---
        print(f"[*] Exploring content with Katana and Gau...")
        urls_file = f"{self.results_dir}/urls.txt"
        # Katana para crawling ativo
        self.run_command(f"katana -l {alive_file} -jc -kf all -d 3 -silent -o {self.results_dir}/katana_urls.txt")
        # Gau para histórico passivo
        self.run_command(f"gau {target} --subs --o {self.results_dir}/gau_urls.txt")
        
        # Merge e Unique URLs
        self.run_command(f"cat {self.results_dir}/katana_urls.txt {self.results_dir}/gau_urls.txt | sort -u > {urls_file}")
        
        # --- PASSO 4: ANALYSIS & VULNERABILITIES ---
        
        # 4.1 JS Analysis (Secrets & Endpoints)
        print(f"[*] Analyzing JS files for secrets...")
        js_files = f"{self.results_dir}/js_links.txt"
        self.run_command(f"grep '\.js' {urls_file} > {js_files}")
        # Aqui poderíamos integrar uma ferramenta específica de JS, mas o Nuclei já faz muito disso.

        # 4.2 403 Bypass
        print(f"[*] Testing 403 Bypasses...")
        with open(alive_file, "r") as f:
            for line in f:
                if "403" in line:
                    url = line.split()[0]
                    bypasser = Bypass403(url)
                    results = bypasser.run()
                    for res in results:
                        self.notify_discord(f"🔓 **403 BYPASS DETECTADO!**\nAlvo: `{url}`\nTécnica: `{res['type']}`\nPayload: `{res['payload']}`", "HIGH")

        # 4.3 Nuclei (Vulnerability Scanning)
        print(f"[*] Running Nuclei for Low/Medium/High/Critical vulnerabilities...")
        # Rodando nuclei com foco em vulnerabilidades reais, excluindo info/headers chatos
        nuclei_cmd = f"nuclei -l {alive_file} -severity low,medium,high,critical -json -silent"
        stdout, _ = self.run_command(nuclei_cmd)
        
        for line in stdout.splitlines():
            try:
                vuln = json.loads(line)
                info = vuln.get("info", {})
                severity = info.get("severity", "INFO").upper()
                name = info.get("name")
                matched = vuln.get("matched-at")
                description = info.get("description", "Sem descrição disponível.")
                
                # Filtro para evitar "headers" chatos no Low
                if severity == "LOW" and any(x in name.lower() for x in ["header", "missing", "cookie"]):
                    continue
                
                msg = f"🚨 **VULNERABILIDADE DETECTADA!**\n**Nome:** `{name}`\n**Alvo:** `{matched}`\n**Descrição:** {description}"
                self.notify_discord(msg, severity)
            except:
                continue

        end_time = time.time()
        duration = round((end_time - start_time) / 60, 2)
        self.notify_discord(f"✅ **RECON FINALIZADO**\nAlvo: `{target}`\nDuração: `{duration} min`", "INFO")
