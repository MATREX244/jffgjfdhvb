#!/bin/bash

echo "🛠️ Instalando Dependências do BUG HUNTER ELITE (Nativo Kali)..."

# 1. Atualizar Sistema (Removendo repositórios problemáticos)
sudo sed -i '/docker/d' /etc/apt/sources.list /etc/apt/sources.list.d/* 2>/dev/null
sudo apt update

# 2. Instalar Python e Go
sudo apt install -y python3 python3-pip golang git curl python3-venv

# 3. Instalar Ferramentas via Go (Usando binários pré-compilados quando possível ou garantindo PATH)
echo "🚀 Instalando ferramentas de Recon..."
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin

# Função para instalar ferramentas com segurança
install_go_tool() {
    echo "[*] Instalando $1..."
    go install -v $2@latest
}

install_go_tool "subfinder" "github.com/projectdiscovery/subfinder/v2/cmd/subfinder"
install_go_tool "httpx" "github.com/projectdiscovery/httpx/cmd/httpx"
install_go_tool "nuclei" "github.com/projectdiscovery/nuclei/v3/cmd/nuclei"
install_go_tool "katana" "github.com/projectdiscovery/katana/cmd/katana"
install_go_tool "amass" "github.com/owasp-amass/amass/v4/...@latest"
install_go_tool "gau" "github.com/lc/gau/v2/cmd/gau"

# Mover binários do Go para o PATH do sistema para facilitar o uso
sudo cp $HOME/go/bin/* /usr/local/bin/ 2>/dev/null

# 4. Instalar dependências Python (Usando --break-system-packages para Kali ou venv)
echo "📦 Instalando dependências Python..."
pip3 install flask requests --break-system-packages 2>/dev/null || pip3 install flask requests

echo "✅ Instalação concluída! Use 'python3 web/app.py' para iniciar o painel."
