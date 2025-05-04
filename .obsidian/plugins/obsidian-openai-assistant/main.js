const { Modal, Plugin, Notice, ItemView, WorkspaceLeaf, Setting, TFolder, TFile } = require('obsidian');

// Definir constante para o tipo de view
const CHATBOT_VIEW_TYPE = 'obsidian-openai-assistant-chatbot';

// Classe principal do plugin
// IMPORTANTE: A classe principal do plugin deve ser exportada
class OpenAIAssistantPlugin extends Plugin {
    conversations = [];
    conversationsFolder = 'conversas_ia';
    async onload() {
        console.log('Carregando plugin OpenAI Assistant');
        
        try {
            // Carregar configurações salvas
            this.settings = Object.assign({}, {
                apiKey: '',
                model: 'gpt-4.1',
                temperature: 0.13,
                maxTokens: 5000
            }, await this.loadData());
            
            // Registrar o tipo de view do chatbot
            this.registerView(
                CHATBOT_VIEW_TYPE,
                (leaf) => new ChatbotView(leaf, this)
            );
            
            // Adicionar comando para abrir o chatbot
            this.addCommand({
                id: 'openai-assistant-open-chatbot',
                name: 'Abrir Assistente com AI',
                callback: () => {
                    this.activateChatbotView();
                }
            });
            
            // Adicionar comando para gerenciar conversas salvas
            this.addCommand({
                id: 'openai-assistant-list-conversations',
                name: 'Listar Conversas do Assistente',
                callback: () => {
                    this.openConversationsList();
                }
            });
            
            // Adicionar ícone na barra lateral para o chatbot
            this.addRibbonIcon('message-square', 'Assistente IA', () => {
                this.activateChatbotView();
            });
            
            // Adicionar comando de teste para verificar funcionamento
            this.addCommand({
                id: 'openai-assistant-test',
                name: 'Testar OpenAI Assistant',
                callback: () => {
                    new Notice('Plugin OpenAI Assistant está funcionando!', 3000);
                }
            });
            
            // Adicionar configurações do plugin
            this.addSettingTab(new OpenAIAssistantSettingTab(this.app, this));
            
            console.log('Plugin OpenAI Assistant carregado com sucesso');
        } catch (error) {
            console.error('Erro ao carregar plugin OpenAI Assistant:', error);
        }
    }
    
    async activateChatbotView() {
        const { workspace } = this.app;

        // Verificar se a view já está aberta
        let leaf = workspace.getLeavesOfType(CHATBOT_VIEW_TYPE)[0];

        if (!leaf) {
            // Criar uma nova folha no lado direito
            leaf = workspace.getRightLeaf(false);
            await leaf.setViewState({
                type: CHATBOT_VIEW_TYPE,
                active: true
            });
        }

        // Focar na folha do chatbot
        workspace.revealLeaf(leaf);
    }
    
