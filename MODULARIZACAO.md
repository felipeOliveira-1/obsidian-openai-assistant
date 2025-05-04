# Roteiro de Modularização do Plugin Obsidian AI Vault

Este documento orienta o processo de modularização do plugin, separando responsabilidades em arquivos e diretórios distintos para facilitar manutenção, testes e expansão futura.

---

## 1. Estrutura Recomendada de Diretórios

```
plugins/
└── obsidian-openai-assistant/
    ├── main.js
    ├── modals/
    │   ├── CreateNoteModal.js
    │   ├── EditContentModal.js
    │   └── VerifyContentModal.js
    ├── settings/
    │   └── OpenAIAssistantSettingTab.js
    ├── utils/
    │   └── openai.js
    ├── styles/
    │   └── styles.css
    ├── manifest.json
    ├── package.json
    └── ...
```

---

## 2. Passos para Modularização

### 2.1. Criar Diretórios

- [x] Crie a pasta `modals/` dentro de `plugins/obsidian-openai-assistant/`.
- [x] Crie as pastas `settings/` e `utils/` dentro de `plugins/obsidian-openai-assistant/`.

### 2.2. Mover e Separar Classes

- [x] **Modals:**  
  - [x] Mover a classe CreateNoteModal para `modals/CreateNoteModal.js`.
  - [x] Mover a classe EditContentModal para `modals/EditContentModal.js`.
  - [x] Mover a classe VerifyContentModal para `modals/VerifyContentModal.js`.
- [x] **Settings:**  
  - [x] Mover a classe `OpenAIAssistantSettingTab` para `settings/OpenAIAssistantSettingTab.js`.
- [x] **Utils:**  
  - [x] Criar `utils/openai.js` para funções auxiliares como chamada à API, validações, tratamento de erros etc.

### 2.3. Ajustar Imports/Requires

- [x] Atualize os arquivos para importar/exportar as classes e funções conforme necessário.
  - [x] Use `module.exports` e `require()` para CommonJS.
  - [ ] Ou `export`/`import` para ES Modules (se o projeto suportar).

### 2.4. Refatorar o main.js

- Deixe apenas o essencial: inicialização do plugin, registro de comandos, integração dos módulos.

### 2.5. Ajustar Build/Empacotamento

- Se usar bundler (ex: esbuild, rollup), ajuste o entry point e inclua os novos arquivos no build.

### 2.6. Testar

- Teste o plugin no Obsidian após cada etapa para garantir que tudo funciona.
- Corrija eventuais problemas de caminho, importação ou escopo.

---

## 3. Exemplo de Importação no main.js

```js
const { Plugin } = require('obsidian');
const { CreateNoteModal } = require('./modals/CreateNoteModal');
const { EditContentModal } = require('./modals/EditContentModal');
const { VerifyContentModal } = require('./modals/VerifyContentModal');
const { OpenAIAssistantSettingTab } = require('./settings/OpenAIAssistantSettingTab');
const { callOpenAI } = require('./utils/openai');
```

---

## 4. Benefícios

- **Manutenção facilitada**
- **Leitura e navegação mais simples**
- **Testes e expansão mais fáceis**
- **Colaboração em equipe otimizada**

---

## 5. Dicas Finais

- Sempre edite e mantenha o código-fonte fora da pasta `.obsidian/plugins/` — use essa pasta apenas para deploy/teste.
- Use links simbólicos durante o desenvolvimento para evitar cópia manual.
- Atualize o README após a modularização, se necessário.

---

Se precisar de exemplos de cada arquivo modularizado ou comandos para criar links simbólicos, consulte a equipe ou peça suporte!

---

**Fim do roteiro**
