# Cahier d'écriture

Application Windows (Electron) qui prépare des feuilles d'exercices à imprimer pour apprendre à écrire et à calculer.

## Exercices

| Onglet | Ce que fait la feuille |
| --- | --- |
| **Écriture** | Un mot par bloc : ligne modèle, trait plein gris à repasser, tirets qui suivent le chemin du crayon, lignes sans aide. Réglure Seyès, cursive scolaire liée, majuscules en lettres bâton. |
| **Calcul** | Opérations à trou (résultat ou terme manquant), case ou ligne, petits carreaux ou Seyès, corrigé sur une page à part. |

## Développer

```powershell
npm install
npm start
```

## Construire les exécutables

```powershell
npm run dist
```

Les fichiers sortent dans `dist/` : `Cahier-ecriture-installation.exe` et `Cahier-ecriture-portable.exe`.
NSIS ne lit pas les chemins de plus de 260 caractères : si la construction échoue sur `extractAppPackage.nsh`, copie le projet dans un dossier au chemin court (par exemple `C:\dev\cahier`) avant de lancer `npm run dist`.

## Organisation du code

```
main.js              fenêtre, menu, impression, PDF, « À propos »
preload.js           pont sécurisé entre la fenêtre et main.js
src/index.html       interface : onglets, panneaux, aide
src/styles.css       styles, polices intégrées, règles d'impression
src/app.js           onglets, menu, impression, aide
src/lib/core.js      papier (Seyès, quadrillage), réglages mémorisés, hasard reproductible
src/lib/skeleton.js  tirets sur la ligne médiane des lettres
src/exercises/       un fichier par exercice
fonts/               Playwrite FR Trad et Moderne (SIL OFL 1.1)
build/icon.png       icône de l'application
```

### Ajouter un exercice

1. Créer `src/exercises/mon-exercice.js` qui appelle `Cahier.register({ id, label, paperKey, init, render })`.
2. Ajouter dans `src/index.html` un bouton d'onglet `tab-<id>` et une section `ex-<id>` (panneau `aside` + `main.pages`), puis la balise `<script>`.
3. Ajouter l'entrée dans `EXERCISES` de `main.js` pour le menu et son raccourci.
4. Noter la nouveauté dans `CHANGELOG.md` et dans la section « Nouveautés » de l'aide, puis augmenter `version` dans `package.json`.

## Crédits

Polices Playwrite FR Trad et Playwrite FR Moderne, © The Playwrite Project Authors (TypeTogether), licence SIL Open Font License 1.1.

## Auteur

Yoann Saunier — [github.com/ysaunier](https://github.com/ysaunier)
