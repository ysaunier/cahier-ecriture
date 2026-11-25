const { app, BrowserWindow, ipcMain, dialog, Menu, shell, nativeImage, screen } = require("electron");
const path = require("path");
const fs = require("fs/promises");
const fsSync = require("fs");
const pkg = require("./package.json");
const support = require("./support.js");

const APP_NAME = pkg.productName;
const AUTHOR = typeof pkg.author === "string" ? pkg.author : pkg.author.name;
const ICON = path.join(__dirname, "build", "icon.png");
const PAGE_SIZES = { letter: "Letter", a4: "A4" };
const EXERCISES = [
  { id: "ecriture", label: "Écriture" },
  { id: "calcul", label: "Calcul" },
];

let win;

// Version et système joints aux rapports de bug et aux courriels de contact
const supportEnv = () => ({
  platform: process.platform,
  systemVersion: process.getSystemVersion(),
  arch: process.arch,
  electron: process.versions.electron,
});
const openSupport = name => {
  const url = support.supportLink(name, pkg, supportEnv());
  if (url) shell.openExternal(url);
};
const EMAIL = support.contactEmail(pkg);

// Une seule fenêtre : relancer l'app ramène la fenêtre existante au premier plan
if (!app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

const send = command => win && win.webContents.send("cahier:menu", command);

function showAbout() {
  dialog.showMessageBox(win, {
    type: "none",
    icon: nativeImage.createFromPath(ICON),
    title: `À propos de ${APP_NAME}`,
    message: APP_NAME,
    detail: [
      `Version ${app.getVersion()}`,
      `Auteur : ${AUTHOR}`,
      "Logiciel libre et gratuit, licence MIT.",
      ...(EMAIL ? [`Contact : ${EMAIL}`] : []),
      "",
      pkg.description,
      "",
      "Polices Playwrite FR (TypeTogether), licence SIL Open Font License 1.1.",
      `Electron ${process.versions.electron} · Chromium ${process.versions.chrome}`,
      "",
      pkg.homepage,
    ].join("\n"),
    buttons: ["Fermer", "Voir sur GitHub", "Signaler un problème"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  }).then(({ response }) => {
    if (response === 1) openSupport("home");
    else if (response === 2) openSupport("bug");
  });
}

const IS_MAC = process.platform === "darwin";

function buildMenu() {
  return Menu.buildFromTemplate([
    // Sur macOS, le premier menu porte le nom de l'application
    ...(IS_MAC ? [{
      label: APP_NAME,
      submenu: [
        { label: `À propos de ${APP_NAME}`, click: showAbout },
        { type: "separator" },
        { label: "Préférences…", accelerator: "Cmd+,", click: () => send("prefs") },
        { type: "separator" },
        { label: `Masquer ${APP_NAME}`, role: "hide" },
        { label: "Masquer les autres", role: "hideOthers" },
        { label: "Tout afficher", role: "unhide" },
        { type: "separator" },
        { label: `Quitter ${APP_NAME}`, role: "quit" },
      ],
    }] : []),
    {
      label: "&Fichier",
      submenu: [
        { label: "Imprimer…", accelerator: "CmdOrCtrl+P", click: () => send("print") },
        { label: "Enregistrer en PDF…", accelerator: "CmdOrCtrl+S", click: () => send("pdf") },
        ...(IS_MAC ? [] : [
          { type: "separator" },
          { label: "Préférences…", accelerator: "Ctrl+,", click: () => send("prefs") },
          { type: "separator" },
          { label: "Quitter", accelerator: "Alt+F4", role: "quit" },
        ]),
      ],
    },
    // Édition : nécessaire sur macOS pour copier/coller dans les champs
    ...(IS_MAC ? [{
      label: "Édition",
      submenu: [
        { label: "Annuler", role: "undo" },
        { label: "Rétablir", role: "redo" },
        { type: "separator" },
        { label: "Couper", role: "cut" },
        { label: "Copier", role: "copy" },
        { label: "Coller", role: "paste" },
        { label: "Tout sélectionner", role: "selectAll" },
      ],
    }] : []),
    {
      label: "&Exercices",
      submenu: EXERCISES.map((ex, i) => ({
        label: ex.label,
        accelerator: `CmdOrCtrl+${i + 1}`,
        click: () => send(`tab:${ex.id}`),
      })),
    },
    {
      label: "&Affichage",
      submenu: [
        { label: "Zoom avant", role: "zoomIn", accelerator: "CmdOrCtrl+=" },
        { label: "Zoom arrière", role: "zoomOut" },
        { label: "Taille réelle", role: "resetZoom" },
        { type: "separator" },
        { label: "Plein écran", role: "togglefullscreen" },
        ...(app.isPackaged ? [] : [{ type: "separator" }, { label: "Outils de développement", role: "toggleDevTools" }]),
      ],
    },
    {
      label: "&Aide",
      submenu: [
        { label: "Aide", accelerator: "F1", click: () => send("help") },
        { label: "Nouveautés", click: () => send("news") },
        { label: "Rechercher une mise à jour…", click: () => send("update") },
        { type: "separator" },
        { label: "Signaler un problème…", click: () => openSupport("bug") },
        { label: "Proposer une idée…", click: () => openSupport("idea") },
        ...(EMAIL ? [{ label: "Nous écrire…", click: () => openSupport("contact") }] : []),
        { label: "Page du projet sur GitHub", click: () => openSupport("home") },
        ...(IS_MAC ? [] : [{ type: "separator" }, { label: `À propos de ${APP_NAME}`, click: showAbout }]),
      ],
    },
  ]);
}

/* ---- Taille et position de la fenêtre, retrouvées à la réouverture ---- */
const BOUNDS_FILE = () => path.join(app.getPath("userData"), "fenetre.json");
function loadBounds() {
  try {
    const b = JSON.parse(fsSync.readFileSync(BOUNDS_FILE(), "utf8"));
    // On ignore une position hors des écrans actuels (écran débranché, par exemple)
    const visible = screen.getAllDisplays().some(d => {
      const a = d.workArea;
      return b.x < a.x + a.width - 100 && b.x + b.width > a.x + 100 && b.y >= a.y - 20 && b.y < a.y + a.height - 100;
    });
    return visible ? b : { width: b.width, height: b.height, maximized: b.maximized };
  } catch (e) {
    return {};
  }
}
function saveBounds() {
  if (!win || win.isDestroyed()) return;
  const b = { ...win.getNormalBounds(), maximized: win.isMaximized() };
  try { fsSync.writeFileSync(BOUNDS_FILE(), JSON.stringify(b)); } catch (e) { /* tant pis */ }
}

function createWindow() {
  const saved = loadBounds();
  win = new BrowserWindow({
    width: saved.width || 1320,
    height: saved.height || 920,
    x: saved.x,
    y: saved.y,
    minWidth: 960,
    minHeight: 620,
    title: APP_NAME,
    icon: ICON,
    backgroundColor: "#eef0f4",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  Menu.setApplicationMenu(buildMenu());
  win.loadFile(path.join(__dirname, "src", "index.html"));
  win.once("ready-to-show", () => {
    if (saved.maximized) win.maximize();
    win.show();
  });
  win.on("close", saveBounds);
  // Aucun lien ne s'ouvre dans l'app : les liens web partent dans le navigateur
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", e => e.preventDefault());
}

ipcMain.handle("cahier:info", () => ({
  name: APP_NAME,
  version: app.getVersion(),
  author: AUTHOR,
  email: EMAIL,
  electron: process.versions.electron,
}));

/* ---- Nouvelle version disponible ? ----
   Une seule requête vers l'API publique de GitHub, sans aucune donnée personnelle.
   Rien n'est téléchargé : la fenêtre propose seulement d'ouvrir la page de la Release. */
ipcMain.handle("cahier:checkUpdate", async () => {
  const url = support.latestReleaseApi(pkg);
  if (!url) return { ok: false, error: "adresse du projet inconnue" };
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "cahier-ecriture" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false, error: `GitHub a répondu ${res.status}` };
    const latest = String((await res.json()).tag_name || "").replace(/^v/, "");
    const current = app.getVersion();
    return { ok: true, current, latest, newer: support.isNewer(latest, current) };
  } catch (err) {
    return { ok: false, error: err.name === "TimeoutError" ? "pas de réponse de GitHub" : String(err.message || err) };
  }
});

// La fenêtre ne passe qu'un nom de lien ; l'URL est choisie ici (liste fermée)
ipcMain.handle("cahier:open", (_e, name) => openSupport(String(name)));

/* ---- Export et import des réglages (fichier JSON choisi par l'utilisateur) ---- */
ipcMain.handle("cahier:exportSettings", async (_e, json) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "Exporter mes réglages",
    defaultPath: path.join(app.getPath("documents"), "cahier-reglages.json"),
    filters: [{ name: "Réglages du Cahier d'écriture", extensions: ["json"] }],
  });
  if (canceled || !filePath) return { ok: false };
  try {
    await fs.writeFile(filePath, String(json), "utf8");
    return { ok: true, path: filePath };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

ipcMain.handle("cahier:importSettings", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: "Importer des réglages",
    defaultPath: app.getPath("documents"),
    filters: [{ name: "Réglages du Cahier d'écriture", extensions: ["json"] }],
    properties: ["openFile"],
  });
  if (canceled || !filePaths.length) return { ok: false };
  try {
    const stat = await fs.stat(filePaths[0]);
    if (stat.size > 1024 * 1024) return { ok: false, error: "fichier trop gros pour des réglages" };
    return { ok: true, text: await fs.readFile(filePaths[0], "utf8") };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

ipcMain.handle("cahier:print", (_e, paper) => new Promise(resolve => {
  win.webContents.print({
    silent: false,
    printBackground: true,
    pageSize: PAGE_SIZES[paper] || "Letter",
    margins: { marginType: "none" },
  }, (ok, error) => resolve({ ok, error: ok ? null : error }));
}));

ipcMain.handle("cahier:pdf", async (_e, paper, label) => {
  const day = new Date().toISOString().slice(0, 10);
  const name = `${(label || "feuille").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}-${day}.pdf`;
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "Enregistrer la feuille en PDF",
    defaultPath: path.join(app.getPath("documents"), name),
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (canceled || !filePath) return { ok: false };
  try {
    const data = await win.webContents.printToPDF({
      pageSize: PAGE_SIZES[paper] || "Letter",
      printBackground: true,
      preferCSSPageSize: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    await fs.writeFile(filePath, data);
    shell.openPath(filePath);
    return { ok: true, path: filePath };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

app.setAppUserModelId("local.cahier-ecriture"); // même valeur que build.appId (retiré du package.json embarqué)
app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
// macOS : un clic sur l'icône du Dock rouvre la fenêtre si elle a été fermée
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
