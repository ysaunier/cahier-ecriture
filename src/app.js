/* Coquille de l'application : onglets, menu, impression, aide. */
(function (C) {
  const { $ } = C;
  const api = window.cahier; // fourni par preload.js (absent si la page est ouverte dans un navigateur)
  let active = null;

  function show(id) {
    if (!C.exercises[id]) id = C.order[0];
    active = id;
    for (const ex of C.order) {
      $("ex-" + ex).hidden = ex !== id;
      $("tab-" + ex).setAttribute("aria-selected", String(ex === id));
      $("tab-" + ex).tabIndex = ex === id ? 0 : -1;
    }
    C.store.set("cahier-onglet", id);
  }

  async function doPrint() {
    const key = C.prefs.paper;
    C.paper.setPrintSize(key);
    if (!api) return window.print();
    const r = await api.print(key);
    C.toast(r.ok ? "Feuille envoyée à l'imprimante." : r.error ? `Impression impossible : ${r.error}` : "Impression annulée.");
  }

  async function doPdf() {
    const key = C.prefs.paper;
    C.paper.setPrintSize(key);
    if (!api) return C.toast("L'enregistrement en PDF n'est disponible que dans l'application.");
    const r = await api.savePdf(key, C.exercises[active].label);
    C.toast(r.ok ? `PDF enregistré : ${r.path}` : r.error ? `Erreur : ${r.error}` : "Enregistrement annulé.");
  }

  function openHelp(section) {
    const d = $("help");
    if (!d.open) d.showModal();
    const target = section && $(section);
    if (target) target.scrollIntoView({ block: "start" });
  }

  /* ---- Préférences : papier et réglure communs à tous les onglets ---- */
  const RULING_HINTS = {
    seyes: "France : interligne de 2 à 4 mm, marge rouge.",
    trottoir: "Québec : pointillé, deux lignes pleines, pointillé.",
    grid: "Carreaux de 5 mm.",
    none: "Page sans lignes.",
  };
  C.paper.fillSelect($("p-paper"));
  $("p-rulings").innerHTML = Object.entries(C.prefs.RULINGS).map(([k, label]) =>
    `<label for="p-ruling-${k}"><input type="radio" name="p-ruling" id="p-ruling-${k}" value="${k}">` +
    `<span><b>${label}</b><small>${RULING_HINTS[k]}</small></span></label>`).join("");
  function syncPrefs() {
    $("p-paper").value = C.prefs.paper;
    $("p-ruling-" + C.prefs.ruling).checked = true;
    $("p-header").checked = C.prefs.header;
    document.querySelectorAll(".pageinfo-text").forEach(e => (e.textContent = C.prefs.summary(!e.closest("#c-panel"))));
  }
  function openPrefs() {
    syncPrefs();
    if (!$("prefs").open) $("prefs").showModal();
  }
  $("p-paper").addEventListener("change", () => C.prefs.set("paper", $("p-paper").value));
  document.querySelectorAll('input[name="p-ruling"]').forEach(r =>
    r.addEventListener("change", () => { if (r.checked) C.prefs.set("ruling", r.value); }));
  $("p-header").addEventListener("change", () => C.prefs.set("header", $("p-header").checked));
  document.querySelectorAll(".pageinfo-edit").forEach(b => b.addEventListener("click", openPrefs));
  C.prefs.onChange(() => {
    syncPrefs();
    C.order.forEach(id => C.exercises[id].render());
  });
  syncPrefs();
  $("btn-prefs").addEventListener("click", openPrefs);
  $("prefs-close").addEventListener("click", () => $("prefs").close());
  $("prefs").addEventListener("click", e => { if (e.target === $("prefs")) $("prefs").close(); });
  $("p-reset").addEventListener("click", () => {
    if (!confirm("Rétablir tous les réglages d'origine ? Les mots saisis et les choix de chaque exercice seront perdus.")) return;
    C.store.replaceAll(null);
    location.reload();
  });
  if (api) {
    $("p-export").addEventListener("click", async () => {
      const data = { app: "cahier-ecriture", saved: new Date().toISOString(), settings: C.store.all() };
      const r = await api.exportSettings(JSON.stringify(data, null, 2));
      if (r.ok) C.toast(`Réglages exportés : ${r.path}`);
      else if (r.error) C.toast(`Erreur : ${r.error}`);
    });
    $("p-import").addEventListener("click", async () => {
      const r = await api.importSettings();
      if (!r.ok) { if (r.error) C.toast(`Erreur : ${r.error}`); return; }
      let data;
      try { data = JSON.parse(r.text); } catch (e) { data = null; }
      if (!data || data.app !== "cahier-ecriture" || typeof data.settings !== "object" || !data.settings) {
        C.toast("Ce fichier ne contient pas de réglages du Cahier d'écriture.");
        return;
      }
      C.store.replaceAll(data.settings);
      location.reload();
    });
  } else {
    $("p-export").hidden = $("p-import").hidden = true;
  }

  // Onglets : clic + flèches gauche/droite
  document.querySelectorAll(".tabs [role=tab]").forEach(btn => {
    btn.addEventListener("click", () => show(btn.dataset.tab));
    btn.addEventListener("keydown", e => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const i = C.order.indexOf(active) + (e.key === "ArrowRight" ? 1 : -1);
      const id = C.order[(i + C.order.length) % C.order.length];
      show(id);
      $("tab-" + id).focus();
    });
  });

  $("btn-print").addEventListener("click", doPrint);
  $("btn-pdf").addEventListener("click", doPdf);
  $("btn-help").addEventListener("click", () => openHelp("help-start"));
  $("help-close").addEventListener("click", () => $("help").close());
  $("help").addEventListener("click", e => { if (e.target === $("help")) $("help").close(); });

  // Hors de l'application (navigateur), on garde les raccourcis principaux
  if (!api) {
    document.addEventListener("keydown", e => {
      if (e.key === "F1") { e.preventDefault(); openHelp("help-start"); }
    });
  }

  if (api) {
    api.onMenu(cmd => {
      if (cmd === "print") doPrint();
      else if (cmd === "pdf") doPdf();
      else if (cmd === "help") openHelp("help-start");
      else if (cmd === "prefs") openPrefs();
      else if (cmd === "news") openHelp("help-news");
      else if (cmd.startsWith("tab:")) show(cmd.slice(4));
    });
    api.info().then(info => {
      $("help-version").textContent = `Version ${info.version}`;
      $("help-foot").textContent =
        `${info.name} ${info.version} · ${info.author} · Licence MIT · Polices Playwrite (TypeTogether), licence SIL OFL 1.1 · Electron ${info.electron}`;
      document.title = info.name;
      if (info.email) {
        $("help-email").textContent = ` : ${info.email}`;
        $("help-mail").hidden = false;
      }
    });
    $("help-bug").addEventListener("click", () => api.open("bug"));
    $("help-idea").addEventListener("click", () => api.open("idea"));
    $("help-mail").addEventListener("click", () => api.open("contact"));
  }

  show(C.store.get("cahier-onglet", C.order[0]));
  document.fonts.ready.then(() => Promise.all(C.order.map(id => C.exercises[id].init())));
})(window.Cahier);
