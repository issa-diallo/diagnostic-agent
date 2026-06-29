# Diagnostic Agent

Mini-app Next.js de diagnostic projet pour aider pendant un rendez-vous prospect Packing Factory à décider honnêtement entre **ne rien faire**, **lancer un POC** ou **construire un MVP opérationnel**.

## Fonctionnalités

- Création d’un nouveau diagnostic prospect avec informations de base : entreprise, contact, activité, contexte et date de rendez-vous.
- Agent conducteur en 5 étapes : processus, cartographie, ROI, faisabilité, recommandation.
- Questions adaptatives selon les informations manquantes, avec exemples de relances à disposition.
- Champs structurés pour cartographier `Déclencheur → Entrées → Traitement → Contrôles → Sortie → Transmission`.
- Calcul automatique du gain par traitement, gain mensuel et gain annuel.
- Classification de faisabilité : simple, moyen ou complexe.
- Recommandation claire : ne rien faire / POC / MVP, avec justification opérationnelle.
- Synthèse prospect et fiche CRM interne générées et copiables.
- Sauvegarde locale du diagnostic en cours et export JSON pour suivi commercial.
- Page `/settings` conservée pour configurer une clé API LLM compatible OpenAI/OpenRouter si le proxy `/api/chat` est utilisé.

## Démarrage local

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run build
```
