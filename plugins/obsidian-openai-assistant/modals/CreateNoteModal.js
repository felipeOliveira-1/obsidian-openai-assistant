const { Modal, Notice, Setting } = require('obsidian');

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

module.exports = { CreateNoteModal };
