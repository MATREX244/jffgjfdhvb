#!/bin/bash

echo "🛠️ Instalando Dependências do Manus-Recon-Elite (Nativo Kali)..."

# 1. Atualizar Sistema
sudo apt update

# 2. Instalar Python e Go
sudo apt install -y python3 python3-pip golang git curl

# 3. Instalar Ferramentas da ProjectDiscovery (Padrão de Elite)
echo "🚀 Instalando ferramentas de Recon..."
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
go install -v github.com/projectdiscovery/katana/cmd/katana@latest

# Mover binários do Go para o PATH
sudo cp ~/go/bin/* /usr/local/bin/

# 4. Instalar dependências Python
pip3 install flask requests

echo "✅ Instalação concluída! Use 'python3 web/app.py' para iniciar o painel."
