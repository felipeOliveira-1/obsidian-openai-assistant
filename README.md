# Obsidian OpenAI Assistant

Plugin para o Obsidian que integra funcionalidades de IA (OpenAI) para criação, edição e verificação de notas de forma inteligente.

## Funcionalidades

- **Criação de notas com IA**: Gere novas notas a partir de prompts personalizados.
- **Edição inteligente**: Edite seleções de texto utilizando instruções para a IA.
- **Verificação de conteúdo**: Analise textos quanto à gramática, clareza, estilo e obtenha sugestões de melhoria.
- **Configurações customizáveis**: Defina modelo, temperatura, número de tokens e chave de API da OpenAI.

## Instalação

### Método manual

1. Baixe a última versão deste repositório.
2. Extraia o arquivo zip baixado na pasta de plugins do seu vault Obsidian (`SeuVault/.obsidian/plugins/`).
3. Reinicie o Obsidian ou habilite o plugin nas configurações.

### Para desenvolvedores

1. Clone este repositório na pasta de plugins do seu vault Obsidian.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Compile o plugin:
   ```bash
   npm run build
   ```
4. Ative o plugin nas configurações do Obsidian.

## Configuração

1. Acesse as configurações do plugin no Obsidian.
2. Insira sua chave de API da OpenAI (obtida em [https://platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys)).
3. Escolha o modelo desejado (ex: gpt-4-turbo, gpt-3.5-turbo, etc).
4. Ajuste a temperatura e o número máximo de tokens conforme sua necessidade.

## Como Usar

### Criar nota com IA

1. Abra a paleta de comandos (Ctrl+P ou Cmd+P).
2. Digite "Criar nota com assistente IA".
3. Insira o prompt descrevendo o conteúdo que deseja gerar.
4. Clique em "Criar" e aguarde a IA gerar o conteúdo.

### Editar texto com IA

1. Selecione o texto que deseja editar.
2. Abra a paleta de comandos e selecione "Editar seleção com assistente IA".
3. Insira as instruções de edição (ex: "Reescrever de forma mais formal").
4. Clique em "Editar" e aguarde o resultado.

### Verificar conteúdo

1. Selecione o texto que deseja verificar (ou deixe sem seleção para usar todo o conteúdo da nota).
2. Abra a paleta de comandos e selecione "Verificar conteúdo com assistente IA".
3. Escolha o tipo de verificação (gramatical, factual ou estilo).
4. Clique em "Verificar" e aguarde a análise.

## Benefícios

- Agiliza a criação de conteúdo estruturado
- Melhora a qualidade da escrita com edições inteligentes
- Facilita a detecção de problemas gramaticais, factuais e estilísticos
- Integração fluida com o fluxo de trabalho do Obsidian

## Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork este repositório.
2. Crie uma branch (`git checkout -b feature/nome-da-feature`).
3. Faça suas alterações e envie um pull request.
4. Detalhe claramente o que foi feito e o motivo.

## Licença

Este projeto está licenciado sob a licença MIT.

---

### Contato

Para dúvidas ou sugestões, abra uma issue neste repositório.