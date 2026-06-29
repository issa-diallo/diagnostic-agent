# Validation: flux de diagnostic adaptatif

## Commandes exécutées

```bash
npm run lint
```
Résultat : succès (`eslint`).

```bash
npm run build
```
Résultat : succès. Next.js 16.2.9 compile, TypeScript passe, 6 pages statiques générées, route `/api/chat` dynamique.

## Validation navigateur

Environnement : serveur local production (`npm run start -- -H 0.0.0.0`) sur `http://127.0.0.1:3000`.

Checks :
- [x] La page charge sans erreur console pertinente.
- [x] Un état de diagnostic en cours est relu depuis `localStorage`.
- [x] La question de catégorie s'affiche avec des libellés métier : Emails, Documents/PDF/Excel, CRM, Support, Back-office, Logistique, Autre.
- [x] Après sélection de la catégorie logistique et saisie du processus, la question suivante rebondit sur la réponse précédente : `Sur Contrôle des packing lists fournisseurs...`.
- [x] L'encart `Contexte adapté` affiche la catégorie, les pièces à demander et des exemples métier.

## Limites de validation
- Aucun test automatisé n'existait dans le dépôt.
- La validation navigateur a été faite en smoke test local ciblé, pas en suite E2E permanente.
