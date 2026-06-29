# Diagnostic Agent

Open source AI-guided diagnostic assistant for deciding whether a manual business process deserves automation: nothing, POC, or MVP.

## Fonctionnalités

- Interface de chat en Next.js + Tailwind CSS.
- Page `/settings` pour enregistrer une clé API LLM, une Base URL compatible OpenAI et un modèle.
- Proxy API Next.js `/api/chat` compatible OpenRouter/OpenAI Chat Completions.
- Clé stockée côté navigateur via `localStorage` et envoyée seulement au moment d’un message.

## Démarrage local

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000), puis aller dans **Settings** pour ajouter la clé API.

## Validation

```bash
npm run lint
npm run build
```
