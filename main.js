const { app, BrowserWindow, ipcMain, dialog, Menu, shell, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs/promises");
const pkg = require("./package.json");

const APP_NAME = pkg.productName;
const AUTHOR = typeof pkg.author === "string" ? pkg.author : pkg.author.name;
const ICON = path.join(__dirname, "build", "icon.png");
const PAGE_SIZES = { letter: "Letter", a4: "A4" };
const EXERCISES = [
  { id: "ecriture", label: "Écriture" },
  { id: "calcul", label: "Calcul" },
];

let win;

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
      "",
      pkg.description,
      "",
      "Polices Playwrite FR (TypeTogether), licence SIL Open Font License 1.1.",
      `Electron ${process.versions.electron} · Chromium ${process.versions.chrome}`,
      "",
      pkg.homepage,
    ].join("\n"),
    buttons: ["Fermer", "Voir sur GitHub"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  }).then(({ response }) => {
    if (response === 1) shell.openExternal(pkg.homepage);
  });
}

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: "&Fichier",
      submenu: [
        { label: "Imprimer…", accelerator: "CmdOrCtrl+P", click: () => send("print") },
        { label: "Enregistrer en PDF…", accelerator: "CmdOrCtrl+S", click: () => send("pdf") },
        { type: "separator" },
        { label: "Quitter", accelerator: "Alt+F4", role: "quit" },
      ],
    },
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
        { label: "Page du projet sur GitHub", click: () => shell.openExternal(pkg.homepage) },
        { label: "Signaler un problème", click: () => shell.openExternal(pkg.bugs.url) },
        { type: "separator" },
        { label: `À propos de ${APP_NAME}`, click: showAbout },
      ],
    },
  ]);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1320,
    height: 920,
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
  win.once("ready-to-show", () => win.show());
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
  electron: process.versions.electron,
}));

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
