const { Notice } = require('obsidian');

/**
 * Função utilitária para chamada à API OpenAI.
 * @param {Object} settings - Configurações do plugin (apiKey, model, temperature, maxTokens)
 * @param {string} prompt - Prompt do usuário
 * @param {string} systemPrompt - Prompt do sistema
 * @returns {Promise<string|null>} - Resposta da OpenAI ou null em caso de erro
 */
async function callOpenAI(settings, prompt, systemPrompt = "Você é um assistente útil.") {
    if (!settings.apiKey) {
        new Notice('API Key da OpenAI não configurada. Configure nas configurações do plugin.');
        return null;
    }
    try {
        new Notice('Enviando solicitação para a OpenAI...');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                model: settings.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: settings.temperature,
                max_tokens: settings.maxTokens
            })
        });
        if (!response.ok) {
            let errorMsg = 'Erro desconhecido ao chamar a API da OpenAI.';
            let errorTip = '';
            let errorDetails = '';
            try {
                const error = await response.json();
                errorDetails = error.error?.message || JSON.stringify(error);
                if (errorDetails.includes('Invalid API key')) {
                    errorMsg = 'API Key inválida. Verifique se a chave está correta nas configurações.';
                    errorTip = 'Acesse https://platform.openai.com/account/api-keys para obter uma chave válida.';
                } else if (errorDetails.includes('maximum context length')) {
                    errorMsg = 'Limite de tokens excedido. Reduza o texto de entrada ou diminua o valor de "Máximo de tokens" nas configurações.';
                } else if (errorDetails.includes('model')) {
                    errorMsg = `Erro de modelo: ${errorDetails}`;
                }
            } catch (e) {
                errorDetails = await response.text();
            }
            new Notice(`${errorMsg}\n${errorTip}\n${errorDetails}`);
            return null;
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content || null;
    } catch (error) {
        new Notice(`Erro de rede ao acessar a OpenAI: ${error.message}`);
        return null;
    }
}

module.exports = { callOpenAI };
