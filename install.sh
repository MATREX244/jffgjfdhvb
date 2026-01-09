#!/bin/bash

echo "🛠️ Instalando Dependências do BUG HUNTER ELITE (Modo Ultra Rápido)..."

# 1. Limpeza de Repositórios e Atualização
sudo sed -i '/docker/d' /etc/apt/sources.list /etc/apt/sources.list.d/* 2>/dev/null
sudo apt update

# 2. Instalar Dependências Básicas
sudo apt install -y python3 python3-pip git curl wget unzip

# 3. Instalar Ferramentas da ProjectDiscovery via PDTM (Binários Oficiais)
echo "🚀 Baixando binários oficiais (Sem compilação)..."
curl -sL https://raw.githubusercontent.com/projectdiscovery/pdtm/main/install.sh | bash
source ~/.bashrc
export PATH=$PATH:$HOME/.pdtm/go/bin

# Instalar ferramentas via pdtm
~/.pdtm/go/bin/pdtm -i subfinder,httpx,nuclei,katana

# 4. Instalar Amass e Gau (Binários Oficiais)
echo "📦 Instalando Amass e Gau..."

# Amass
AMASS_VER="v4.2.0"
wget https://github.com/owasp-amass/amass/releases/download/${AMASS_VER}/amass_linux_amd64.zip
unzip amass_linux_amd64.zip
sudo mv amass_linux_amd64/amass /usr/local/bin/
rm -rf amass_linux_amd64*

# Gau
GAU_VER="2.2.1"
wget https://github.com/lc/gau/releases/download/v${GAU_VER}/gau_${GAU_VER}_linux_amd64.tar.gz
tar -xvf gau_${GAU_VER}_linux_amd64.tar.gz
sudo mv gau /usr/local/bin/
rm gau_${GAU_VER}_linux_amd64.tar.gz

# Mover binários do pdtm para /usr/local/bin para garantir acesso global
sudo cp $HOME/.pdtm/go/bin/* /usr/local/bin/ 2>/dev/null

# 5. Instalar dependências Python
echo "🐍 Instalando dependências Python..."
pip3 install flask requests --break-system-packages --quiet 2>/dev/null || pip3 install flask requests --quiet

echo "✅ TUDO PRONTO! O erro de compilação foi eliminado."
echo "🚀 Use 'python3 web/app.py' para iniciar."
