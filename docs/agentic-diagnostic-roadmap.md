# Roadmap — transformer Diagnostic Agent en vrai agent IA métier

## Objectif général
Faire évoluer l’app existante sans repartir de zéro : conserver le mode guidé actuel comme filet de sécurité, puis ajouter un mode Agent IA capable d’utiliser des skills métier, de maintenir un état de diagnostic, de calculer un ROI, de recommander prudemment et de produire une synthèse commerciale exploitable.

## Étape 1 — Créer les skills Markdown

### Objectif
Créer le cerveau métier de l’agent sous forme de fichiers Markdown lisibles et versionnés.

### Fichiers à créer
- `src/lib/skills/process-discovery.md`
- `src/lib/skills/manual-work-detection.md`
- `src/lib/skills/roi-diagnostic.md`
- `src/lib/skills/automation-feasibility.md`
- `src/lib/skills/poc-mvp-recommendation.md`
- `src/lib/skills/commercial-synthesis.md`

### Comportement attendu
Chaque skill guide l’agent sur un angle métier : découverte du processus, détection du manuel répétitif, ROI, faisabilité, recommandation et synthèse.

### Critères d’acceptation
- Chaque fichier contient : objectif, quand utiliser, questions, signaux, raisonnement, sortie attendue, erreurs à éviter.
- Aucun changement UI requis pour cette étape seule.

### Risques
- Skills trop générales ou trop techniques.
- Oublier que les questions sont lues au client par Issa.

### À ne pas faire
- Ne pas installer de framework agent externe.
- Ne pas remplacer le mode guidé.

## Étape 2 — Créer l’orchestrateur agent

### Objectif
Créer une couche TypeScript séparée, testable, qui choisit la skill courante, calcule le ROI et produit une recommandation provisoire.

### Fichiers à créer
- `src/lib/agent/diagnostic-state.ts`
- `src/lib/agent/skill-loader.ts`
- `src/lib/agent/prompts.ts`
- `src/lib/agent/agent-orchestrator.ts`
- `src/lib/agent/diagnostic-agent.ts`

### Comportement attendu
L’orchestrateur doit fonctionner même sans clé API avec un fallback local prudent.

### Critères d’acceptation
- Types stricts.
- Pas de LangChain.
- Pas de dépendance externe inutile.
- Compatible Next.js App Router.

### Risques
- Créer trop d’abstraction trop tôt.
- Mélanger la logique existante de `page.tsx` avec la nouvelle couche agent.

### À ne pas faire
- Ne pas déplacer tout l’ancien formulaire.
- Ne pas rendre le LLM obligatoire.

## Étape 3 — Créer l’API `/api/agent`

### Objectif
Créer une API agentique dédiée, différente de `/api/chat`, pour traiter un message et mettre à jour l’état du diagnostic.

### Fichiers à créer
- `src/app/api/agent/route.ts`

### Comportement attendu
POST reçoit message, état, settings LLM optionnels. Retourne réponse, prochaine question, skill utilisée, étape, infos manquantes, état mis à jour et recommandation provisoire.

### Critères d’acceptation
- Validation basique.
- Limitation taille message.
- Aucun log de clé API.
- Fallback local si `apiKey` absent.

### Risques
- Exposer des secrets.
- Retourner des erreurs trop techniques au client.

### À ne pas faire
- Ne pas supprimer `/api/chat`.

## Étape 4 — Ajouter le mode Agent IA dans l’interface

### Objectif
Ajouter un mode chat de diagnostic sans casser le mode guidé existant.

### Fichiers à modifier
- `src/app/page.tsx`

### Comportement attendu
Toggle `Mode guidé` / `Mode Agent IA`, chat, état diagnostic, synthèse live, settings LLM, export JSON.

### Critères d’acceptation
- Le mode guidé reste disponible.
- Le mode agent fonctionne sans clé API.
- L’état est sauvegardé localement.

### Risques
- Page trop grosse.
- Confusion entre état guidé et état agent.

### À ne pas faire
- Ne pas supprimer les calculs et exports existants.

## Étape 5 — Ajouter la synthèse finale agentique

### Objectif
Produire une synthèse commerciale, un email de suivi et une note CRM.

### Fichiers à créer/modifier
- `src/app/api/agent/summary/route.ts`
- `src/app/page.tsx`

### Comportement attendu
La route utilise l’état, la skill commercial-synthesis, la recommandation et le LLM si disponible ; sinon fallback local.

### Critères d’acceptation
- Ne pas inventer les chiffres manquants.
- Si ROI incomplet : `ROI à compléter`.
- Si fichiers non fournis : audit ou POC, pas MVP.
- Boutons copier synthèse et mail.
- Synthèse incluse dans l’export JSON.

### Risques
- Surpromesse commerciale.
- Mail trop technique.

### À ne pas faire
- Ne pas promettre d’automatisation totale.

## Étape 6 — Plus tard seulement : CRM, PDF, analyse fichiers, base de données

### Objectif
Préparer la suite sans surcharger la V1.

### Évolutions futures
1. PostgreSQL + Prisma.
2. CRM HubSpot/Pipedrive/Notion/Airtable.
3. Export PDF.
4. Analyse Excel/PDF/emails.
5. Authentification.
6. Historique diagnostics.
7. RGPD et suppression fichiers.

### Risques
- Uploads et parsing augmentent fortement la surface sécurité.
- CRM et DB imposent auth, droits et modèle de données.

### À ne pas faire maintenant
- Pas d’upload fichier.
- Pas de DB.
- Pas d’intégration CRM.
- Pas de PDF.
