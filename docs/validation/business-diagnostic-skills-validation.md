# Validation: skills métier pour l’agent diagnostic

## Commandes exécutées

```bash
npm run lint
```
Résultat : succès.

```bash
npm run build
```
Résultat : succès. Next.js compile, TypeScript passe, 6 pages générées.

## Smoke test navigateur
Environnement : serveur local production `npm run start -- -H 0.0.0.0` sur `http://127.0.0.1:3000`.

Checks :
- [x] La page charge.
- [x] Le diagnostic démarre.
- [x] La première question reste naturelle : `Pour commencer, vous pouvez me rappeler le nom de votre entreprise ?`
- [x] L’UI affiche `Skill métier active : Process discovery`.
- [x] L’encart `Skills métier` apparaît dans la colonne latérale.
- [x] Aucun message d’erreur console pertinent observé pendant le smoke test.

## Correction pendant validation
Le premier build a révélé une erreur TypeScript sur le typage des tuples de détection de signaux. Correction appliquée avec `Array<[string, RegExp]>`, puis build réussi.
