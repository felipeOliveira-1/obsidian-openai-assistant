const { Plugin, Notice, Modal, Setting } = require('obsidian');

class OpenAIAssistantPlugin extends Plugin {
    async onload() {
        console.log('Carregando plugin OpenAI Assistant');
        
        // Carregar configurações
        this.settings = Object.assign({}, {
            apiKey: '',
            model: 'gpt-4.1',
            temperature: 0.17,
            maxTokens: 5000
        }, await this.loadData());

        // Registrar comandos
        this.addCommand({
            id: 'create-note-with-ai',
            name: 'Criar nota com assistente IA',
            callback: () => {
                new CreateNoteModal(this.app, this).open();
            }
        });

        this.addCommand({
            id: 'edit-with-ai',
            name: 'Editar seleção com assistente IA',
            editorCallback: (editor) => {
                const selection = editor.getSelection();
                if (selection) {
                    new EditContentModal(this.app, this, selection, editor).open();
                } else {
                    new Notice('Selecione algum texto para editar com a IA.');
                }
            }
        });

        this.addCommand({
            id: 'verify-with-ai',
            name: 'Verificar conteúdo com assistente IA',
            editorCallback: (editor) => {
                const selection = editor.getSelection() || editor.getValue();
                if (selection) {
                    new VerifyContentModal(this.app, this, selection).open();
                }
            }
        });

        // Adicionar configurações do plugin
        this.addSettingTab(new OpenAIAssistantSettingTab(this.app, this));
    }

