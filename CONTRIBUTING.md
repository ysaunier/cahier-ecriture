# Contribuer

Merci de vouloir améliorer Cahier d'écriture ! Ce guide s'adresse aux développeurs. Pour une idée ou un bug, pas besoin de coder : utilise les formulaires [Proposer une idée](https://github.com/ysaunier/cahier-ecriture/issues/new?template=suggestion.yml) ou [Signaler un bug](https://github.com/ysaunier/cahier-ecriture/issues/new?template=bug.yml).

En participant, tu acceptes le [code de conduite](CODE_OF_CONDUCT.md). Une faille de sécurité se signale en privé, voir [SECURITY.md](SECURITY.md).

## Règles du projet

- **Aucune donnée personnelle** dans le code, les tests, les exemples, les captures, les issues ou les commits : pas de nom d'enfant, d'école ou d'enseignant. Utilise « Papa », « Maman », « Bonjour ».
- **Interface et documentation en français**, avec le vocabulaire scolaire (réglure, trottoirs, corrigé…).
- **Pas de collecte de données** : aucune statistique, aucun traceur. Toute nouvelle connexion réseau doit être justifiée, désactivable et décrite dans [PRIVACY.md](PRIVACY.md).
- **Pas de dépendance d'exécution** sans bonne raison : l'application n'embarque que du code du dépôt et les polices.
- `npm run check` doit passer avant toute pull request.

## Démarrer

```powershell
npm install
npm start
```

| Commande | Rôle |
| --- | --- |
| `npm run lint` | Vérifie le code (ESLint) |
| `npm test` | Tests unitaires (tirage des calculs, versions, liens, notes de version) |
| `npm run test:smoke` | Ouvre la vraie interface dans Electron et vérifie les exercices, les préférences et l'export PDF |
| `npm run check` | Les trois à la suite |
| `npm run dist` | Construit les `.exe` Windows dans `dist/` |
| `npm run dist:mac` | Construit le `.dmg` macOS (sur un Mac uniquement) |

NSIS ne lit pas les chemins de plus de 260 caractères : si `npm run dist` échoue sur `extractAppPackage.nsh`, copie le projet dans un dossier au chemin court (par exemple `C:\dev\cahier`).

## Organisation du code

```
main.js                fenêtre, menu, impression, PDF, « À propos », mises à jour
preload.js             pont sécurisé entre la fenêtre et main.js
support.js             liens autorisés (bug, idée, courriel, Release), comparaison de versions
src/index.html         interface : onglets, panneaux, préférences, aide
src/styles.css         styles, polices intégrées, règles d'impression
src/app.js             onglets, menu, impression, préférences, aide, bandeau de mise à jour
src/lib/core.js        papier (Seyès, trottoirs, quadrillage), préférences, réglages mémorisés
src/lib/math-gen.js    tirage des calculs (aussi utilisé par les tests)
src/lib/skeleton.js    tirets sur la ligne médiane des lettres
src/exercises/         un fichier par exercice
test/unit/             tests unitaires (node:test)
test/smoke/            test de l'app complète dans Electron
scripts/               notes de version tirées du CHANGELOG
fonts/                 Playwrite FR Trad et Moderne (SIL OFL 1.1)
build/                 icône et écran de démarrage
docs/screenshots/      captures du README et des notes de Release
```

### Ajouter un exercice

1. Créer `src/exercises/mon-exercice.js` qui appelle `Cahier.register({ id, label, init, render })`. Le papier, la réglure et l'en-tête communs sont dans `Cahier.prefs`. Mettre la logique sans interface dans `src/lib/` pour pouvoir la tester comme `math-gen.js`.
2. Ajouter dans `src/index.html` un bouton d'onglet `tab-<id>` et une section `ex-<id>` (panneau `aside` + `main.pages`), puis la balise `<script>`.
3. Ajouter l'entrée dans `EXERCISES` de `main.js` pour le menu et son raccourci.
4. Ajouter des tests dans `test/unit/` et une vérification dans `test/smoke/smoke.js`.

## Pull requests

1. Crée une branche depuis `main`.
2. Fais une modification ciblée, avec ses tests.
3. Si l'interface change, joins une capture (avec des exemples neutres).
4. Ajoute une ligne dans la section en cours de `CHANGELOG.md`.
5. Ouvre la pull request : la CI lance le lint, les tests unitaires et le test de l'app sous Windows et macOS.

En contribuant, tu acceptes que ton code soit publié sous la [licence MIT](LICENSE) du projet.

## Intégration et livraison continues

| Workflow | Quand | Ce qu'il fait |
| --- | --- | --- |
| [CI](.github/workflows/ci.yml) | chaque push sur `main` et chaque pull request | lint, tests unitaires, test de l'app sous Windows et macOS |
| [Release](.github/workflows/release.yml) | chaque tag `vX.Y.Z` | vérifie que le tag correspond au `package.json`, relance les tests, construit Windows et macOS, publie la Release avec les notes du CHANGELOG |
| [Dependabot](.github/dependabot.yml) | chaque semaine | propose les mises à jour d'Electron, des outils et des actions |

Lancé à la main depuis l'onglet Actions, le workflow Release construit seulement les fichiers (téléchargeables dans le résumé du run), sans rien publier. Avec un tag existant dans le champ « tag » (ex. `v1.2.0`), il construit ce tag et publie la Release, ou la complète si elle a été créée depuis l'interface web de GitHub. Un tag avec un tiret (`v1.2.0-beta.1`) publie une préversion.

### Publier une version (mainteneur)

1. Ajouter une section `## X.Y.Z — date` en haut de `CHANGELOG.md`, et la même version dans la section « Nouveautés » de l'aide (`src/index.html`).
2. Changer la version, créer le commit et le tag, puis pousser :

   ```powershell
   npm version patch   # ou minor / major
   git push --follow-tags
   ```

3. Le workflow Release publie la Release quand les builds Windows et macOS ont réussi. Les tests refusent une version sans entrée dans le CHANGELOG ou dans l'aide.
4. Si GitHub renvoie une erreur (500/502) pendant la publication, la Release peut rester en brouillon avec tous ses fichiers : vérifier les tailles, puis la publier avec `gh release edit vX.Y.Z --draft=false --latest --notes-file notes.md` (notes : `node scripts/release-notes.js vX.Y.Z > notes.md`).