    // Método para chamar a API da OpenAI
    async callOpenAI(messages) {
        try {
            // Se não temos uma chave de API, solicitar ao usuário
            if (!this.settings.apiKey) {
                const apiKey = await this.requestApiKey();
                if (!apiKey) {
                    throw new Error("Chave de API não fornecida");
                }
                // Armazena temporariamente na sessão
                this.settings.apiKey = apiKey;
            }

            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.settings.apiKey}`
                },
                body: JSON.stringify({
                    model: this.settings.model,
                    messages: messages,
                    temperature: this.settings.temperature,
                    max_tokens: this.settings.maxTokens
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || "Erro ao chamar a API da OpenAI");
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error("Erro ao chamar a API da OpenAI:", error);
            throw error;
        }
    }

    // Método para solicitar a chave de API ao usuário
    requestApiKey() {
        return new Promise((resolve) => {
            const modal = new ApiKeyModal(this.app, this, (apiKey) => {
                resolve(apiKey);
            });
            modal.open();
        });
    }

    // Método para limpar a chave API quando o chatbot for fechado
    clearApiKey() {
        this.settings.apiKey = '';
        console.log("Chave API removida da memória por questões de segurança");
    }
    
    // Cria uma pasta no vault
    async createFolder(folderPath) {
        try {
            // Verificar se já existe
            const existingFolder = this.app.vault.getAbstractFileByPath(folderPath);
            if (existingFolder instanceof TFolder) {
                return { success: true, message: `A pasta ${folderPath} já existe.` };
            }
            
            // Verificar se precisamos criar pastas pai
            const pathParts = folderPath.split('/');
            let currentPath = '';
            
            // Criar cada nível de pasta se necessário
            for (let i = 0; i < pathParts.length; i++) {
                if (pathParts[i]) {
                    if (currentPath) currentPath += '/';
                    currentPath += pathParts[i];
                    
                    const folderExists = this.app.vault.getAbstractFileByPath(currentPath);
                    if (!(folderExists instanceof TFolder)) {
                        await this.app.vault.createFolder(currentPath);
                        console.log(`Pasta criada: ${currentPath}`);
                    }
                }
            }
            
            return { success: true, message: `Pasta ${folderPath} criada com sucesso.` };
        } catch (error) {
            console.error("Erro ao criar pasta:", error);
            return { success: false, message: `Erro ao criar pasta: ${error.message}` };
        }
    }
    
    // Cria uma nota com conteúdo
    async createNote(notePath, content, openAfterCreate = true) {
        try {
            // Verificar se a nota já existe
            const existingNote = this.app.vault.getAbstractFileByPath(notePath);
            if (existingNote instanceof TFile) {
                return { success: false, message: `A nota ${notePath} já existe.` };
            }
            
            // Verificar a pasta pai
            const lastSlashIndex = notePath.lastIndexOf('/');
            if (lastSlashIndex !== -1) {
                const folderPath = notePath.substring(0, lastSlashIndex);
                if (!this.app.vault.getAbstractFileByPath(folderPath)) {
                    // Criar pasta pai se não existir
                    await this.app.vault.createFolder(folderPath);
                }
            }
            
            // Criar a nota
            const newNote = await this.app.vault.create(notePath, content);
            
            // Abrir a nota se necessário
            if (openAfterCreate) {
                const leaf = this.app.workspace.getLeaf(false);
                await leaf.openFile(newNote);
            }
            
            return { success: true, message: `Nota ${notePath} criada com sucesso.` };
        } catch (error) {
            console.error("Erro ao criar nota:", error);
            return { success: false, message: `Erro ao criar nota: ${error.message}` };
        }
    }
    
    // Obtém uma lista de todas as pastas do vault para sugestões
    getAllFolders() {
        const folders = [];
        
        const processFolder = (folder, path = '') => {
            const folderPath = path ? `${path}/${folder.name}` : folder.name;
            folders.push(folderPath);
            
            if (folder.children) {
                for (const child of folder.children) {
                    if (child instanceof TFolder) {
                        processFolder(child, folderPath);
                    }
                }
            }
        };
        
        // Processar a pasta raiz
        processFolder(this.app.vault.getRoot());
        
        // Adicionar pastas padrão se não existirem na lista
        const defaultFolders = ['notas', 'anexos', 'templates', 'projetos'];
        for (const folder of defaultFolders) {
            if (!folders.includes(folder)) {
                folders.push(folder);
            }
        }
        
        return folders;
    }
    
    // Adiciona ou atualiza conteúdo em uma nota existente
    async updateExistingNote(notePath, newContent, appendMode = true) {
        try {
            const file = this.app.vault.getAbstractFileByPath(notePath);
            if (!(file instanceof TFile)) {
                return { success: false, message: `A nota ${notePath} não foi encontrada.` };
            }
            
            // Ler o conteúdo atual
            const currentContent = await this.app.vault.read(file);
            
            // Decidir como atualizar
            let updatedContent;
            if (appendMode) {
                // Adicionar no final
                updatedContent = currentContent + '\n\n' + newContent;
            } else {
                // Substituir
                updatedContent = newContent;
            }
            
            // Modificar a nota
            await this.app.vault.modify(file, updatedContent);
            
            return { success: true, message: `Nota ${notePath} atualizada com sucesso.` };
        } catch (error) {
            console.error("Erro ao atualizar nota:", error);
            return { success: false, message: `Erro ao atualizar nota: ${error.message}` };
        }
    }
    
    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        console.log('Descarregando plugin OpenAI Assistant');
        this.clearApiKey();
    }
    
    // Garantir que a pasta para salvar conversas exista
    async ensureConversationsFolder() {
        // Verificar se a pasta de conversas existe, se não, criar
        if (!this.app.vault.getAbstractFileByPath(this.conversationsFolder)) {
            try {
                await this.app.vault.createFolder(this.conversationsFolder);
                console.log(`Pasta ${this.conversationsFolder} criada para armazenar conversas.`);
            } catch (error) {
                console.error(`Erro ao criar pasta ${this.conversationsFolder}:`, error);
            }
        }
    }
    
    // Carregar lista de conversas salvas do sistema de arquivos
    async loadSavedConversationsList() {
        const folder = this.app.vault.getAbstractFileByPath(this.conversationsFolder);
        if (folder instanceof TFolder) {
            // Resetar a lista de conversas
            this.conversations = [];
            
            // Obter todos os arquivos .md na pasta de conversas
            for (const file of folder.children) {
                if (file instanceof TFile && file.extension === 'md') {
                    try {
                        // Ler os metadados da conversa do frontmatter
                        const content = await this.app.vault.read(file);
                        const conversation = this.parseConversationFile(content, file.path);
                        if (conversation) {
                            this.conversations.push(conversation);
                        }
                    } catch (error) {
                        console.error(`Erro ao ler conversa ${file.path}:`, error);
                    }
                }
            }
            
            console.log(`Carregadas ${this.conversations.length} conversas salvas.`);
        }
    }
    
    // Extrair metadados de uma conversa a partir do conteúdo do arquivo
    parseConversationFile(content, filePath) {
        // Tentar extrair metadados do frontmatter YAML
        const yamlRegex = /^---\n([\s\S]*?)\n---\n/;
        const match = content.match(yamlRegex);
        
        if (match) {
            try {
                // Extrair YAML frontmatter
                const yaml = match[1];
                const metadata = {};
                
                // Parse simples de YAML para extrair título e data
                const titleMatch = yaml.match(/title:\s*(.+)$/m);
                const dateMatch = yaml.match(/date:\s*(.+)$/m);
                
                if (titleMatch) metadata.title = titleMatch[1].trim();
                if (dateMatch) metadata.date = dateMatch[1].trim();
                
                // Extrair resumo, se existir
                const summaryMatch = content.match(/## Resumo\n\n(.+?)\n\n/s);
                if (summaryMatch) {
                    metadata.summary = summaryMatch[1].trim();
                }
                
                return {
                    id: filePath,
                    title: metadata.title || 'Conversa sem título',
                    date: metadata.date || new Date().toISOString(),
                    summary: metadata.summary || 'Sem resumo disponível',
                    path: filePath
                };
            } catch (error) {
                console.error(`Erro ao analisar metadados da conversa ${filePath}:`, error);
            }
        }
        
        // Se falhar em extrair os metadados, usar informações básicas
        const fileName = filePath.split('/').pop().replace('.md', '');
        return {
            id: filePath,
            title: fileName,
            date: new Date().toISOString(),
            summary: 'Metadados não disponíveis',
            path: filePath
        };
    }
    
    // Abrir modal com a lista de conversas salvas
    async openConversationsList() {
        // Atualizar lista de conversas antes de abrir o modal
        await this.loadSavedConversationsList();
        
        // Criar e abrir modal para escolher conversa
        const modal = new ConversationsListModal(this.app, this);
        modal.open();
    }
    
    // Carregar uma conversa específica
    async loadConversation(conversationPath) {
        try {
            const file = this.app.vault.getAbstractFileByPath(conversationPath);
            if (file instanceof TFile) {
                const content = await this.app.vault.read(file);
                return this.parseConversationContent(content);
            }
        } catch (error) {
            console.error(`Erro ao carregar conversa ${conversationPath}:`, error);
            return null;
        }
    }
    
    // Extrair mensagens da conversa a partir do conteúdo do arquivo
    parseConversationContent(content) {
        // Remover frontmatter YAML
        const contentWithoutYaml = content.replace(/^---\n[\s\S]*?\n---\n/, '');
        
        // Extrair mensagens do formato markdown
        const messages = [];
        const messageRegex = /### (Usuário|IA)\n\n(.+?)(?=\n\n### |$)/gs;
        
        let match;
        while ((match = messageRegex.exec(contentWithoutYaml)) !== null) {
            const role = match[1] === 'Usuário' ? 'user' : 'assistant';
            const content = match[2].trim();
            messages.push({ role, content });
        }
        
        return messages;
    }
    
    // Salvar conversa atual como arquivo markdown
    async saveConversation(messages, title = null) {
        if (!messages || messages.length === 0) {
            new Notice('Não há conversa para salvar.');
            return null;
        }
        
        try {
            // Gerar título automático se não fornecido
            if (!title) {
                // Usar timestamp como título padrão
                const date = new Date();
                title = `Conversa ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            }
            
