# TESTE_CODEX - Instrucoes Gerais

## Objetivo
Aplicacao React para pesquisa de FIDC com:
- busca por palavras-chave
- filtros de colunas exibidas
- filtro de situacao do fundo
- ordenacao por clique no cabecalho
- redimensionamento manual de colunas
- selecao de linhas e exportacao XLSX

## Requisitos
- Node.js instalado
- Servidor de busca ativo em `http://localhost:8000`

## Como executar
1. Abra o terminal na pasta `C:\Users\isaias.nascimento_cr\Desktop\TESTE_CODEX`
2. Instale dependencias:
   - `npm install`
3. Rode em desenvolvimento:
   - `npm run dev`
4. Build de producao:
   - `npm run build`

## Fluxo de uso
1. Digite um termo e clique em `Adicionar`.
2. Repita para montar a lista de palavras.
3. Clique em `Pesquisar` para consultar o servidor.
4. Ajuste os filtros:
   - `Informacoes exibidas na tabela`
   - `Situacao do fundo`
5. Ordene clicando no titulo da coluna.
6. Redimensione coluna arrastando a borda direita do cabecalho.

## Selecao e exportacao
- Use o checkbox no cabecalho para selecionar/desmarcar todas as linhas visiveis.
- Use os checkboxes das linhas para selecao individual.
- `Exportar todos`: exporta todos os resultados atualmente exibidos.
- `Exportar selecionados`: aparece quando ha 1 ou mais linhas selecionadas e exporta apenas essas linhas.

## Observacoes
- A ordenacao preserva agrupamento por `CNPJ`.
- As palavras adicionadas podem ser removidas pelo `x` no hover de cada chip.
- Se o servidor estiver indisponivel, a interface mostra alerta de erro de conexao.
