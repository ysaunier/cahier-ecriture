#!/usr/bin/env node
/* Extrait du CHANGELOG la section d'une version, pour les notes de la Release GitHub.
   Usage : node scripts/release-notes.js 1.1.1 > notes.md */
const fs = require("node:fs");
const path = require("node:path");

function notesFor(markdown, version) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex(l => new RegExp(`^##\\s+${version.replace(/\./g, "\\.")}(\\s|$)`).test(l));
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  if (end < 0) end = lines.length;
  return lines.slice(start + 1, end).join("\n").trim() + "\n";
}

// Captures servies depuis main : adresse absolue, car les notes de Release n'acceptent pas de chemin relatif
const SHOTS = "https://raw.githubusercontent.com/ysaunier/cahier-ecriture/main/docs/screenshots";
const SCREENSHOTS = `## Aperçu

| Écriture | Calcul |
| --- | --- |
| ![Exercice d'écriture : modèle, trait plein à repasser, tirets, sur réglure Seyès](${SHOTS}/ecriture.png) | ![Exercice de calcul : additions à compléter sur petits carreaux](${SHOTS}/calcul.png) |
`;

const DOWNLOADS = `## Téléchargement

| Système | Fichier |
| --- | --- |
| Windows (installation) | \`Cahier-ecriture-installation.exe\` |
| Windows (sans installation) | \`Cahier-ecriture-portable.exe\` |
| macOS (Intel et Apple Silicon) | \`Cahier-ecriture-mac.dmg\` |

**Windows** : SmartScreen peut afficher un avertissement (application non signée) : « Informations complémentaires », puis « Exécuter quand même ».

**macOS** : l'application n'est pas notarisée par Apple. Au premier lancement, fais un clic droit sur l'app, puis « Ouvrir ». Si macOS indique qu'elle est endommagée, lance dans le Terminal : \`xattr -cr "/Applications/Cahier d'écriture.app"\`.
`;

if (require.main === module) {
  const version = (process.argv[2] || require("../package.json").version).replace(/^v/, "");
  const changelog = fs.readFileSync(path.join(__dirname, "..", "CHANGELOG.md"), "utf8");
  const notes = notesFor(changelog, version);
  if (!notes) {
    console.error(`Aucune section « ## ${version} » dans CHANGELOG.md`);
    process.exit(1);
  }
  process.stdout.write(`${SCREENSHOTS}\n${DOWNLOADS}\n## Nouveautés\n\n${notes}`);
}

module.exports = { notesFor };
