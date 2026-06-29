# Research: flux de diagnostic adaptatif

## Résumé de la demande
L'utilisateur a testé l'application et constate que les questions ne rebondissent pas assez sur la réponse précédente. Le parcours est trop chronophage et trop générique alors que chaque personne, projet et contexte métier sont différents. Il faut configurer l'agent pour qu'il connaisse mieux sa tâche et dispose d'assez d'informations par catégorie.

## Fichiers analysés
- `AGENTS.md` : indique que la version de Next peut avoir des conventions différentes et demande de lire les guides Next sous `node_modules/next/dist/docs/`. Le dossier n'existe pas dans cette installation locale.
- `src/app/page.tsx` : contient tout le flux guidé côté client, les questions statiques, le calcul ROI, la recommandation et les exports.
- `src/app/api/chat/route.ts` : proxy OpenAI/OpenRouter avec un `SYSTEM_PROMPT` très court. Cette route n'est pas utilisée par la page principale actuelle.
- `src/app/settings/page.tsx` : configuration locale de la clé LLM.
- `package.json` : Next 16.2.9, React 19.2.4, scripts `lint` et `build`.

## Architecture actuelle
- La page principale affiche un questionnaire séquentiel basé sur un tableau constant `questions`.
- Chaque question a un `prompt` fixe, donc l'interface ne tient pas compte des réponses déjà données pour formuler la question suivante.
- L'état `DiagnosticState` stocke prospect, processus, cartographie, ROI, faisabilité et recommandation.
- Le transcript stocke uniquement le texte de la question et la réponse ; le retour arrière reconstruit l'état en cherchant la question par texte exact.
- La synthèse finale est générée localement, sans appel LLM.

## Contraintes
- Éviter une dépendance obligatoire au LLM : l'app doit rester utilisable sans clé API.
- Garder un parcours simple pour personne non technique.
- Ne pas exposer de secrets : les settings LLM restent côté navigateur.
- Le changement doit être validable par `npm run lint` et `npm run build`.

## Points d’attention
- Un flux 100 % statique donne des questions génériques et peut paraître hors sujet.
- Un flux trop libre via LLM peut devenir imprévisible et plus difficile à valider.
- Le retour arrière par texte de question est fragile si les prompts deviennent dynamiques.
- Il faut stocker un identifiant de question dans le transcript pour reconstruire proprement l'état.

## Questions ouvertes
- Les catégories exactes pourront évoluer après retours terrain. Proposition initiale : emails, documents/PDF, CRM/relances, support client, back-office, logistique/fichiers, autre.
