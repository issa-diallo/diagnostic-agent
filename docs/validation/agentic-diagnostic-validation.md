# Validation: agentic diagnostic

## Commandes exécutées

```bash
npm run lint
```
Résultat : succès.

```bash
npx tsc --noEmit
```
Résultat : succès.

```bash
npm run build
```
Résultat : succès. Routes générées :
- `/`
- `/settings`
- `/api/chat`
- `/api/agent`
- `/api/agent/summary`

## Tests API locaux
Serveur local : `npm run start -- -H 0.0.0.0`.

### `/api/agent`
Payload sans clé API : message sur 20 packing lists/mois, 45 minutes par fichier Excel/PDF avec copier-coller.

Résultat vérifié :
- `monthlyVolume`: 20
- `timePerCaseMinutes`: 45
- `usedSkill`: `process-discovery`
- fallback local fonctionnel sans clé API.

### `/api/agent/summary`
Payload avec l’état retourné par `/api/agent`.

Résultat vérifié :
- `summaryMarkdown` généré.
- `followUpEmail` généré.
- `crmNote` générée.
- recommandation prudente `audit` quand les exemples/règles restent insuffisants.

## Smoke test navigateur
- Page chargée en local.
- Toggle `Agent IA` visible.
- Mode guidé conservé.
- Chat agent visible.
- Envoi d’un message client fonctionnel.
- État du diagnostic mis à jour avec ROI et recommandation provisoire.
- Encarts `État du diagnostic`, `Synthèse live`, `Synthèse finale` visibles.

## Notes
- Aucun secret affiché ou loggé.
- Le fallback local permet de conduire le rendez-vous même sans clé API.