    onunload() {
        console.log('Descarregando plugin OpenAI Assistant');
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    // Método para fazer chamada à API da OpenAI
    async callOpenAI(prompt, systemPrompt = "Você é um assistente útil.") {
        if (!this.settings.apiKey) {
            new Notice('API Key da OpenAI não configurada. Configure nas configurações do plugin.');
            return null;
        }

        try {
            new Notice('Enviando solicitação para a OpenAI...');
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.settings.apiKey}`
                },
                body: JSON.stringify({
                    model: this.settings.model,
                    messages: [
                        {
                            role: "system",
                            content: systemPrompt
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: this.settings.temperature,
                    max_tokens: this.settings.maxTokens
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Erro desconhecido ao chamar a API da OpenAI');
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Erro ao chamar a API da OpenAI:', error);
            new Notice(`Erro ao chamar a API da OpenAI: ${error.message}`);
            return null;
        }
    }
}

// Modal para criar notas
class CreateNoteModal extends Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
        this.prompt = '';
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Criar nota com IA' });

        // Campo para prompt
        new Setting(contentEl)
            .setName('Descreva o conteúdo da nota')
            .setDesc('Informe o que você deseja que a IA crie')
            .addTextArea(text => text
                .setPlaceholder('Ex: Uma nota sobre os principais conceitos de Kabalah...')
                .onChange(value => {
                    this.prompt = value;
                }));

        // Botões
        const buttonDiv = contentEl.createDiv();
        buttonDiv.addClass('modal-button-container');

        const cancelButton = buttonDiv.createEl('button', { text: 'Cancelar' });
        cancelButton.addEventListener('click', () => this.close());

        const createButton = buttonDiv.createEl('button', { text: 'Criar' });
        createButton.addClass('mod-cta');
        createButton.addEventListener('click', async () => {
            if (!this.prompt) {
                new Notice('Por favor, insira um prompt.');
                return;
            }

            new Notice('Gerando conteúdo com IA...');
            createButton.disabled = true;

            const systemPrompt = "Você é um assistente especializado em criar conteúdo estruturado em formato Markdown. Crie conteúdo organizado, detalhado e informativo baseado na solicitação do usuário.";
            const result = await this.plugin.callOpenAI(this.prompt, systemPrompt);

            if (result) {
                // Criar nova nota com o conteúdo gerado
                const fileName = this.generateFileName();
                this.app.vault.create(fileName, result)
                    .then(() => {
                        new Notice(`Nota '${fileName}' criada com sucesso!`);
                        this.close();
                    })
                    .catch(error => {
                        console.error('Erro ao criar a nota:', error);
                        new Notice(`Erro ao criar a nota: ${error.message}`);
                        createButton.disabled = false;
                    });
            } else {
                new Notice('Não foi possível gerar o conteúdo.');
                createButton.disabled = false;
            }
        });
    }

    generateFileName() {
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return `notas/IA_Gerada_${dateStr}.md`;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// Modal para editar conteúdo
class EditContentModal extends Modal {
    constructor(app, plugin, content, editor) {
        super(app);
        this.plugin = plugin;
        this.content = content;
        this.editor = editor;
        this.instruction = '';
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Editar com IA' });

        // Mostrar o conteúdo selecionado
        contentEl.createEl('h3', { text: 'Conteúdo selecionado:' });
        const contentDiv = contentEl.createDiv();
        contentDiv.addClass('content-preview');
        contentDiv.setText(this.content.length > 300 ? this.content.substring(0, 300) + '...' : this.content);

        // Campo para instruções
        new Setting(contentEl)
            .setName('Instruções para edição')
            .setDesc('Como a IA deve modificar o conteúdo?')
            .addTextArea(text => text
                .setPlaceholder('Ex: Reescreva de forma mais formal...')
                .onChange(value => {
                    this.instruction = value;
                }));

        // Botões
        const buttonDiv = contentEl.createDiv();
        buttonDiv.addClass('modal-button-container');

        const cancelButton = buttonDiv.createEl('button', { text: 'Cancelar' });
        cancelButton.addEventListener('click', () => this.close());

        const editButton = buttonDiv.createEl('button', { text: 'Editar' });
        editButton.addClass('mod-cta');
        editButton.addEventListener('click', async () => {
            if (!this.instruction) {
                new Notice('Por favor, insira instruções para a edição.');
                return;
            }

            new Notice('Editando conteúdo com IA...');
            editButton.disabled = true;

            const prompt = `Conteúdo original: "${this.content}"\n\nInstruções: ${this.instruction}`;
            const systemPrompt = "Você é um editor especializado. Modifique o conteúdo fornecido de acordo com as instruções do usuário, mantendo o formato Markdown e a essência original quando apropriado.";
            const result = await this.plugin.callOpenAI(prompt, systemPrompt);

            if (result) {
                this.editor.replaceSelection(result);
                this.close();
            } else {
                new Notice('Não foi possível editar o conteúdo.');
                editButton.disabled = false;
            }
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// Modal para verificar conteúdo
class VerifyContentModal extends Modal {
    constructor(app, plugin, content) {
        super(app);
        this.plugin = plugin;
        this.content = content;
        this.verifyType = 'gramatical';
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Verificar conteúdo com IA' });

        // Mostrar o conteúdo selecionado
        contentEl.createEl('h3', { text: 'Conteúdo a verificar:' });
        const contentDiv = contentEl.createDiv();
        contentDiv.addClass('content-preview');
        contentDiv.setText(this.content.length > 300 ? this.content.substring(0, 300) + '...' : this.content);

        // Opções de verificação
        new Setting(contentEl)
            .setName('Tipo de verificação')
            .setDesc('Escolha o tipo de verificação a ser realizada')
            .addDropdown(dropdown => dropdown
                .addOption('gramatical', 'Verificação gramatical e ortográfica')
                .addOption('factual', 'Verificação de fatos e consistência')
                .addOption('estilo', 'Verificação de estilo e clareza')
                .setValue(this.verifyType)
                .onChange(value => {
                    this.verifyType = value;
                }));

        // Botões
        const buttonDiv = contentEl.createDiv();
        buttonDiv.addClass('modal-button-container');

        const cancelButton = buttonDiv.createEl('button', { text: 'Cancelar' });
        cancelButton.addEventListener('click', () => this.close());

        const verifyButton = buttonDiv.createEl('button', { text: 'Verificar' });
        verifyButton.addClass('mod-cta');
        verifyButton.addEventListener('click', async () => {
            new Notice('Verificando conteúdo com IA...');
            verifyButton.disabled = true;

            let systemPrompt = "Você é um assistente especializado em verificação de conteúdo. ";
            if (this.verifyType === 'gramatical') {
                systemPrompt += "Analise o texto para encontrar erros gramaticais, ortográficos e de pontuação.";
            } else if (this.verifyType === 'factual') {
                systemPrompt += "Analise o texto para verificar a consistência, coerência e precisão factual aparente.";
            } else {
                systemPrompt += "Analise o texto quanto ao estilo, clareza, concisão e eficácia comunicativa.";
            }

            const prompt = `Por favor, verifique o seguinte conteúdo:\n\n${this.content}\n\nForneça uma análise detalhada, destacando problemas e sugerindo melhorias.`;
            const result = await this.plugin.callOpenAI(prompt, systemPrompt);

            if (result) {
                // Criar nota de análise
                const fileName = `notas/Análise_${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
                const content = `# Análise de Conteúdo (${this.verifyType})\n\n## Conteúdo Original\n\n\`\`\`\n${this.content}\n\`\`\`\n\n## Análise\n\n${result}`;
                
                this.app.vault.create(fileName, content)
                    .then(() => {
                        new Notice(`Análise criada em '${fileName}'!`);
                        this.close();
                    })
                    .catch(error => {
                        console.error('Erro ao criar a nota de análise:', error);
                        new Notice(`Erro ao criar a nota de análise: ${error.message}`);
                        verifyButton.disabled = false;
                    });
            } else {
                new Notice('Não foi possível verificar o conteúdo.');
                verifyButton.disabled = false;
            }
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// Aba de configurações do plugin
class OpenAIAssistantSettingTab {
    constructor(app, plugin) {
        this.app = app;
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Configurações do Assistente OpenAI' });

        new Setting(containerEl)
            .setName('API Key da OpenAI')
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

module.exports = OpenAIAssistantPlugin;