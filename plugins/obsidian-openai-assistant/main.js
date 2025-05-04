const { Plugin, Notice } = require('obsidian');
const { CreateNoteModal } = require('./modals/CreateNoteModal');
const { EditContentModal } = require('./modals/EditContentModal');
const { VerifyContentModal } = require('./modals/VerifyContentModal');
const { OpenAIAssistantSettingTab } = require('./settings/OpenAIAssistantSettingTab');
const { callOpenAI } = require('./utils/openai');

class OpenAIAssistantPlugin extends Plugin {
    async onload() {
        console.log('Carregando plugin OpenAI Assistant');
        
        // Carregar configuraÃ§Ãµes
        this.settings = Object.assign({}, {
            apiKey: '',
            model: 'gpt-4-turbo',
            temperature: 0.7,
            maxTokens: 4000
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
            name: 'Editar seleÃ§Ã£o com assistente IA',
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
            name: 'Verificar conteÃºdo com assistente IA',
            editorCallback: (editor) => {
                const selection = editor.getSelection() || editor.getValue();
                if (selection) {
                    new VerifyContentModal(this.app, this, selection).open();
                }
            }
        });

        // Adicionar configuraÃ§Ãµes do plugin
        this.addSettingTab(new OpenAIAssistantSettingTab(this.app, this));
    }

    onunload() {
        console.log('Descarregando plugin OpenAI Assistant');
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    // MÃ©todo para fazer chamada Ã  API da OpenAI
    async callOpenAI(prompt, systemPrompt = "VocÃª Ã© um assistente Ãºtil.") {
        return await callOpenAI(this.settings, prompt, systemPrompt);
    }
}

