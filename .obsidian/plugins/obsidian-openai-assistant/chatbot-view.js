const { ItemView, Notice } = require('obsidian');

class ChatbotView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
        this.messages = [];
        this.vaultUnderstanding = 0;
    }

    getViewType() {
        return "obsidian-openai-assistant-chatbot";
    }

    getDisplayText() {
        return "Assistente IA";
    }

    getIcon() {
        return "message-square";
    }

    async onOpen() {
        this.contentEl.empty();
        this.contentEl.addClass("obsidian-openai-assistant-chatbot-view");
        
        // Container principal
        const container = this.contentEl.createDiv({ cls: "chatbot-container" });
        
        // Área de mensagens
        this.messagesContainer = container.createDiv({ cls: "chatbot-messages" });
        
        // Área de entrada
        const inputContainer = container.createDiv({ cls: "chatbot-input-container" });
        
        this.inputField = inputContainer.createEl("textarea", { 
            cls: "chatbot-input", 
            attr: { placeholder: "Digite sua mensagem aqui..." } 
        });
        
        this.inputField.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        const buttonContainer = inputContainer.createDiv({ cls: "chatbot-button-container" });
        
        const sendButton = buttonContainer.createEl("button", { 
            cls: "chatbot-send-button", 
            text: "Enviar" 
        });
        
        sendButton.addEventListener("click", () => {
            this.sendMessage();
        });

        // Mensagem de boas-vindas
        await this.addBotMessage({
            content: "Olá! Sou AI Vault, seu especialista em otimização de vault Obsidian. Vou guiá-lo através de uma avaliação sistemática do seu setup atual antes de fazer recomendações. Vamos começar.",
            type: "text"
        });

        // Adicionar barra de progresso
        await this.addProgressMessage("Vault Understanding", 10);

        // Primeira pergunta
        await this.addBotMessage({
            content: "Qual é o propósito principal do seu vault Obsidian?\n(ex., pesquisa acadêmica, gerenciamento de projetos, gestão de conhecimento pessoal, escrita criativa, etc.)",
            type: "text"
        });
    }

    async sendMessage() {
        const message = this.inputField.value.trim();
        if (!message) return;

        await this.addUserMessage(message);
        this.inputField.value = "";

        // Simular processamento
        await this.simulateTyping();
        
        // Aumentar compreensão do vault
        this.vaultUnderstanding += 10;
        if (this.vaultUnderstanding > 100) this.vaultUnderstanding = 100;
        
        // Atualizar barra de progresso
        await this.updateProgressMessage("Vault Understanding", this.vaultUnderstanding);

        // Processar mensagem (aqui implementaremos a integração com a OpenAI)
        await this.processUserMessage(message);
    }

    async processUserMessage(message) {
        // No futuro, aqui chamaremos a API da OpenAI para processar a mensagem
        // Por enquanto, vamos simular respostas com base em palavras-chave
        
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes("negócio") || lowerMessage.includes("empresa") || lowerMessage.includes("business")) {
            // Resposta para propósito de negócios, como na imagem
            await this.addBotMessage({
                content: "Ótimo! Seu vault está focado em System Sculpt, abrangendo tudo relacionado aos seus dados de negócios. Para aprofundar meu entendimento:",
                type: "text"
            });
            
            await this.updateProgressMessage("Vault Understanding", 20);
            
            await this.addBotMessage({
                content: "Como você descreveria seu sistema organizacional atual?",
                type: "text"
            });
            
            // Adicionar subperguntas como na imagem
            await this.addBotMessage({
                content: "• Você já usa pastas, tags, links, templates?",
                type: "subquestion"
            });
            
            await this.addBotMessage({
                content: "• Pode descrever convenções de nomenclatura ou agrupamentos de pastas existentes?",
                type: "subquestion"
            });
            
            await this.addBotMessage({
                content: "• Como você separa diferentes áreas (ex., roadmap vs. dados de clientes vs. ideias de conteúdo)?",
                type: "subquestion"
            });
        } 
        else if (lowerMessage.includes("pessoal") || lowerMessage.includes("conhecimento")) {
            await this.addBotMessage({
                content: "Entendi que você usa o vault para gestão de conhecimento pessoal. Vamos otimizar sua estrutura para facilitar conexões entre informações e recuperação rápida.",
                type: "text"
            });
            
            await this.updateProgressMessage("Vault Understanding", 20);
            
            await this.addBotMessage({
                content: "Você prefere uma organização mais baseada em categorias (pastas) ou em conexões (links e tags)?",
                type: "text"
            });
        }
        else if (lowerMessage.includes("criar") || lowerMessage.includes("nova")) {
            if (lowerMessage.includes("pasta")) {
                await this.addBotMessage({
                    content: "Vou ajudá-lo a criar uma nova pasta. Por favor, informe o nome da pasta e onde deseja criá-la.",
                    type: "text"
                });
            } 
            else if (lowerMessage.includes("nota")) {
                await this.addBotMessage({
                    content: "Vou ajudá-lo a criar uma nova nota. Qual seria o título e que tipo de conteúdo você gostaria de incluir?",
                    type: "text"
                });
            }
        }
        else {
            await this.addBotMessage({
                content: "Entendi. Precisamos processar essa informação para otimizar seu vault. Você pode me falar mais sobre como você utiliza o Obsidian atualmente?",
                type: "text"
            });
        }
    }

    async simulateTyping() {
        const typingIndicator = this.messagesContainer.createDiv({ cls: "typing-indicator" });
        
        for (let i = 0; i < 3; i++) {
            typingIndicator.createDiv({ cls: "typing-dot" });
        }
        
        // Simular um pequeno atraso
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        typingIndicator.remove();
    }

    async addUserMessage(content) {
        const message = {
            role: "user",
            content: content,
            timestamp: new Date()
        };
        
        this.messages.push(message);
        this.renderMessage(message);
    }

    async addBotMessage(data) {
        const message = {
            role: "bot",
            content: data.content,
            type: data.type || "text",
            timestamp: new Date()
        };
        
        this.messages.push(message);
        this.renderMessage(message);
    }

    async addProgressMessage(label, percentage) {
        const message = {
            role: "system",
            type: "progress",
            label: label,
            percentage: percentage,
            timestamp: new Date()
        };
        
        this.messages.push(message);
        this.renderProgressBar(message);
    }

    async updateProgressMessage(label, percentage) {
        // Encontrar a mensagem de progresso existente e atualizar
        const progressMessage = this.messagesContainer.querySelector(
            `.progress-container[data-label="${label}"] .progress-bar`
        );
        
        if (progressMessage) {
            progressMessage.style.width = `${percentage}%`;
            
            const percentText = this.messagesContainer.querySelector(
                `.progress-container[data-label="${label}"] .progress-percent`
            );
            
            if (percentText) {
                percentText.textContent = `${percentage}%`;
            }
            
            // Atualizar no array de mensagens também
            const msgIndex = this.messages.findIndex(
                m => m.type === "progress" && m.label === label
            );
            
            if (msgIndex >= 0) {
                this.messages[msgIndex].percentage = percentage;
            }
        }
    }

    renderMessage(message) {
        const messageEl = this.messagesContainer.createDiv({
            cls: `chatbot-message ${message.role}-message`
        });
        
        if (message.role === "bot" && message.type === "subquestion") {
            messageEl.addClass("subquestion");
        }
        
        const contentEl = messageEl.createDiv({
            cls: "message-content",
            text: message.content
        });
        
        // Scroll para o final
        this.messagesContainer.scrollTo({
            top: this.messagesContainer.scrollHeight,
            behavior: "smooth"
        });
    }

    renderProgressBar(message) {
        const containerEl = this.messagesContainer.createDiv({
            cls: "progress-container"
        });
        
        containerEl.setAttribute("data-label", message.label);
        
        const labelEl = containerEl.createDiv({
            cls: "progress-label",
            text: message.label + ": "
        });
        
        const percentEl = labelEl.createSpan({
            cls: "progress-percent",
            text: `${message.percentage}%`
        });
        
        const progressWrapperEl = containerEl.createDiv({
            cls: "progress-wrapper"
        });
        
        const progressBarEl = progressWrapperEl.createDiv({
            cls: "progress-bar"
        });
        
        progressBarEl.style.width = `${message.percentage}%`;
        
        // Scroll para o final
        this.messagesContainer.scrollTo({
            top: this.messagesContainer.scrollHeight,
            behavior: "smooth"
        });
    }
}

module.exports = ChatbotView;
