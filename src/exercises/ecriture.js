/* Exercice d'écriture : modèle, trait plein gris, tirets sur le chemin du crayon, puis lignes vides. */
(function (C) {
  const { $, el } = C;
  const P = "e-";
  const STORE_KEY = "cahier-ecriture";
  const FIELDS = ["txt", "font", "customFont", "dotFont", "size", "tsize", "nGray", "nDot", "nEmpty", "adj", "bold", "caps", "repeat", "skip"];
  const CAPS = "Playwrite FR Moderne"; // ses majuscules sont en lettres bâton, même trait que la cursive
  const CAPS_RANGE = "U+0041-005A, U+00C0-00D6, U+00D8-00DE, U+0152, U+0178"; // A-Z et majuscules accentuées
  const MARGIN_X = 25, TOP = 14;
  const TEXT_X = { seyes: 28, grid: 28, none: 22, trottoir: 17 };
  const GRID_CELL = 5; // petits carreaux : le « x » fait un carreau
  const TROTTOIR_X = 12; // les trottoirs vont de 12 mm du bord gauche à 12 mm du bord droit
  const BOLD_LABELS = ["fin", "normal", "gras", "très gras", "feutre"];

  function settings() {
    const custom = $(P + "font").value === "__custom";
    return {
      phrases: $(P + "txt").value.split("\n").map(s => s.trim()).filter(Boolean),
      family: custom ? ($(P + "customFont").value.trim() || "Ecolier") : $(P + "font").value,
      variable: !custom, // les Playwrite sont variables (100 à 400)
      dotFamily: custom ? $(P + "dotFont").value.trim() : "",
      paper: C.prefs.paper,
      ruling: C.prefs.ruling,
      // Hauteur du « x » : interligne Seyès, bande du trottoir, ou un petit carreau
      interval: C.prefs.ruling === "trottoir" ? +$(P + "tsize").value
        : C.prefs.ruling === "grid" ? GRID_CELL : +$(P + "size").value,
      nGray: Math.max(0, +$(P + "nGray").value || 0),
      nDot: Math.max(0, +$(P + "nDot").value || 0),
      nEmpty: Math.max(0, +$(P + "nEmpty").value || 0),
      adj: +$(P + "adj").value / 100,
      bold: +$(P + "bold").value,
      caps: $(P + "caps").checked,
      repeat: $(P + "repeat").checked,
      skip: $(P + "skip").checked,
      header: C.prefs.header,
    };
  }

  /* ---- Zone de saisie : même rendu que la feuille ----
     Une police composite : « Cahier Majuscules » ne couvre que les majuscules (unicode-range),
     agrandies avec size-adjust pour atteindre la hauteur du « l » cursif ; tout le reste
     retombe sur la police cursive. */
  let capsFace = null, capsKey = "";
  async function syncTextarea(c, capRatio) {
    const ta = $(P + "txt");
    const cursive = `"${c.family}", cursive`;
    if (!c.caps) { ta.style.fontFamily = cursive; return; }
    const key = capRatio.toFixed(3);
    if (key !== capsKey) {
      if (capsFace) document.fonts.delete(capsFace);
      capsFace = new FontFace("Cahier Majuscules", 'url("../fonts/PlaywriteFRModerne.ttf")', {
        unicodeRange: CAPS_RANGE,
        sizeAdjust: (capRatio * 100).toFixed(1) + "%",
        weight: "100 400",
      });
      document.fonts.add(capsFace);
      capsKey = key;
      try { await capsFace.load(); } catch (e) { /* la cursive reste utilisée */ }
    }
    ta.style.fontFamily = `"Cahier Majuscules", ${cursive}`;
  }

  async function render() {
    const c = settings();
    $(P + "adjVal").textContent = Math.round(c.adj * 100) + " %";
    $(P + "boldVal").textContent = BOLD_LABELS[c.bold];
    $(P + "customBox").hidden = $(P + "font").value !== "__custom";
    $(P + "seyesBox").hidden = c.ruling !== "seyes" && c.ruling !== "none";
    $(P + "trottoirBox").hidden = c.ruling !== "trottoir";
    const X0 = TEXT_X[c.ruling];

    const wNormal = c.variable ? 400 : "normal";
    const thick = c.bold === 0 ? 0 : c.interval * 0.045 * c.bold; // contour de la même couleur = trait plus épais
    try {
      await Promise.all([
        document.fonts.load(`400 100px "${c.family}"`, "éxlça"),
        document.fonts.load(`400 100px "${CAPS}"`, "ÉEL"),
      ]);
    } catch (e) {}

    // La hauteur du « x » fait exactement une interligne Seyès
    const xr = (C.measure("x", c.family, wNormal).actualBoundingBoxAscent / 100) || 0.45;
    const fs = c.interval / xr * c.adj;
    // Majuscules bâton : même hauteur que le « l » cursif
    const capR = (C.measure("E", CAPS, 400).actualBoundingBoxAscent / 100) || 0.7;
    const lR = (C.measure("l", c.family, wNormal).actualBoundingBoxAscent / 100) || 3 * xr;
    // Seyès : majuscules à la hauteur du « l » ; trottoir : jusqu'au pointillé du haut (2 bandes)
    const capFs = fs * (c.ruling === "trottoir" ? 2 * xr : lR) / capR;
    syncTextarea(c, capFs / fs);


    const CAP_GAP = c.interval * 0.35; // petit espace après une majuscule bâton (non liée)
    const runs = s => c.caps
      ? (s.match(/\p{Lu}+|[^\p{Lu}]+/gu) || []).map(t => ({ t, cap: /\p{Lu}/u.test(t) }))
      : [{ t: s, cap: false }];
    const widthMM = s => runs(s).reduce((w, r) => w + (r.cap
      ? C.measure(r.t, CAPS, 400).width / 100 * capFs + CAP_GAP
      : C.measure(r.t, c.family, wNormal).width / 100 * fs), 0);
    const fillText = (textEl, s) => {
      let dx = 0; // l'espace après une majuscule se met sur le morceau suivant
      for (const r of runs(s)) {
        const attrs = r.cap ? { "font-family": `"${CAPS}", sans-serif`, "font-size": capFs } : {};
        if (dx) attrs.dx = dx;
        el("tspan", attrs, textEl).textContent = r.t;
        dx = r.cap ? CAP_GAP : 0;
      }
    };

    const dashCache = new Map();
    const dashesFor = s => {
      if (!dashCache.has(s)) {
        dashCache.set(s, C.skeletonDashes({
          widthMM: widthMM(s), aboveMM: c.interval * 4.5, belowMM: c.interval * 3,
          dashMM: c.interval * 0.42, gapMM: c.interval * 0.2,
          draw: (g, x, base, S) => {
            for (const r of runs(s)) {
              g.font = `${wNormal} ${(r.cap ? capFs : fs) * S}px "${r.cap ? CAPS : c.family}", cursive`;
              g.fillText(r.t, x, base);
              x += g.measureText(r.t).width + (r.cap ? CAP_GAP * S : 0);
            }
          },
        }));
      }
      return dashCache.get(s);
    };

    const paper = C.paper.get(c.paper);
    const bottom = paper.h - 10;
    const b = c.interval;
    let textEnd, pitch, firstBase, rowsPerPage;
    if (c.ruling !== "trottoir") {
      // Seyès, petits carreaux ou blanc : une rangée tous les 4 « x »
      const big = b * 4;
      textEnd = paper.w - 10;
      pitch = big * (c.skip ? 2 : 1);
      firstBase = TOP + big * (c.header ? 2 : 1);
      rowsPerPage = Math.floor((bottom - 2 * b - firstBase) / pitch) + 1;
    } else {
      // Trottoir québécois : pointillé, plein, plein, pointillé, à intervalles égaux.
      // La ligne de base est la 2e ligne pleine ; le « x » remplit la bande du milieu.
      textEnd = paper.w - TROTTOIR_X - 3;
      pitch = b * 3 + b * (c.skip ? 3 : 2);
      firstBase = TOP + (c.header ? 10 : 0) + b * 3;
      rowsPerPage = Math.floor((bottom - b * 1.5 - firstBase) / pitch) + 1;
    }

    const lineText = t => {
      if (!c.repeat) return t;
      const sep = "  ";
      let s = t;
      while (widthMM(s + sep + t) <= textEnd - X0) s += sep + t;
      return s;
    };

    const out = $(P + "pages");
    out.innerHTML = "";
    let page = null, row = rowsPerPage;
    const placeText = (attrs, s, y) => fillText(el("text", { ...attrs, x: X0, y }, page.svg), s);
    const addPage = () => {
      page = C.paper.newPage(out, c.paper, {
        ruling: c.ruling === "trottoir" ? "none" : c.ruling, interval: b, cell: GRID_CELL, top: TOP, marginX: MARGIN_X,
      });
      row = 0;
      if (c.header) C.paper.header(page.svg, X0, c.ruling === "trottoir" ? TOP + 4 : TOP + b * 3);
      if (c.ruling === "trottoir") {
        for (let r = 0; r < rowsPerPage; r++) C.paper.trottoir(page.svg, firstBase + r * pitch, b, TROTTOIR_X, paper.w - TROTTOIR_X);
      }
    };

    const blocks = c.phrases.length ? c.phrases : [""];
    for (const t of blocks) {
      const kinds = ["model", ...Array(c.nGray).fill("gray"), ...Array(c.nDot).fill("dot"), ...Array(c.nEmpty).fill("empty")];
      // Garde un bloc entier sur la même page quand c'est possible
      if (row + kinds.length > rowsPerPage && (row > 0 || !page)) addPage();
      const txt = lineText(t);
      for (const kind of kinds) {
        if (row >= rowsPerPage) addPage();
        const y = firstBase + row * pitch;
        row++;
        if (kind === "empty" || !t) continue;
        const base = {
          "font-size": fs, "font-family": `"${c.family}", cursive`,
          style: "font-feature-settings:'calt' 1, 'liga' 1; font-kerning: normal",
        };
        const solid = color => ({ ...base, "font-weight": c.bold === 0 ? 250 : wNormal, fill: color, stroke: color, "stroke-width": thick, "stroke-linejoin": "round" });
        if (kind === "model") {
          placeText(solid("#111"), txt, y);
        } else if (kind === "gray") {
          placeText(solid("#b9bfcc"), txt, y);
        } else if (c.dotFamily) {
          placeText({ ...base, "font-family": `"${c.dotFamily}", cursive`, fill: "#6b7284" }, txt, y);
        } else {
          const d = dashesFor(txt).map(l => l.map(([px, py], i) =>
            `${i ? "L" : "M"}${(X0 + px).toFixed(2)} ${(y + py).toFixed(2)}`).join("")).join("");
          el("path", { d, fill: "none", stroke: "#4a5162", "stroke-linecap": "round", "stroke-linejoin": "round",
            "stroke-width": Math.max(0.25, c.interval * 0.09) }, page.svg);
        }
      }
    }
  }

  C.register({
    id: "ecriture",
    label: "Écriture",
    init() {
      C.store.load(STORE_KEY, FIELDS, P);
      C.bindPanel($(P + "panel"), () => { C.store.save(STORE_KEY, FIELDS, P); render(); });
      return render();
    },
    render,
  });
})(window.Cahier);
