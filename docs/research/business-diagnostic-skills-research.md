# Research: skills métier pour l’agent diagnostic

## Demande
Ajouter au diagnostic Packing Factory un pack de skills métier. L’agent ne doit pas agir comme un agent codeur, mais comme un consultant diagnostic / avant-vente / business analyst / expert automatisation / analyste ROI / chef de projet prudent.

## Fichiers analysés
- `src/app/page.tsx` : contient le flux guidé, les questions, la recommandation, les synthèses et l’UI.
- `src/app/api/chat/route.ts` : contient le prompt système utilisé par le proxy LLM.
- `docs/*adaptive-diagnostic-flow*` : documentation du précédent travail d’adaptation des questions au contexte client.

## Constat
Le flux couvrait déjà processus, cartographie, ROI, faisabilité et recommandation, mais les skills métier n’étaient pas explicitées dans le code ou dans la synthèse. La recommandation ne distinguait pas encore `audit complémentaire` et `projet complet`.

## Besoin fonctionnel
Créer un pack de six skills métier :
1. `process-discovery`
2. `manual-work-detection`
3. `roi-diagnostic`
4. `automation-feasibility`
5. `poc-mvp-recommendation`
6. `commercial-synthesis`

Chaque skill doit apporter : objectif, moment d’utilisation, questions, signaux à détecter, raisonnement, sortie attendue et erreurs à éviter.

## Contraintes
- Les skills doivent guider le comportement de l’agent, pas transformer l’app en outil de développement.
- Les questions restent naturelles et lisibles par Issa au client.
- L’agent doit rester prudent : exemples réels, qualité des données, validation humaine et ROI avant recommandation.
