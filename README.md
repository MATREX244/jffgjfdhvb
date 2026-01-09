# 🛡️ BUG HUNTER ELITE - AUTOMATION FRAMEWORK

Este é um framework profissional de automação para Bug Bounty, desenvolvido para hunters que buscam escala e precisão. Ele integra as melhores ferramentas do mercado para transformar reconhecimento em vulnerabilidades reais.

## 🚀 Fluxo de Trabalho (Workflow)

1.  **O Teste de Vida (Probing):** Utiliza `Amass` para descoberta passiva e `httpx` para validar hosts vivos, identificar tecnologias (WordPress, PHP, etc.) e status codes.
2.  **A Exploração de Conteúdo (Discovery):** Robôs `Katana` e `Gau` realizam crawling ativo e busca em históricos (Wayback) para mapear todas as páginas, arquivos JS, APIs e parâmetros.
3.  **Análise de Vulnerabilidades:**
    *   **JS Analysis:** Busca por segredos e endpoints em arquivos JavaScript.
    *   **Nuclei:** Varredura completa para bugs conhecidos (Low, Medium, High, Critical).
    *   **403 Bypass:** Tentativas automatizadas de burlar acessos negados.
4.  **Alertas em Tempo Real:** Notificações diretas no seu Discord via Webhook.

## 🛠️ Instalação

```bash
# Clone o repositório
git clone https://github.com/MATREX244/jffgjfdhvb.git
cd jffgjfdhvb

# Execute a instalação (Instala Go, Python e todas as ferramentas de elite)
chmod +x install.sh
./install.sh
```

## ⚙️ Configuração

O Webhook do Discord já vem pré-configurado no `core/engine.py`, mas você pode alterá-lo se necessário:

```python
# core/engine.py
self.discord_webhook = "SEU_WEBHOOK_AQUI"
```

## 💻 Como Rodar

Inicie o painel web para gerenciar seus alvos:

```bash
python3 web/app.py
```

Acesse no seu navegador: `http://localhost:5000`

## ✨ Funcionalidades Profissionais

*   **Recon Massivo:** Amass, Httpx.
*   **Discovery Avançado:** Katana (Crawling) e Gau (Histórico).
*   **Deteção de Bugs:** Nuclei com filtros inteligentes (foco em vulnerabilidades reais, sem spam de headers).
*   **403 Bypass:** Módulo dedicado para testar falhas de controle de acesso.
*   **Notificações:** Alertas categorizados por severidade no Discord.

---
*Desenvolvido para Bug Hunters de 6 dígitos.*
