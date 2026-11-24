const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { notesFor } = require("../../scripts/release-notes.js");

const changelog = fs.readFileSync(path.join(__dirname, "..", "..", "CHANGELOG.md"), "utf8");
const pkg = require("../../package.json");

test("le CHANGELOG contient une section pour la version du package.json", () => {
  const notes = notesFor(changelog, pkg.version);
  assert.ok(notes && notes.trim().length > 0, `Section « ## ${pkg.version} » absente du CHANGELOG`);
});

test("notesFor : extrait seulement la section demandée", () => {
  const md = "# Nouveautés\n\n## 2.0.0 — date\n\n- B\n\n## 1.0.0 — date\n\n- A\n";
  assert.equal(notesFor(md, "2.0.0").trim(), "- B");
  assert.equal(notesFor(md, "1.0.0").trim(), "- A");
  assert.equal(notesFor(md, "3.0.0"), null);
});

test("l'aide intégrée mentionne la version courante", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "..", "src", "index.html"), "utf8");
  assert.ok(html.includes(`<b>${pkg.version}</b>`), `Ajoute ${pkg.version} dans la section « Nouveautés » de l'aide`);
});
