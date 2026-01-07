# 🛡️ Manus-Recon-Elite: Python Edition (Nativo Kali)

Esta é a versão nativa do Manus-Recon-Elite, reconstruída em Python para rodar diretamente no seu Kali Linux sem a necessidade de Docker.

## 🚀 Como Instalar

1.  **Dê permissão ao instalador:**
    ```bash
    chmod +x install.sh
    ```
2.  **Execute a instalação:**
    ```bash
    ./install.sh
    ```

## ⚙️ Configuração

Edite o arquivo `core/engine.py` ou defina a variável de ambiente:
```bash
export DISCORD_WEBHOOK_URL="seu_webhook_aqui"
```

## 🖥️ Como Rodar

Inicie o servidor web:
```bash
python3 web/app.py
```
Acesse no seu navegador: `http://localhost:5000`

## 🎯 Funcionalidades
- **Recon Massivo**: Subfinder, Httpx, Katana.
- **Detecção de Bugs**: Nuclei (Filtro Medium, High, Critical).
- **Notificações**: Alertas em tempo real no Discord.
- **Nativo**: Roda direto no seu localhost.
