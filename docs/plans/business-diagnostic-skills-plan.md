# Plan: skills métier pour l’agent diagnostic

## Objectif
Intégrer un pack de skills métier directement dans le comportement de Diagnostic Agent, afin qu’il mène l’entretien comme un consultant avant-vente prudent et orienté ROI.

## Scope
- Ajouter les six skills métier comme configuration structurée dans `src/app/page.tsx`.
- Afficher la skill active pendant l’entretien.
- Détecter les signaux de travail manuel répétitif.
- Étendre la recommandation à : ne rien faire, audit complémentaire, POC, MVP, projet complet.
- Enrichir la synthèse prospect et la fiche CRM avec méthode, signaux, risques, garde-fous et phrase commerciale.
- Renforcer le prompt système LLM avec ces skills.

## Hors scope
- Installer des skills AgentSkill externes.
- Connexion CRM ou n8n réelle.
- Refonte complète de l’interface.

## Étapes
1. Créer les types `DiagnosticSkillId` et `DiagnosticSkill`.
2. Ajouter `DIAGNOSTIC_SKILLS` avec objectif, questions, signaux, raisonnement, sortie attendue et erreurs à éviter.
3. Relier chaque question à une ou plusieurs skills actives.
4. Ajouter la détection de signaux manuels : copier-coller, saisie manuelle, PDF, Excel, emails répétitifs, contrôles entre fichiers, etc.
5. Mettre à jour la logique de recommandation.
6. Enrichir les documents finaux.
7. Valider avec lint/build et smoke test navigateur.

## Validation attendue
- `npm run lint`
- `npm run build`
- Vérifier que l’UI affiche une skill métier active et que la synthèse finale contient méthode/garde-fous.
