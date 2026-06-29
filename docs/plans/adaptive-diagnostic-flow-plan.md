# Plan: flux de diagnostic adaptatif et questions lisibles au client

## Objectif
Rendre le diagnostic moins générique et moins chronophage en configurant l'agent comme un assistant d'entretien : les questions doivent être directement lisibles au client par Issa, tenir compte des réponses déjà données et s'adapter à la catégorie du projet.

## Scope
- Ajouter une catégorie de diagnostic au début du parcours.
- Ajouter une base de connaissances légère par catégorie : tâches typiques, entrées, sorties, contrôles, outils et prochaines pièces à demander.
- Transformer les prompts fixes en questions contextuelles formulées comme Issa les dirait au client.
- Fiabiliser le transcript avec un `questionId` pour supporter les prompts dynamiques.
- Ajuster les synthèses/export pour inclure la catégorie et les fichiers à demander.
- Renforcer le prompt système de l'API chat pour aligner l'agent sur ce rôle, même si la page principale reste utilisable sans LLM.

## Hors scope
- Appel LLM obligatoire entre chaque question.
- Backend multi-utilisateur ou stockage serveur.
- Connexion CRM réelle.

## Fichiers à modifier
- `src/app/page.tsx`
- `src/app/api/chat/route.ts`
- `docs/research/adaptive-diagnostic-flow-research.md`
- `docs/plans/adaptive-diagnostic-flow-plan.md`

## Étapes d'implémentation
1. Définir `ProcessCategory`, `CategoryConfig` et `CATEGORY_CONFIGS`.
2. Ajouter `category` dans `DiagnosticState`.
3. Ajouter une question `category` de type choix après le contexte.
4. Créer `buildContextualQuestion(question, diagnostic)` pour générer une question client-friendly selon la catégorie et les réponses précédentes.
5. Utiliser la question contextualisée dans l'UI et le transcript.
6. Ajouter `questionId` dans le transcript et rendre le retour arrière compatible avec les anciens exports.
7. Adapter la synthèse prospect et la fiche CRM : catégorie, cas d'usage typiques, pièces à demander.
8. Renforcer `SYSTEM_PROMPT` pour que l'agent pose une seule question à la fois, en style oral, comme si Issa la lisait au client.
9. Valider avec lint et build.

## Validation
- `npm run lint`
- `npm run build`
- Inspection manuelle du rendu logique : catégorie sélectionnée → question suivante contextualisée.

## Risques
- Trop de catégories peut complexifier l'interface ; limiter à quelques familles métiers concrètes.
- Les prompts dynamiques doivent rester courts et naturels, pas scolaires.
