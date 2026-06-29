# automation-feasibility

## 1. Objectif
Évaluer si l’automatisation est réaliste techniquement et opérationnellement.

## 2. Quand utiliser cette skill
Avant de recommander POC, MVP ou projet complet.

## 3. Questions à poser
- Avez-vous des exemples réels à montrer ?
- Les fichiers ont-ils toujours la même structure ?
- Les règles métier sont-elles écrites ?
- Y a-t-il beaucoup d’exceptions ?
- Quel résultat doit être validé par un humain ?
- Faut-il OCR, ERP, CRM ou autre intégration ?

## 4. Signaux à détecter
- Données sales.
- Fichiers variables.
- Règles floues.
- Exceptions nombreuses.
- Absence de modèle de sortie.
- Validateur non identifié.
- Dépendance ERP ou outil fermé.

## 5. Méthode de raisonnement
Plus les données, règles et sorties sont stables, plus on peut viser un MVP. Si les exemples manquent ou les règles sont floues, recommander audit ou POC limité.

## 6. Format de sortie attendu
- Faisabilité : faible, moyenne, forte.
- Risques.
- Prérequis.
- Exemples/fichiers à demander.
- Besoin de validation humaine.

## 7. Erreurs à éviter
- Promettre sans exemples réels.
- Sous-estimer les exceptions.
- Ignorer l’OCR ou les contraintes ERP.
- Oublier la validation humaine.
