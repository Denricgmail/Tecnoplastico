# TecnoPlástico — Sistema de Gestão de Serviços

Inspeções (checklist de extrusora e impressora), serviços (proposta → aprovação → execução), cronograma por técnico, financeiro, clientes e parque de máquinas.

Versão de demonstração: os dados ficam salvos no navegador de quem usa (localStorage). O botão "Restaurar dados originais" volta aos dados das planilhas.

## Publicação (Vercel)
O projeto usa Vite. A Vercel publica sozinha a cada push na branch principal (`vercel.json` já define build `npm run build` e saída `dist`).

## Desenvolver
```
npm install
npm run dev      # http://localhost:3000
npm run build    # gera dist/
```

## Estrutura
- `src/main.tsx` — menu e rotas
- `src/views/` — telas (servicos, inspecoes, cronograma, financeiro, clientes, outros…)
- `src/logic.ts` — motor de preço, conflitos de agenda, alertas
- `src/data.ts` — dados semeados das planilhas
- `data/catalog.json` — catálogo de serviços (categorias, subcategorias, horas e equipes)
- `data/sched.json` — Cronograma Geral 2026 e Planejamento de viagem
- `src/styles.css` — visual (tela clara padrão, menu azul-marinho)

A consulta de CNPJ usa a BrasilAPI (com publica.cnpj.ws como reserva) e funciona no endereço publicado.
