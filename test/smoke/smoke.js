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

ipcMain.handle("cahier:info", () => ({ name: pkg.productName, version: pkg.version, author: pkg.author.name, electron: process.versions.electron }));

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

    check("écriture : feuilles générées", await waitFor(win, `document.querySelectorAll("#e-pages .page").length > 0`));
    check("écriture : tirets tracés", await waitFor(win, `document.querySelectorAll("#e-pages .page path").length > 0`));
    check("écriture : saisie avec majuscules bâton", await waitFor(win,
      `getComputedStyle(document.getElementById("e-txt")).fontFamily.includes("Cahier Majuscules")`));

    await js(`document.getElementById("tab-calcul").click()`);
    check("calcul : onglet affiché", await js(`!document.getElementById("ex-calcul").hidden`));
    check("calcul : feuille + corrigé", await waitFor(win, `document.querySelectorAll("#c-pages .page").length >= 2`));
    const boxes = await js(`document.querySelectorAll("#c-pages .page:first-child rect").length`);
    check("calcul : 20 cases sur la première feuille", boxes === 20, `${boxes} cases`);

    await js(`document.getElementById("c-add").click(); document.getElementById("c-sub").click();`);
    check("calcul : message si aucune opération", await waitFor(win, `document.querySelector("#c-pages .empty")`));
    await js(`document.getElementById("c-add").click(); document.getElementById("c-sub").click();`);
    check("calcul : feuille régénérée", await waitFor(win, `document.querySelectorAll("#c-pages .page rect").length >= 20`));

    await js(`document.getElementById("btn-help").click()`);
    check("aide : s'ouvre", await js(`document.getElementById("help").open`));
    check("aide : version affichée", await waitFor(win, `document.getElementById("help-version").textContent.includes(${JSON.stringify(pkg.version)})`));
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
