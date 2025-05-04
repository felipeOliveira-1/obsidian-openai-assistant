const { Modal, Notice, Setting } = require('obsidian');

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
        contentEl.createEl('h2', { text: 'Editar conteúdo com IA' });

        // Mostrar o conteúdo original
        contentEl.createEl('h3', { text: 'Conteúdo selecionado:' });
        const contentDiv = contentEl.createDiv();
        contentDiv.addClass('content-preview');
        contentDiv.setText(this.content.length > 300 ? this.content.substring(0, 300) + '...' : this.content);

        // Campo para instrução de edição
        new Setting(contentEl)
            .setName('Instrução para IA')
            .setDesc('Descreva como deseja editar o texto')
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
                new Notice('Por favor, insira uma instrução.');
                return;
            }

            new Notice('Editando conteúdo com IA...');
            editButton.disabled = true;

            const systemPrompt = "Você é um assistente especializado em edição de texto. Edite o texto conforme a instrução do usuário, mantendo o máximo de fidelidade ao conteúdo original.";
            const prompt = `Texto original:\n${this.content}\n\nInstrução:\n${this.instruction}`;
            const result = await this.plugin.callOpenAI(prompt, systemPrompt);

            if (result) {
                // Substituir o texto selecionado pelo resultado
                this.editor.replaceSelection(result);
                new Notice('Conteúdo editado com sucesso!');
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

module.exports = { EditContentModal };