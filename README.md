# PESQUISA_FIDC

Aplicacao web em React para pesquisa de fundos FIDC, com filtros avancados, ordenacao de colunas, selecao de linhas e exportacao de resultados em XLSX.

## Funcionalidades

- Busca por multiplas palavras-chave
- Filtros de colunas exibidas
- Filtro por situacao do fundo
- Ordenacao por clique no cabecalho
- Redimensionamento manual de colunas
- Selecao de linhas para exportacao
- Exportacao de todos os resultados ou apenas selecionados

## Tecnologias

- React 19
- Vite 7
- ESLint 9
- xlsx

## Pre-requisitos

- Node.js 18+ (recomendado LTS)
- npm 9+
- Servico de busca ativo em `http://localhost:8000`

## Como executar

```bash
npm install
npm run dev
```

A aplicacao ficara disponivel no endereco mostrado pelo Vite (normalmente `http://localhost:5173`).

## Scripts

- `npm run dev`: inicia em modo desenvolvimento
- `npm run build`: gera build de producao
- `npm run preview`: executa preview local da build
- `npm run lint`: roda lint do projeto

## Build de producao

```bash
npm run build
```

Os artefatos sao gerados em `dist/`.

## Estrutura principal

- `src/`: codigo-fonte da interface
- `public/`: arquivos estaticos
- `dist/`: build de producao (gerado automaticamente)

## Licenca

Este projeto esta licenciado sob a licenca MIT. Consulte o arquivo `LICENSE` para mais detalhes.
