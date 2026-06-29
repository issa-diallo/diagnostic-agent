# Implementation: skills métier pour l’agent diagnostic

## Changements réalisés
- Ajout des types `DiagnosticSkillId` et `DiagnosticSkill`.
- Ajout du pack de six skills métier :
  - `process-discovery`
  - `manual-work-detection`
  - `roi-diagnostic`
  - `automation-feasibility`
  - `poc-mvp-recommendation`
  - `commercial-synthesis`
- Chaque skill contient : objectif, quand l’utiliser, questions, signaux, raisonnement, format de sortie et erreurs à éviter.
- Chaque question active une ou plusieurs skills métier.
- L’UI affiche la skill métier active pendant l’entretien.
- Ajout d’un encart `Skills métier` avec skill active, signaux manuels détectés et garde-fou ROI/exemples réels.
- Ajout de la détection de signaux : copier-coller, saisie manuelle, lecture PDF, transformation Excel, emails répétitifs, contrôle entre fichiers, recherche d’informations et génération de documents.
- Extension de la recommandation : `Ne rien faire`, `Audit complémentaire`, `POC`, `MVP`, `Projet complet`.
- Enrichissement de la synthèse avec méthode de diagnostic, risques/garde-fous, phrase commerciale et prochaine étape.
- Enrichissement de la fiche CRM avec les signaux de travail manuel.
- Renforcement du prompt système LLM pour utiliser ces skills mentalement et rester prudent commercialement.

## Principe retenu
Les skills ne servent pas à coder. Elles guident le comportement de l’agent pendant le rendez-vous : comprendre le processus, détecter le manuel répétitif, calculer le ROI, tester la faisabilité, recommander prudemment et produire une synthèse exploitable.
