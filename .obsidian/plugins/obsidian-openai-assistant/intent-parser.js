class IntentParser {
    constructor(plugin) {
        this.plugin = plugin;
        this.intents = {
            CREATE_NOTE: {
                patterns: [
                    /criar\s+(uma\s+)?nota/i,
                    /nova\s+nota/i,
                    /adicionar\s+(uma\s+)?nota/i,
                    /gerar\s+(uma\s+)?nota/i
                ],
                handler: this.handleCreateNote.bind(this)
            },
            CREATE_FOLDER: {
                patterns: [
                    /criar\s+(uma\s+)?pasta/i,
                    /nova\s+pasta/i,
                    /adicionar\s+(uma\s+)?pasta/i,
                    /criar\s+(um\s+)?diretório/i
                ],
                handler: this.handleCreateFolder.bind(this)
            },
            EDIT_CONTENT: {
                patterns: [
                    /editar\s+.+/i,
                    /modificar\s+.+/i,
                    /alterar\s+.+/i,
                    /atualizar\s+.+/i,
                    /mudar\s+.+/i
                ],
                handler: this.handleEditContent.bind(this)
            },
            VERIFY_CONTENT: {
                patterns: [
                    /verificar\s+.+/i,
                    /checar\s+.+/i,
                    /revisar\s+.+/i,
                    /analisar\s+.+/i,
                    /conferir\s+.+/i
                ],
                handler: this.handleVerifyContent.bind(this)
            },
            HELP: {
                patterns: [
                    /como\s+(eu\s+)?posso/i,
                    /me\s+ajude/i,
                    /ajuda/i,
                    /o que\s+(você|vc)\s+pode fazer/i,
                    /quais\s+(são\s+)?as\s+funcionalidades/i
                ],
                handler: this.handleHelp.bind(this)
            }
        };
    }

    async parseMessage(message) {
        try {
            // Verificar se a mensagem corresponde a alguma intenção
            for (const [intentName, intent] of Object.entries(this.intents)) {
                for (const pattern of intent.patterns) {
                    if (pattern.test(message)) {
                        return {
                            intent: intentName,
                            response: await intent.handler(message),
                            success: true
                        };
                    }
                }
            }

            // Se não corresponder a nenhuma intenção específica, enviar para a OpenAI
            return {
                intent: "GENERAL_QUERY",
                response: await this.handleGeneralQuery(message),
                success: true
            };
        } catch (error) {
            console.error("Erro ao processar a mensagem:", error);
            return {
                intent: "ERROR",
                response: "Desculpe, tive um problema ao processar sua solicitação. Pode tentar novamente?",
                success: false
            };
        }
    }

    async handleCreateNote(message) {
        // Extrair informações relevantes da mensagem
        const titleMatch = message.match(/(?:sobre|chamada|intitulada|com o título)\s+["']?([^"']+)["']?/i);
        const folderMatch = message.match(/(?:na pasta|no diretório|em)\s+["']?([^"']+)["']?/i);
        
        const title = titleMatch ? titleMatch[1] : "Nova nota";
        const folder = folderMatch ? folderMatch[1] : "";
        
        // Aqui apenas retornamos a resposta, mas na integração real chamaríamos a função de criação de nota
        return {
            message: `Vou criar uma nova nota intitulada "${title}"${folder ? ` na pasta "${folder}"` : ''}. O que você gostaria de incluir nela?`,
            data: { title, folder }
        };
    }

    async handleCreateFolder(message) {
        // Extrair o nome da pasta da mensagem
        const folderMatch = message.match(/(?:chamada|intitulada|com o nome)\s+["']?([^"']+)["']?/i);
        const parentFolderMatch = message.match(/(?:dentro de|em|na pasta)\s+["']?([^"']+)["']?/i);
        
        const folderName = folderMatch ? folderMatch[1] : "Nova pasta";
        const parentFolder = parentFolderMatch ? parentFolderMatch[1] : "";
        
        return {
            message: `Vou criar uma nova pasta chamada "${folderName}"${parentFolder ? ` dentro de "${parentFolder}"` : ''}. Gostaria de criar alguma nota dentro dela?`,
            data: { folderName, parentFolder }
        };
    }

    async handleEditContent(message) {
        // Extrair informações sobre o que editar
        const contentMatch = message.match(/editar\s+(?:a nota|o arquivo|o conteúdo de)\s+["']?([^"']+)["']?/i);
        const fileName = contentMatch ? contentMatch[1] : null;
        
        if (!fileName) {
            return {
                message: "Para editar conteúdo, por favor especifique qual nota ou arquivo deseja modificar.",
                data: {}
            };
        }
        
        return {
            message: `Vou ajudá-lo a editar "${fileName}". Que alterações você gostaria de fazer?`,
            data: { fileName }
        };
    }

    async handleVerifyContent(message) {
        // Extrair informações sobre o que verificar
        const contentMatch = message.match(/verificar\s+(?:a nota|o arquivo|o conteúdo de)\s+["']?([^"']+)["']?/i);
        const fileName = contentMatch ? contentMatch[1] : null;
        
        // Extrair o tipo de verificação desejada
        let verificationType = "geral";
        if (message.includes("gramática") || message.includes("ortografia")) {
            verificationType = "gramatical";
        } else if (message.includes("fatos") || message.includes("informações")) {
            verificationType = "factual";
        } else if (message.includes("estilo") || message.includes("estrutura")) {
            verificationType = "estilo";
        }
        
        if (!fileName) {
            return {
                message: "Posso verificar o conteúdo de uma nota quanto à gramática, fatos ou estilo. Por favor, especifique qual nota deseja verificar.",
                data: {}
            };
        }
        
        return {
            message: `Vou realizar uma verificação ${verificationType} do conteúdo de "${fileName}".`,
            data: { fileName, verificationType }
        };
    }

    async handleHelp(message) {
        return {
            message: "Posso ajudá-lo com várias tarefas no seu vault:\n\n" +
                     "1. **Criar notas** - Posso gerar uma nova nota sobre qualquer tópico\n" +
                     "2. **Criar pastas** - Posso criar novas pastas para organizar seu vault\n" +
                     "3. **Editar conteúdo** - Posso ajudar a modificar o conteúdo de suas notas\n" +
                     "4. **Verificar conteúdo** - Posso analisar suas notas quanto à gramática, fatos ou estilo\n" +
                     "5. **Responder perguntas** - Posso responder perguntas sobre seu vault ou sobre qualquer assunto\n\n" +
                     "Como posso ajudá-lo hoje?",
            data: {}
        };
    }

    async handleGeneralQuery(message) {
        // Aqui implementaremos a integração com a OpenAI para processar consultas gerais
        // Por enquanto, retornamos uma resposta genérica
        return {
            message: "Entendi sua mensagem. No futuro, eu processarei isso usando a OpenAI para fornecer respostas mais úteis e personalizadas.",
            data: {}
        };
    }
}

module.exports = IntentParser;
