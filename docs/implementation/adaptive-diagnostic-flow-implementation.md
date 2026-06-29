# Implementation: flux de diagnostic adaptatif

## Changements réalisés
- Ajout d'une catégorie de projet (`emails`, `documents`, `crm`, `support`, `backoffice`, `logistics`, `other`) avec une configuration métier associée.
- Ajout d'une question de catégorisation au début du diagnostic pour orienter les questions suivantes.
- Ajout de `buildContextualQuestion()` pour formuler les questions comme Issa les lirait au client, avec rebond sur l'activité, le processus et la catégorie.
- Ajout de `buildContextualWhy()` pour expliquer brièvement pourquoi la question est posée sans devenir générique.
- Ajout d'un encart latéral `Contexte adapté` : catégorie, pièces à demander, exemples de tâches.
- Le transcript stocke maintenant `questionId` pour supporter les questions dynamiques et le retour arrière.
- La synthèse prospect et la fiche CRM incluent la catégorie et les cas d'usage probables.
- Le prompt système de `/api/chat` a été renforcé pour que l'agent pose une seule question orale, contextualisée, lisible en rendez-vous client.

## Exemple vérifié en navigateur local
Contexte injecté : activité `négoce/logistique`, catégorie `Logistique, commandes & fichiers`, processus `Contrôle des packing lists fournisseurs`.

Questions observées :
- `Pour que je vous pose les bonnes questions, votre sujet ressemble plutôt à quel type de besoin ?`
- `Dans négoce/logistique, quel processus précis voulez-vous qu’on regarde aujourd’hui ? Par exemple : contrôler une packing list, rapprocher commande et livraison, détecter un écart, préparer une notification.`
- Après réponse processus : `Sur Contrôle des packing lists fournisseurs, qu’est-ce qui vous fait perdre le plus de temps ou crée le plus de stress aujourd’hui ?`

## Notes
- L'application reste fonctionnelle sans LLM obligatoire.
- Les catégories peuvent être enrichies après tests terrain avec de nouveaux cas d'usage.
