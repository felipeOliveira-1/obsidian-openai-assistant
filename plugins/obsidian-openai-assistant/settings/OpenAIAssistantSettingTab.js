const { Setting, Notice } = require('obsidian');

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
                    if (!value || !value.startsWith('sk-')) {
                        new Notice('A API Key deve começar com "sk-" e não pode estar vazia.');
                        text.inputEl.addClass('is-invalid');
                    } else {
                        text.inputEl.removeClass('is-invalid');
                        this.plugin.settings.apiKey = value;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Modelo')
            .setDesc('Modelo da OpenAI a ser usado')
            .addText(text => text
                .setPlaceholder('gpt-4.1')
                .setValue(this.plugin.settings.model)
                .onChange(async (value) => {
                    if (!value || value.trim().length === 0) {
                        new Notice('O modelo não pode estar vazio.');
                        text.inputEl.addClass('is-invalid');
                    } else {
                        text.inputEl.removeClass('is-invalid');
                        this.plugin.settings.model = value;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Temperatura')
            .setDesc('Controla a aleatoriedade da resposta (0-2)')
            .addText(text => text
                .setPlaceholder('0.17')
                .setValue(String(this.plugin.settings.temperature))
                .onChange(async (value) => {
                    const parsedValue = parseFloat(value);
                    if (isNaN(parsedValue) || parsedValue < 0 || parsedValue > 2) {
                        new Notice('A temperatura deve ser um número entre 0 e 2.');
                        text.inputEl.addClass('is-invalid');
                    } else {
                        text.inputEl.removeClass('is-invalid');
                        this.plugin.settings.temperature = parsedValue;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Máximo de tokens')
            .setDesc('Máximo de tokens a serem gerados')
            .addText(text => text
                .setPlaceholder('2000')
                .setValue(String(this.plugin.settings.maxTokens))
                .onChange(async (value) => {
                    const parsedValue = parseInt(value);
                    if (isNaN(parsedValue) || parsedValue <= 0) {
                        new Notice('O máximo de tokens deve ser um número inteiro positivo.');
                        text.inputEl.addClass('is-invalid');
                    } else {
                        text.inputEl.removeClass('is-invalid');
                        this.plugin.settings.maxTokens = parsedValue;
                        await this.plugin.saveSettings();
                    }
                }));
    }
}

module.exports = { OpenAIAssistantSettingTab };
