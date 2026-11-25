/* Test de fumée : ouvre la vraie interface dans Electron, vérifie les deux exercices et l'export PDF.
   Usage : npx electron test/smoke/smoke.js   (sous Linux : xvfb-run … --no-sandbox) */
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const ROOT = path.join(__dirname, "..", "..");
// Profil vierge à chaque fois : aucun réglage mémorisé ne doit influencer le test
app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "cahier-smoke-")));
const pkg = require(path.join(ROOT, "package.json"));
const errors = [];
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "ok    " : "ÉCHEC "} ${name}${detail ? ` (${detail})` : ""}`);
}

const wait = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(win, expr, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await win.webContents.executeJavaScript(`Boolean(${expr})`)) return true;
    await wait(200);
  }
  return false;
}

// Une « nouvelle version » factice, pour vérifier le bandeau sans appeler GitHub
ipcMain.handle("cahier:checkUpdate", () => ({ ok: true, current: pkg.version, latest: "99.0.0", newer: true }));
ipcMain.handle("cahier:info", () => ({ name: pkg.productName, version: pkg.version, author: pkg.author.name, email: pkg.bugs.email, electron: process.versions.electron }));

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false, width: 1320, height: 920,
    webPreferences: { preload: path.join(ROOT, "preload.js"), contextIsolation: true, sandbox: true },
  });
  win.webContents.on("console-message", e => { if (e.level === "error") errors.push(e.message); });
  win.webContents.on("render-process-gone", (_e, d) => errors.push(`renderer: ${d.reason}`));

  try {
    await win.loadFile(path.join(ROOT, "src", "index.html"));
    const js = s => win.webContents.executeJavaScript(s);

    check("polices intégrées chargées", await waitFor(win,
      `document.fonts.check('400 20px "Playwrite FR Trad"') && document.fonts.check('400 20px "Playwrite FR Moderne"')`));

    check("mise à jour : bandeau affiché", await waitFor(win,
      `!document.getElementById("update").hidden && document.getElementById("update-text").textContent.includes("99.0.0")`));
    await js(`document.getElementById("update-later").click()`);
    check("mise à jour : « Plus tard » masque le bandeau", await js(`document.getElementById("update").hidden`));
    check("écriture : feuilles générées", await waitFor(win, `document.querySelectorAll("#e-pages .page").length > 0`));
    check("écriture : tirets tracés", await waitFor(win, `document.querySelectorAll("#e-pages .page path").length > 0`));
    check("écriture : saisie avec majuscules bâton", await waitFor(win,
      `getComputedStyle(document.getElementById("e-txt")).fontFamily.includes("Cahier Majuscules")`));

    // Trottoirs québécois : pointillé, plein, plein, pointillé ; plus de réglure Seyès
    check("panneau : rappel du papier et de la réglure", await js(`document.querySelector("#e-panel .pageinfo-text").textContent.includes("Seyès")`));
    await js(`document.querySelector("#e-panel .pageinfo-edit").click()`);
    check("préférences : s'ouvrent depuis le panneau", await js(`document.getElementById("prefs").open`));
    await js(`document.getElementById("p-ruling-trottoir").click(); document.getElementById("prefs").close()`);
    check("écriture : trottoirs québécois", await waitFor(win,
      `document.querySelectorAll("#e-pages .page line[stroke-dasharray]").length > 0 && !document.querySelector('#e-pages .page line[stroke="#8f9fd6"]')`));
    const pattern = await js(`[...document.querySelectorAll("#e-pages .page:first-child line")].slice(0, 4).map(l => l.hasAttribute("stroke-dasharray") ? "." : "-").join("")`);
    check("écriture : ordre pointillé, plein, plein, pointillé", pattern === ".--.", pattern);

    // Les réglages survivent à un rechargement de la fenêtre
    await js(`document.getElementById("e-txt").value = "Bonjour"; document.getElementById("e-txt").dispatchEvent(new Event("input"))`);
    await wait(600);
    await win.webContents.reload();
    await waitFor(win, `document.querySelectorAll("#e-pages .page").length > 0`);
    const kept = await js(`[document.getElementById("e-txt").value, document.querySelector("#e-panel .pageinfo-text").textContent.includes("Trottoirs")].join("|")`);
    check("réglages retrouvés après réouverture", kept === "Bonjour|true", kept);

    await js(`document.getElementById("tab-calcul").click()`);
    check("calcul : onglet affiché", await js(`!document.getElementById("ex-calcul").hidden`));
    check("calcul : feuille + corrigé", await waitFor(win, `document.querySelectorAll("#c-pages .page").length >= 2`));
    const boxes = await js(`document.querySelectorAll("#c-pages .page:first-child rect").length`);
    check("calcul : 20 cases sur la première feuille", boxes === 20, `${boxes} cases`);
    const widths = await js(`[...new Set([...document.querySelectorAll("#c-pages rect")].map(r => r.getAttribute("width")))]`);
    check("calcul : toutes les cases ont la même largeur", widths.length === 1, widths.join(", "));

    await js(`document.getElementById("c-add").click(); document.getElementById("c-sub").click();`);
    check("calcul : message si aucune opération", await waitFor(win, `document.querySelector("#c-pages .empty")`));
    await js(`document.getElementById("c-add").click(); document.getElementById("c-sub").click();`);
    check("calcul : feuille régénérée", await waitFor(win, `document.querySelectorAll("#c-pages .page rect").length >= 20`));

    check("calcul : fond blanc par défaut, même avec les trottoirs", await waitFor(win,
      `document.querySelector("#c-pages .page") && document.querySelectorAll("#c-pages .page:first-child line[stroke-dasharray]").length === 0 && document.getElementById("c-ruling").value === "none"`));
    await js(`document.getElementById("c-layout-column").click()`);
    check("calcul : opérations posées en colonnes", await waitFor(win,
      `document.querySelectorAll('#c-pages .page:first-child line[stroke="#1b2a55"]').length >= 4`));
    const colWidths = await js(`[...new Set([...document.querySelectorAll("#c-pages rect")].map(r => r.getAttribute("width")))]`);
    check("calcul en colonnes : cases de même largeur", colWidths.length === 1, colWidths.join(", "));

    await js(`document.getElementById("btn-prefs").click()`);
    check("préférences : bouton ⚙", await js(`document.getElementById("prefs").open`));
    await js(`const s = document.getElementById("p-paper"); s.value = "a4"; s.dispatchEvent(new Event("change"))`);
    check("préférences : A4 appliqué aux deux onglets", await waitFor(win,
      `[...document.querySelectorAll("#e-pages .page, #c-pages .page")].every(p => p.style.height === "297mm")`));
    const before = await js(`document.querySelectorAll("#e-pages text, #c-pages text").length`);
    await js(`document.getElementById("p-header").click()`);
    check("préférences : « Prénom / Date » retiré des deux onglets", await waitFor(win,
      `![...document.querySelectorAll("#e-pages text, #c-pages text")].some(t => t.textContent.startsWith("Prénom"))`), `${before} textes avant`);
    await js(`document.getElementById("p-header").click()`);
    await js(`document.getElementById("prefs").close()`);

    await js(`document.getElementById("btn-help").click()`);
    check("aide : s'ouvre", await js(`document.getElementById("help").open`));
    check("aide : version affichée", await waitFor(win, `document.getElementById("help-version").textContent.includes(${JSON.stringify(pkg.version)})`));
    check("aide : courriel de contact affiché", await waitFor(win, `document.getElementById("help-email").textContent.includes(${JSON.stringify(pkg.bugs.email)})`));
    check("aide : bouton « Signaler un problème »", await js(`!document.getElementById("help-bug").hidden`));
    await js(`document.getElementById("help").close()`);

    const pdf = await win.webContents.printToPDF({ pageSize: "Letter", printBackground: true, preferCSSPageSize: true });
    const out = path.join(os.tmpdir(), "cahier-smoke.pdf");
    fs.writeFileSync(out, pdf);
    check("export PDF", pdf.length > 20000, `${Math.round(pdf.length / 1024)} Ko`);

    check("aucune erreur dans la console", errors.length === 0, errors.join(" | "));
  } catch (err) {
    check("exécution sans exception", false, String(err && err.stack || err));
  }

  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} vérifications réussies`);
  app.exit(failed ? 1 : 0);
});