            // Sanitizar título para nome de arquivo seguro
            const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_');
            const fileName = `${this.conversationsFolder}/${safeTitle}.md`;
            
            // Criar conteúdo markdown para a conversa
            let content = this.createConversationMarkdown(messages, title);
            
            // Verificar se o arquivo já existe
            const existingFile = this.app.vault.getAbstractFileByPath(fileName);
            if (existingFile) {
                // Gerar nome único adicionando timestamp
                const timestamp = Date.now();
                const newFileName = `${this.conversationsFolder}/${safeTitle}_${timestamp}.md`;
                await this.app.vault.create(newFileName, content);
                new Notice(`Conversa salva como ${safeTitle}_${timestamp}.md`);
                return newFileName;
            } else {
                // Criar novo arquivo
                await this.app.vault.create(fileName, content);
                new Notice(`Conversa salva como ${safeTitle}.md`);
                return fileName;
            }
            
        } catch (error) {
            console.error('Erro ao salvar conversa:', error);
            new Notice(`Erro ao salvar conversa: ${error.message}`);
            return null;
        }
    }
    
    // Criar conteúdo markdown para a conversa
    createConversationMarkdown(messages, title) {
        // Data formatada
        const date = new Date().toISOString();
        
        // Extrair primeiras mensagens para criar um resumo
        let summary = '';
        for (const msg of messages) {
            if (msg.role === 'assistant') {
                // Extrair primeiras 150 caracteres da primeira resposta do assistente
                summary = msg.content.substring(0, 150) + (msg.content.length > 150 ? '...' : '');
                break;
            }
        }
        
        // Criar frontmatter YAML
        let content = `---\ntitle: ${title}\ndate: ${date}\ntags: [conversa, ia]\n---\n\n`;
        
        // Adicionar resumo
        content += `## Resumo\n\n${summary || 'Sem resumo disponível'}\n\n`;
        
        // Adicionar conversas
        content += `## Conversa\n\n`;
        
        // Adicionar cada mensagem
        for (const msg of messages) {
            const role = msg.role === 'user' ? 'Usuário' : 'IA';
            content += `### ${role}\n\n${msg.content}\n\n`;
        }
        
        return content;
    }
    
    // Excluir uma conversa salva
    async deleteConversation(conversationPath) {
        try {
            const file = this.app.vault.getAbstractFileByPath(conversationPath);
            if (file instanceof TFile) {
                await this.app.vault.delete(file);
                new Notice(`Conversa excluída: ${file.basename}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`Erro ao excluir conversa ${conversationPath}:`, error);
            new Notice(`Erro ao excluir conversa: ${error.message}`);
            return false;
        }
    }
    
    // Excluir um arquivo do vault
    async deleteFile(filePath) {
        try {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!file) {
                return { success: false, message: `O arquivo ${filePath} não foi encontrado.` };
            }
            
            if (file instanceof TFile) {
                await this.app.vault.delete(file);
                new Notice(`Arquivo ${file.basename} excluído com sucesso.`);
                return { success: true, message: `Arquivo ${filePath} excluído com sucesso.` };
            } else if (file instanceof TFolder) {
                await this.app.vault.delete(file, true); // true para recursivamente deletar o conteúdo
                new Notice(`Pasta ${file.basename} e seu conteúdo excluídos com sucesso.`);
                return { success: true, message: `Pasta ${filePath} e seu conteúdo excluídos com sucesso.` };
            } else {
                return { success: false, message: `O caminho ${filePath} não é um arquivo ou pasta válido.` };
            }
        } catch (error) {
            console.error(`Erro ao excluir arquivo ${filePath}:`, error);
            new Notice(`Erro ao excluir arquivo: ${error.message}`);
            return { success: false, message: `Erro ao excluir arquivo: ${error.message}` };
        }
    }
    
    // Editar o conteúdo de um arquivo existente
    async editFile(filePath, newContent, options = { replace: false, createIfNotExist: false }) {
        try {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            
            // Se o arquivo não existe
            if (!file) {
                if (options.createIfNotExist) {
                    // Criar o arquivo se a opção estiver habilitada
                    const result = await this.createNote(filePath, newContent, false);
                    if (result.success) {
                        new Notice(`Arquivo ${filePath} criado com sucesso.`);
                    }
                    return result;
                } else {
                    return { success: false, message: `O arquivo ${filePath} não foi encontrado.` };
                }
            }
            
            // Verificar se é um arquivo
            if (!(file instanceof TFile)) {
                return { success: false, message: `O caminho ${filePath} não é um arquivo válido.` };
            }
            
            // Ler o conteúdo atual se não for para substituir tudo
            if (!options.replace) {
                const currentContent = await this.app.vault.read(file);
                // Concatenar o novo conteúdo com o existente
                newContent = currentContent + '\n\n' + newContent;
            }
            
            // Modificar o arquivo
            await this.app.vault.modify(file, newContent);
            new Notice(`Arquivo ${file.basename} editado com sucesso.`);
            return { success: true, message: `Arquivo ${filePath} editado com sucesso.` };
        } catch (error) {
            console.error(`Erro ao editar arquivo ${filePath}:`, error);
            new Notice(`Erro ao editar arquivo: ${error.message}`);
            return { success: false, message: `Erro ao editar arquivo: ${error.message}` };
        }
    }
}

// Classe da visualização do chatbot
class ChatbotView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
        this.messages = [];
        this.apiMessages = [];
        this.vaultUnderstanding = 0;
        this.isProcessing = false;
    }

    getViewType() {
        return CHATBOT_VIEW_TYPE;
    }

    getDisplayText() {
        return "Assistente IA";
    }

    getIcon() {
        return "message-square";
    }

    async onOpen() {
        this.contentEl.empty();
        this.contentEl.addClass("chatbot-container");
        
        // Header com título e botões
        const header = this.contentEl.createEl("div", { cls: "chatbot-header" });
        header.createEl("h3", { text: "AI Obsidian FSTech" });
        
        // Container para botões de ação
        const actionButtons = header.createEl("div", { cls: "chatbot-action-buttons" });
        
        // Botão para salvar conversa
        const saveButton = actionButtons.createEl("button", { 
            cls: "chatbot-action-button", 
            attr: { title: "Salvar conversa" }
        });
        // Adicionar ícone de salvar
        saveButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-save"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>';
        
        // Adicionar evento para salvar conversa
        saveButton.addEventListener("click", async () => {
            // Verificar se há mensagens para salvar
            if (this.messages.length === 0) {
                new Notice("Não há conversa para salvar.");
                return;
            }
            
            // Mostrar modal para definir título
            const saveModal = new SaveConversationModal(this.app, this.plugin, this.messages);
            saveModal.open();
        });
        
        // Botão para carregar conversa
        const loadButton = actionButtons.createEl("button", { 
            cls: "chatbot-action-button", 
            attr: { title: "Carregar conversa" }
        });
        // Adicionar ícone de carregar
        loadButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-folder-open"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
        
        // Adicionar evento para carregar conversa
        loadButton.addEventListener("click", async () => {
            this.plugin.openConversationsList();
        });
        
        // Botão para limpar conversa
        const clearButton = actionButtons.createEl("button", { 
            cls: "chatbot-action-button", 
            attr: { title: "Limpar conversa" }
        });
        // Adicionar ícone de limpar
        clearButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        
        // Adicionar evento para limpar conversa
        clearButton.addEventListener("click", async () => {
            // Confirmar antes de limpar
            const confirm = window.confirm("Tem certeza que deseja limpar a conversa atual?");
            if (confirm) {
                this.messages = [];
                this.apiMessages = [];
                this.initializeAPIMessages();
                this.messagesContainer.empty();
                
                // Adicionar mensagem de boas-vindas novamente
                await this.addBotMessage({
                    content: "Olá! Sou AI Obsidian FSTech, seu especialista em otimização de vault Obsidian. Vou guiá-lo através de uma avaliação sistemática do seu setup atual antes de fazer recomendações. Vamos começar.",
                    type: "text"
                });
                
                new Notice("Conversa limpa com sucesso!");
            }
        });
        
        // Botão de fechar
        const closeButton = actionButtons.createEl("button", { 
            cls: "chatbot-close-button", 
            attr: { title: "Fechar assistente" }
        });
        
        // Adicionar ícone X ao botão de fechar
        closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        
        // Adicionar evento ao botão de fechar
        closeButton.addEventListener("click", () => {
            this.app.workspace.detachLeavesOfType(CHATBOT_VIEW_TYPE);
        });
        
        // Área de mensagens
        this.messagesContainer = this.contentEl.createDiv({ cls: "chatbot-messages" });
        
        // Área de entrada
        const inputContainer = this.contentEl.createDiv({ cls: "chatbot-input-container" });
        
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

        // Inicializar o histórico de conversas para a API
        this.initializeAPIMessages();

        // Mensagem de boas-vindas
        await this.addBotMessage({
            content: "Olá! Sou AI Obsidian FSTech, seu especialista em otimização de vault Obsidian. Vou guiá-lo através de uma avaliação sistemática do seu setup atual antes de fazer recomendações. Vamos começar.",
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

    initializeAPIMessages() {
        // Obter a lista de pastas atuais do vault
        const existingFolders = this.plugin.getAllFolders();
        
        // Resetar mensagens da API
        this.apiMessages = [
            {
                role: "system",
                content: `Você é AI Vault, um assistente especializado em otimização de vaults do Obsidian.
                Sua função é ajudar o usuário a organizar melhor seu vault, criar estruturas eficientes,
                e implementar fluxos de trabalho produtivos com o Obsidian.
                
                Seu vault tem as seguintes pastas (as principais são):
                - notas/: pasta principal para armazenar notas
                - anexos/: para armazenar imagens, PDFs e outros arquivos
                - projetos/: para armazenar projetos
                
                Lista completa de pastas disponíveis no vault:
                ${existingFolders.join('\n                - ')}
                                            
                Você pode executar ações no vault do usuário:
                1. Criar notas novas usando [AÇÃO:CRIAR_NOTA]
                2. Criar pastas novas usando [AÇÃO:CRIAR_PASTA]
                3. Atualizar notas existentes usando [AÇÃO:ATUALIZAR_NOTA]
                4. Listar conteúdo de pastas usando [AÇÃO:LISTAR_PASTA]
                
                Quando identificar uma ação concreta, sinalize com [AÇÃO:TIPO] no início da sua resposta,
                onde TIPO pode ser CRIAR_NOTA, CRIAR_PASTA, ATUALIZAR_NOTA ou LISTAR_PASTA, e forneça detalhes específicos em formato JSON.
                
                Exemplo para criar nota:
                [AÇÃO:CRIAR_NOTA]{"titulo":"Nome da Nota","pasta":"notas/subpasta","template":"template-nota-basica"}
                
                Exemplo para criar pasta:
                [AÇÃO:CRIAR_PASTA]{"caminho":"notas/nova_pasta"}
                
                Exemplo para atualizar nota existente:
                [AÇÃO:ATUALIZAR_NOTA]{"caminho":"notas/nota_existente.md","conteudo":"Novo conteúdo a adicionar","modo":"adicionar"}
                
                Exemplo para listar conteúdo de uma pasta:
                [AÇÃO:LISTAR_PASTA]{"caminho":"notas"}
                
                Após o código JSON, continue sua resposta normal explicando o que foi feito.
                
                As pastas no Obsidian são separadas com barras "/", por exemplo "estudos/matemática".
                Quando o usuário pedir para criar uma pasta, SEMPRE crie a pasta completa com todos os níveis necessários.
                
                Ao recomendar melhorias, seja específico e forneça exemplos práticos.
                Use um tom profissional mas amigável. Suas recomendações devem ser aplicáveis
                e considerar as melhores práticas de gestão de conhecimento.
                
                Responda em português.`
            }
        ];
    }

    async sendMessage() {
        // Evitar envios múltiplos
        if (this.isProcessing) return;
        
        const message = this.inputField.value.trim();
        if (!message) return;

        // Adicionar mensagem do usuário à interface
        await this.addUserMessage(message);
        this.inputField.value = "";
        
        // Adicionar mensagem do usuário ao histórico da API
        this.apiMessages.push({
            role: "user",
            content: message
        });

        // Indicar que estamos processando
        this.isProcessing = true;
        
        // Mostrar indicador de digitação
        await this.simulateTyping();
        
        try {
            // Chamar a API da OpenAI
            const response = await this.plugin.callOpenAI(this.apiMessages);
            
            // Aumentar compreensão do vault
            this.vaultUnderstanding += 10;
            if (this.vaultUnderstanding > 100) this.vaultUnderstanding = 100;
            
            // Atualizar barra de progresso
            await this.updateProgressMessage("Vault Understanding", this.vaultUnderstanding);
            
            // Verificar se há ações para executar
            let processedResponse = response;
            let actuatedResponse = response;
            
            // Verificar e executar ações (criar nota ou pasta)
            await this.processActionsInResponse(response).then(result => {
                if (result.actioned) {
                    actuatedResponse = result.response;
                }
            });
            
            // Adicionar resposta à interface
            await this.addBotMessage({
                content: actuatedResponse,
                type: "text"
            });
            
            // Adicionar resposta original ao histórico da API para manter o contexto
            this.apiMessages.push({
                role: "assistant",
                content: processedResponse
            });
            
            // Limitar o tamanho do histórico (opcional)
            if (this.apiMessages.length > 15) {
                // Manter a mensagem do sistema e as últimas mensagens
                const systemMessage = this.apiMessages[0];
                this.apiMessages = [systemMessage, ...this.apiMessages.slice(-14)];
            }
        } catch (error) {
            // Exibir erro na interface
            await this.addBotMessage({
                content: `Desculpe, ocorreu um erro ao processar sua mensagem: ${error.message}`,
                type: "text"
            });
        } finally {
            // Indicar que terminamos o processamento
            this.isProcessing = false;
        }
    }
    
    async processActionsInResponse(response) {
        // Expressão regular para detectar ações no formato [AÇÃO:TIPO]{"parametros":"valores"}
        const actionRegex = /^\[AÇÃO:(CRIAR_NOTA|CRIAR_PASTA|ATUALIZAR_NOTA|LISTAR_PASTA)\](.*?)$/m;
        
        const match = response.match(actionRegex);
        if (!match) return { actioned: false, response: response };
        
        const actionType = match[1];
        let jsonStr = match[2].trim();
        
        // Limpar o texto antes do JSON
        const responseWithoutAction = response.replace(actionRegex, '').trim();
        
        try {
            const actionData = JSON.parse(jsonStr);
            let result = null;
            let actionResult = null;
            
            if (actionType === 'CRIAR_NOTA') {
                // Processar criação de nota
                let content = '';
                let notePath = '';
                
                // Verificar se é para usar um template
                if (actionData.template) {
                    const templateName = actionData.template;
                    const templatePath = templateName.endsWith('.md') 
                        ? `templates/${templateName}` 
                        : `templates/${templateName}.md`;
                    
                    try {
                        // Tentar carregar o template
                        const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
                        if (templateFile instanceof TFile) {
                            content = await this.app.vault.read(templateFile);
                            
                            // Substituir variáveis no template
                            const date = new Date();
                            const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                            
                            content = content.replace(/{{date:[^}]+}}/g, formattedDate);
                            content = content.replace(/{{title}}/g, actionData.titulo || 'Nova Nota');
                            
                            // Se tiver conteúdo específico, inserir no corpo da nota
                            if (actionData.conteudo) {
                                // Encontrar onde inserir o conteúdo (normalmente após a seção ## Notas)
                                const notesSection = content.indexOf('## Notas');
                                if (notesSection !== -1) {
                                    const contentAfterNotes = content.substring(notesSection + 8);
                                    content = content.substring(0, notesSection + 8) + '\n\n' + actionData.conteudo + '\n\n' + contentAfterNotes;
                                } else {
                                    content += '\n\n' + actionData.conteudo;
                                }
                            }
                        } else {
                            console.error(`Template não encontrado: ${templatePath}`);
                            // Usar conteúdo padrão se o template não for encontrado
                            content = `# ${actionData.titulo || 'Nova Nota'}\n\nCriado em: ${new Date().toLocaleString()}\n\n`;
                            if (actionData.conteudo) {
                                content += actionData.conteudo;
                            }
                        }
                    } catch (error) {
                        console.error("Erro ao carregar template:", error);
                        // Usar conteúdo padrão em caso de erro
                        content = `# ${actionData.titulo || 'Nova Nota'}\n\nCriado em: ${new Date().toLocaleString()}\n\n`;
                        if (actionData.conteudo) {
                            content += actionData.conteudo;
                        }
                    }
                } else if (actionData.conteudo) {
                    // Se não tem template mas tem conteúdo
                    content = `# ${actionData.titulo || 'Nova Nota'}\n\nCriado em: ${new Date().toLocaleString()}\n\n${actionData.conteudo}`;
                } else {
                    // Conteúdo padrão se não tem template nem conteúdo
                    content = `# ${actionData.titulo || 'Nova Nota'}\n\nCriado em: ${new Date().toLocaleString()}\n\n`;
                }
                
                // Construir o caminho da nota
                if (actionData.pasta) {
                    notePath = actionData.pasta.endsWith('/') 
                        ? `${actionData.pasta}${actionData.titulo}.md` 
                        : `${actionData.pasta}/${actionData.titulo}.md`;
                } else {
                    notePath = `notas/${actionData.titulo}.md`;
                }
                
                // Verificar se a nota já existe
                const existingNote = this.app.vault.getAbstractFileByPath(notePath);
                if (existingNote instanceof TFile) {
                    // A nota já existe, perguntar ao usuário se deseja atualizá-la
                    actionResult = {
                        actioned: true,
                        note: notePath,
                        result: { success: false, message: `A nota ${notePath} já existe. Use [AÇÃO:ATUALIZAR_NOTA] para modificá-la.` }
                    };
                    
                    new Notice(`A nota ${actionData.titulo} já existe. Use o comando para atualizar notas.`);
                } else {
                    // Criar a nota
                    result = await this.plugin.createNote(notePath, content);
                    actionResult = {
                        actioned: true,
                        note: notePath,
                        result: result
                    };
                    
                    // Feedback visual
                    if (result.success) {
                        new Notice(`Nota "${actionData.titulo}" criada com sucesso!`);
                    } else {
                        new Notice(`Erro ao criar nota: ${result.message}`);
                    }
                }
                
            } else if (actionType === 'CRIAR_PASTA') {
                // Processar criação de pasta
                const folderPath = actionData.caminho;
                result = await this.plugin.createFolder(folderPath);
                
                actionResult = {
                    actioned: true,
                    folder: folderPath,
                    result: result
                };
                
                // Feedback visual
                if (result.success) {
                    new Notice(`Pasta "${folderPath}" criada com sucesso!`);
                } else {
                    new Notice(`Erro ao criar pasta: ${result.message}`);
                }
            } else if (actionType === 'ATUALIZAR_NOTA') {
                // Processar atualização de nota existente
                const notePath = actionData.caminho;
                const newContent = actionData.conteudo || '';
                const appendMode = actionData.modo === 'adicionar' || true;
                
                result = await this.plugin.updateExistingNote(notePath, newContent, appendMode);
                
                actionResult = {
                    actioned: true,
                    note: notePath,
                    result: result
                };
                
                // Feedback visual
                if (result.success) {
                    new Notice(`Nota "${notePath}" atualizada com sucesso!`);
                } else {
                    new Notice(`Erro ao atualizar nota: ${result.message}`);
                }
            } else if (actionType === 'LISTAR_PASTA') {
                // Processar listagem de conteúdo da pasta
                const folderPath = actionData.caminho;
                const folder = this.app.vault.getAbstractFileByPath(folderPath);
                
                if (folder instanceof TFolder) {
                    const folderContents = folder.children || [];
                    const files = [];
                    const folders = [];
                    
                    // Separar arquivos e pastas
                    folderContents.forEach(item => {
                        if (item instanceof TFile) {
                            files.push(item.name);
                        } else if (item instanceof TFolder) {
                            folders.push(item.name);
                        }
                    });
                    
                    result = {
                        success: true,
                        files: files,
                        folders: folders,
                        message: `Conteúdo da pasta ${folderPath} obtido com sucesso.`
                    };
                    
                    // Adicionar lista ao texto da resposta
                    let listContent = `\n\n### Conteúdo da pasta ${folderPath}:\n`;
                    
                    if (folders.length > 0) {
                        listContent += `\n#### Pastas:\n`;
                        folders.forEach(f => listContent += `- ${f}/\n`);
                    }
                    
                    if (files.length > 0) {
                        listContent += `\n#### Arquivos:\n`;
                        files.forEach(f => listContent += `- ${f}\n`);
                    }
                    
                    if (folders.length === 0 && files.length === 0) {
                        listContent += `\n*A pasta está vazia.*\n`;
                    }
                    
                    // Atualizar a resposta
                    return {
                        actioned: true,
                        response: responseWithoutAction + listContent,
                        result: result
                    };
                    
                } else {
                    result = {
                        success: false,
                        message: `A pasta ${folderPath} não foi encontrada.`
                    };
                    
                    new Notice(`Erro: A pasta ${folderPath} não foi encontrada.`);
                }
                
                actionResult = {
                    actioned: true,
                    folder: folderPath,
                    result: result
                };
            }
            
            return { 
                actioned: true, 
                response: responseWithoutAction,
                result: actionResult
            };
            
        } catch (error) {
            console.error("Erro ao processar ação:", error);
            return { 
                actioned: false, 
                response: response + `\n\n*Nota: Tentei executar uma ação, mas ocorreu um erro: ${error.message}*`
            };
        }
    }

    async simulateTyping() {
        const typingIndicator = this.messagesContainer.createDiv({ cls: "typing-indicator" });
        
        for (let i = 0; i < 3; i++) {
            typingIndicator.createDiv({ cls: "typing-dot" });
        }
        
        // Manter referência para remover depois
        this.typingIndicator = typingIndicator;
        
        // Não resolvemos a promise aqui - será resolvida quando removermos o indicador
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
        // Remover o indicador de digitação se existir
        if (this.typingIndicator) {
            this.typingIndicator.remove();
            this.typingIndicator = null;
        }
        
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
        
        // Processar possível markdown na mensagem
        const contentEl = messageEl.createDiv({
            cls: "message-content"
        });
        
        // Tratar markdown
        contentEl.innerHTML = this.formatMarkdown(message.content);
        
        // Scroll para o final
        this.messagesContainer.scrollTo({
            top: this.messagesContainer.scrollHeight,
            behavior: "smooth"
        });
    }
    
    formatMarkdown(text) {
        // Formatação básica de markdown
        let formattedText = text;
        
        // Negrito
        formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Itálico
        formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Listas
        formattedText = formattedText.replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>');
        formattedText = formattedText.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Quebras de linha
        formattedText = formattedText.replace(/\n/g, '<br>');
        
        return formattedText;
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

// Classe para gerenciar as configurações
class OpenAIAssistantSettingTab {
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
    }

    display() {
        const {containerEl} = this;
        containerEl.empty();

        containerEl.createEl('h2', {text: 'Configurações do OpenAI Assistant'});

        new Setting(containerEl)
            .setName('Chave de API')
            .setDesc('Sua chave de API da OpenAI')
            .addText(text => text
                .setPlaceholder('sk-...')
                .setValue(this.plugin.settings.apiKey)
                .onChange(async (value) => {
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Modelo')
            .setDesc('Modelo da OpenAI a ser utilizado')
            .addDropdown(dropdown => dropdown
                .addOption('gpt-4-turbo', 'GPT-4 Turbo')
                .addOption('gpt-4', 'GPT-4')
                .addOption('gpt-3.5-turbo', 'GPT-3.5 Turbo')
                .setValue(this.plugin.settings.model)
                .onChange(async (value) => {
                    this.plugin.settings.model = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Temperatura')
            .setDesc('Controla a aleatoriedade das respostas (0-1)')
            .addSlider(slider => slider
                .setLimits(0, 1, 0.1)
                .setValue(this.plugin.settings.temperature)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.temperature = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Máximo de tokens')
            .setDesc('Máximo de tokens a serem gerados')
            .addText(text => text
                .setPlaceholder('2000')
                .setValue(String(this.plugin.settings.maxTokens))
                .onChange(async (value) => {
                    const parsedValue = parseInt(value);
                    if (!isNaN(parsedValue)) {
                        this.plugin.settings.maxTokens = parsedValue;
                        await this.plugin.saveSettings();
                    }
                }));
    }
}

// Modal para exibir lista de conversas salvas
class ConversationsListModal extends require("obsidian").Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();
        contentEl.addClass('conversations-list-modal');
        
        contentEl.createEl('h2', {text: 'Conversas Salvas'});
        
        // Se não tem conversas, mostrar mensagem
        if (this.plugin.conversations.length === 0) {
            contentEl.createEl('p', {text: 'Nenhuma conversa salva ainda.'});
            return;
        }
        
        // Criar lista de conversas
        const listContainer = contentEl.createEl('div', {cls: 'conversations-list'});
        
        // Adicionar cada conversa
        for (const conversation of this.plugin.conversations) {
            const conversationEl = listContainer.createEl('div', {cls: 'conversation-item'});
            
            const titleEl = conversationEl.createEl('div', {cls: 'conversation-title'});
            titleEl.createEl('span', {text: conversation.title});
            
            const dateEl = conversationEl.createEl('div', {cls: 'conversation-date'});
            // Tentar formatar a data
            let dateText = conversation.date;
            try {
                const date = new Date(conversation.date);
                dateText = date.toLocaleString();
            } catch (e) {
                // Manter o texto original
            }
            dateEl.createEl('span', {text: dateText});
            
            const summaryEl = conversationEl.createEl('div', {cls: 'conversation-summary'});
            summaryEl.createEl('p', {text: conversation.summary});
            
            const actionsEl = conversationEl.createEl('div', {cls: 'conversation-actions'});
            
            // Botão para carregar a conversa
            const loadBtn = actionsEl.createEl('button', {
                cls: 'mod-cta',
                text: 'Carregar'
            });
            loadBtn.addEventListener('click', async () => {
                // Carregar a conversa selecionada
                const messages = await this.plugin.loadConversation(conversation.path);
                if (messages && messages.length > 0) {
                    // Procurar a instância ativa do chatbot
                    const leaves = this.app.workspace.getLeavesOfType(CHATBOT_VIEW_TYPE);
                    if (leaves.length > 0) {
                        const chatbotView = leaves[0].view;
                        // Limpar mensagens atuais
                        chatbotView.messages = [];
                        chatbotView.messagesContainer.empty();
                        
                        // Adicionar mensagens carregadas
                        for (const msg of messages) {
                            if (msg.role === 'user') {
                                chatbotView.addUserMessage(msg.content);
                            } else if (msg.role === 'assistant') {
                                chatbotView.addBotMessage({
                                    content: msg.content,
                                    type: 'text'
                                });
                            }
                        }
                        
                        // Rolar para o final
                        chatbotView.scrollToBottom();
                        
                        new Notice(`Conversa "${conversation.title}" carregada com sucesso.`);
                    } else {
                        // Se o chatbot não estiver aberto, abri-lo e carregar as mensagens
                        this.plugin.activateChatbotView().then(() => {
                            const leaves = this.app.workspace.getLeavesOfType(CHATBOT_VIEW_TYPE);
                            if (leaves.length > 0) {
                                const chatbotView = leaves[0].view;
                                // Limpar mensagens atuais
                                chatbotView.messages = [];
                                chatbotView.messagesContainer.empty();
                                
                                // Adicionar mensagens carregadas
                                for (const msg of messages) {
                                    if (msg.role === 'user') {
                                        chatbotView.addUserMessage(msg.content);
                                    } else if (msg.role === 'assistant') {
                                        chatbotView.addBotMessage({
                                            content: msg.content,
                                            type: 'text'
                                        });
                                    }
                                }
                                
                                // Rolar para o final
                                chatbotView.scrollToBottom();
                                
                                new Notice(`Conversa "${conversation.title}" carregada com sucesso.`);
                            }
                        });
                    }
                    
                    // Fechar o modal
                    this.close();
                } else {
                    new Notice('Erro ao carregar conversa.');
                }
            });
            
            // Botão para excluir a conversa
            const deleteBtn = actionsEl.createEl('button', {
                cls: 'mod-warning',
                text: 'Excluir'
            });
            deleteBtn.addEventListener('click', async () => {
                // Confirmar antes de excluir
                const confirm = window.confirm(`Tem certeza que deseja excluir a conversa "${conversation.title}"?`);
                if (confirm) {
                    // Excluir a conversa
                    const success = await this.plugin.deleteConversation(conversation.path);
                    if (success) {
                        // Remover da lista
                        conversationEl.remove();
                        // Atualizar a lista de conversas
                        this.plugin.loadSavedConversationsList();
                        
                        // Se não tem mais conversas, mostrar mensagem
                        if (listContainer.children.length === 0) {
                            contentEl.empty();
                            contentEl.createEl('h2', {text: 'Conversas Salvas'});
                            contentEl.createEl('p', {text: 'Nenhuma conversa salva ainda.'});
                        }
                    }
                }
            });
        }
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

// Modal para solicitar a chave da API do usuário
class ApiKeyModal extends require("obsidian").Modal {
    constructor(app, plugin, onSubmit) {
        super(app);
        this.plugin = plugin;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();
        contentEl.addClass('api-key-modal');
        
        contentEl.createEl('h2', {text: 'Informe sua chave da API OpenAI'});
        
        const description = contentEl.createEl('p', {
            text: 'Por motivos de segurança, sua chave da API não será salva permanentemente. ' +
                  'Ela ficará disponível apenas durante esta sessão de chat e será apagada quando você fechar a janela.'
        });
        
        const form = contentEl.createEl('div', {cls: 'api-key-form'});
        
        // Campo para a chave da API
        const apiKeyField = form.createEl('input', {
            type: 'password',
            placeholder: 'Insira sua chave da API OpenAI aqui',
            cls: 'api-key-input'
        });
        
        // Botões de ação
        const buttonContainer = form.createEl('div', {cls: 'api-key-buttons'});
        
        const submitButton = buttonContainer.createEl('button', {
            text: 'Confirmar',
            cls: 'mod-cta'
        });
        
        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancelar'
        });
        
        // Handler para enviar o formulário
        submitButton.addEventListener('click', () => {
            const apiKey = apiKeyField.value.trim();
            if (apiKey) {
                this.onSubmit(apiKey);
                this.close();
            } else {
                new Notice('Por favor, insira uma chave de API válida.');
            }
        });
        
        // Handler para cancelar
        cancelButton.addEventListener('click', () => {
            this.close();
        });
        
        // Focar no campo de entrada
        apiKeyField.focus();
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

// Modal para salvar uma conversa
class SaveConversationModal extends require("obsidian").Modal {
    constructor(app, plugin, messages) {
        super(app);
        this.plugin = plugin;
        this.messages = messages;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();
        contentEl.addClass('save-conversation-modal');
        
        contentEl.createEl('h2', {text: 'Salvar Conversa'});
        
        // Criar campo para título
        const formContainer = contentEl.createEl('div', {cls: 'save-conversation-form'});
        
        formContainer.createEl('label', {text: 'Título da conversa:'});
        const titleInput = formContainer.createEl('input', {
            type: 'text',
            value: `Conversa ${new Date().toLocaleDateString()}`
        });
        
        // Extrair um resumo da primeira resposta do assistente
        let summary = '';
        for (const msg of this.messages) {
            if (msg.role === 'assistant') {
                summary = msg.content.substring(0, 150);
                if (msg.content.length > 150) summary += '...';
                break;
            }
        }
        
        // Mostrar preview do resumo
        formContainer.createEl('label', {text: 'Resumo (automático):'});
        const summaryPreview = formContainer.createEl('div', {
            cls: 'summary-preview',
            text: summary || 'Sem resumo disponível'
        });
        
        // Botões
        const buttonsContainer = contentEl.createEl('div', {cls: 'save-conversation-buttons'});
        
        // Botão salvar
        const saveBtn = buttonsContainer.createEl('button', {
            cls: 'mod-cta',
            text: 'Salvar'
        });
        saveBtn.addEventListener('click', async () => {
            const title = titleInput.value.trim() || `Conversa ${new Date().toLocaleDateString()}`;
            
            // Salvar a conversa
            const filePath = await this.plugin.saveConversation(this.messages, title);
            if (filePath) {
                // Atualizar a lista de conversas
                this.plugin.loadSavedConversationsList();
                this.close();
            }
        });
        
        // Botão cancelar
        const cancelBtn = buttonsContainer.createEl('button', {
            text: 'Cancelar'
        });
        cancelBtn.addEventListener('click', () => {
            this.close();
        });
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

module.exports = OpenAIAssistantPlugin;