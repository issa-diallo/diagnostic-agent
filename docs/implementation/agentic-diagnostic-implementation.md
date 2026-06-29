# Implementation: agentic diagnostic

## Changements réalisés

### Skills Markdown
Création de `src/lib/skills/` avec :
- `process-discovery.md`
- `manual-work-detection.md`
- `roi-diagnostic.md`
- `automation-feasibility.md`
- `poc-mvp-recommendation.md`
- `commercial-synthesis.md`

Chaque skill contient objectif, moment d’utilisation, questions, signaux, raisonnement, sortie attendue et erreurs à éviter.

### Moteur agent
Création de `src/lib/agent/` avec :
- `diagnostic-state.ts` : types `DiagnosticAgentState`, `AgentResponse`, recommandations, synthèse.
- `skill-loader.ts` : charge les Markdown depuis `src/lib/skills`.
- `prompts.ts` : construit le system prompt avec les skills.
- `agent-orchestrator.ts` : sélection de skill, extraction locale d’informations, calcul ROI, recommandation.
- `diagnostic-agent.ts` : appel LLM compatible OpenAI/OpenRouter avec fallback local sans clé API.

### API agentique
Création de :
- `src/app/api/agent/route.ts`
- `src/app/api/agent/summary/route.ts`

`/api/chat` reste disponible.

### Interface
`src/app/page.tsx` conserve le mode guidé et ajoute un toggle :
- Mode guidé
- Agent IA

Le mode Agent IA contient :
- chat diagnostic,
- état du diagnostic,
- skill utilisée,
- infos manquantes,
- ROI,
- recommandation provisoire,
- synthèse live,
- génération de synthèse finale,
- copie synthèse/mail,
- export JSON incluant l’état agentique.

### Roadmap
Ajout de `docs/agentic-diagnostic-roadmap.md` avec les 6 étapes et les évolutions futures à ne pas implémenter maintenant : DB, CRM, PDF, analyse fichiers, auth, historique, RGPD.

## Choix importants
- Pas de LangChain.
- Pas de dépendance externe.
- L’agent fonctionne sans clé API via fallback local.
- Les clés API restent côté settings/localStorage et ne sont pas loggées.
- Le mode guidé reste un filet de sécurité pendant un rendez-vous.
