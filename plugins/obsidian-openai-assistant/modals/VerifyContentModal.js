const { Modal, Notice, Setting } = require('obsidian');

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
                const content = `# Análise de Conteúdo (${this.verifyType})\n\n## Conteúdo Original\n\n\n${this.content}\n\n## Análise\n\n${result}`;
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

module.exports = { VerifyContentModal };
