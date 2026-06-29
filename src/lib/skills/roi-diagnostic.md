# roi-diagnostic

## 1. Objectif
Estimer la valeur business du projet : temps gagné, gain mensuel, gain annuel, erreurs évitées et valeur commerciale indirecte.

## 2. Quand utiliser cette skill
Quand le processus, le volume et les étapes manuelles sont suffisamment compris.

## 3. Questions à poser
- Combien de minutes prend un dossier aujourd’hui ?
- Combien de dossiers par mois ?
- Combien de minutes resteraient avec un agent + validation humaine ?
- Quel coût horaire faut-il utiliser ?
- Que coûte une erreur typique ?
- Y a-t-il un impact client, retard, litige ou image ?

## 4. Signaux à détecter
- Temps par tâche.
- Volume mensuel.
- Coût horaire.
- Erreurs coûteuses.
- Retards clients.
- Opportunité commerciale indirecte.

## 5. Méthode de raisonnement
Calculer : minutes gagnées × volume mensuel ÷ 60 × coût horaire. Garder une hypothèse prudente : l’agent prépare, l’humain valide.

## 6. Format de sortie attendu
- Temps actuel.
- Temps cible.
- Volume mensuel.
- Heures économisées/mois.
- Gain mensuel.
- Gain annuel.
- Hypothèses et limites.

## 7. Erreurs à éviter
- Inventer des chiffres.
- Supposer 100 % d’automatisation.
- Recommander un MVP sans ROI clair.
- Ignorer la valeur des erreurs évitées.
