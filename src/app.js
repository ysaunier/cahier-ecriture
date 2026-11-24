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
    const key = C.exercises[active].paperKey();
    C.paper.setPrintSize(key);
    if (!api) return window.print();
    const r = await api.print(key);
    C.toast(r.ok ? "Feuille envoyée à l'imprimante." : r.error ? `Impression impossible : ${r.error}` : "Impression annulée.");
  }

  async function doPdf() {
    const key = C.exercises[active].paperKey();
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
      else if (cmd === "news") openHelp("help-news");
      else if (cmd.startsWith("tab:")) show(cmd.slice(4));
    });
    api.info().then(info => {
      $("help-version").textContent = `Version ${info.version}`;
      $("help-foot").textContent =
        `${info.name} ${info.version} · ${info.author} · Polices Playwrite (TypeTogether), licence SIL OFL 1.1 · Electron ${info.electron}`;
      document.title = info.name;
      if (info.email) {
        $("help-email").textContent = ` : ${info.email}`;
        $("help-mail").hidden = false;
      }
    });
    $("help-bug").addEventListener("click", () => api.open("bug"));
    $("help-mail").addEventListener("click", () => api.open("contact"));
  }

  show(C.store.get("cahier-onglet", C.order[0]));
  document.fonts.ready.then(() => Promise.all(C.order.map(id => C.exercises[id].init())));
})(window.Cahier);
