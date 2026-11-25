/* Exercice de calcul : opérations à trou (résultat ou terme manquant), avec corrigé. */
(function (C) {
  const { $, el } = C;
  const P = "c-";
  const STORE_KEY = "cahier-calcul";
  const FIELDS = ["add", "sub", "mul", "div", "min", "max", "count", "cols", "title", "ruling", "font", "size", "numbers", "answers", "seed"];
  const RADIOS = ["hole", "holeStyle", "layout"];
  const { OPS, generate } = C.mathGen;
  const MARGIN_X = 20, TOP = 14;
  const INK = "#1b2a55", ANSWER = "#c92a2a";

  const radio = name => (document.querySelector(`input[name="${P}${name}"]:checked`) || {}).value;
  const int = (id, def) => { const v = parseInt($(P + id).value, 10); return Number.isFinite(v) ? v : def; };

  function settings() {
    let min = Math.max(0, int("min", 0)), max = Math.max(0, int("max", 10));
    if (min > max) [min, max] = [max, min];
    return {
      ops: Object.keys(OPS).filter(k => $(P + k).checked),
      min, max,
      hole: radio("hole") || "after",
      holeStyle: radio("holeStyle") || "box",
      layout: radio("layout") === "column" ? "column" : "line",
      count: Math.min(200, Math.max(1, int("count", 20))),
      cols: Math.min(4, Math.max(1, int("cols", 2))),
      title: $(P + "title").value.trim(),
      paper: C.prefs.paper,
      ruling: $(P + "ruling").value,
      font: $(P + "font").value,
      size: int("size", 7),
      header: C.prefs.header,
      numbers: $(P + "numbers").checked,
      answers: $(P + "answers").checked,
      seed: int("seed", 1),
    };
  }

  function updatePreview(c) {
    const op = OPS[c.ops[0] || "add"].sym;
    const ex = { "+": [2, 3, 5], "−": [5, 3, 2], "×": [2, 3, 6], ":": [6, 3, 2] }[op];
    const prev = $(P + "preview");
    prev.classList.toggle("column", c.layout === "column");
    if (c.layout === "column") {
      // Un exemple posé : trou au résultat, ou sur le 2e nombre si le trou est avant le =
      const h = c.hole === "before" ? 1 : 2;
      const v = i => (i === h ? "☐" : String(ex[i]));
      prev.textContent = `  ${v(0)}
${op} ${v(1)}
───
  ${v(2)}`;
      return;
    }
    const t = h => [ex[0], op, ex[1], "=", ex[2]].map((v, i) => (i === [0, 2, 4][h] ? "☐" : v)).join(" ");
    prev.textContent = c.hole === "after" ? t(2) : c.hole === "before" ? `${t(0)}   ·   ${t(1)}` : `${t(2)}   ·   ${t(1)}`;
  }

  async function render() {
    const c = settings();
    $(P + "sizeVal").textContent = c.size + " mm";
    updatePreview(c);
    const out = $(P + "pages");
    out.replaceChildren();

    const items = generate(c);
    if (!items.length) {
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = "Coche au moins une opération pour créer la feuille.";
      out.appendChild(p);
      return;
    }

    const stack = `"${c.font}", "Segoe UI", sans-serif`;
    try { await document.fonts.load(`400 100px "${c.font}"`, "0123456789+−×:="); } catch (e) {}
    const m = t => C.measure(t, stack, 400);
    const digitR = (m("8").actualBoundingBoxAscent / 100) || 0.7;
    const fs = c.size / digitR;                       // taille de police pour que les chiffres fassent c.size mm
    const wOf = t => m(t).width / 100 * fs;
    const digitW = wOf("0");
    const gap = c.size * 0.45;
    const pad = c.size * 0.35;
    // Toutes les cases ont la même largeur sur la feuille : au moins 2 chiffres, ou plus si un nombre est plus long
    const digits = Math.max(2, ...items.flatMap(it => [it.a, it.b, it.r].map(v => String(v).length)));
    const holeW = digits * digitW + 2 * pad;

    const paper = C.paper.get(c.paper);
    const unit = c.ruling === "seyes" ? 8 : 5;
    const snap = v => TOP + Math.ceil((v - TOP) / unit - 1e-6) * unit;
    const column = c.layout === "column";
    // En colonnes : 1er nombre, signe + 2e nombre, barre, résultat (tous alignés à droite)
    const lh = c.size * 1.9;
    const barDy = lh + c.size * 0.6;
    const resDy = barDy + c.size * 1.75;
    const blockAbove = c.size * 1.4, blockBelow = resDy + c.size * 0.5;
    const pitch = column
      ? Math.ceil((blockAbove + blockBelow + c.size * 1.2) / unit - 1e-6) * unit
      : Math.ceil((c.size * 2.6) / unit - 1e-6) * unit;
    const below = column ? blockBelow : 0;
    const bottom = paper.h - 12;
    const x0 = MARGIN_X + 6, contentW = paper.w - 10 - x0;
    const colW = contentW / c.cols;
    const numW = c.numbers ? c.size * 1.7 : 0;
    const cw = digitW * 1.15;                         // largeur d'une colonne de chiffres
    const signW = Math.max(wOf("+"), wOf("×"), wOf("−")) + c.size * 0.6;

    const box = (svg, x, y, w) => el("rect", { x, y: y - c.size * 1.35, width: w, height: c.size * 1.75, rx: 1.2,
      fill: "#fff", stroke: "#5d6679", "stroke-width": 0.35 }, svg);
    const answer = (svg, x, y, v, anchor) => el("text", { x, y, "text-anchor": anchor, "font-family": stack,
      "font-size": fs, fill: ANSWER }, svg).textContent = String(v);

    const drawLine = (svg, x, y, it, withAnswers) => {
      const tokens = [it.a, OPS[it.op].sym, it.b, "=", it.r];
      tokens.forEach((tok, k) => {
        const isHole = (k === 0 && it.hole === 0) || (k === 2 && it.hole === 1) || (k === 4 && it.hole === 2);
        if (isHole) {
          const w = holeW;
          if (c.holeStyle === "box") box(svg, x, y, w);
          else el("line", { x1: x, x2: x + w, y1: y + c.size * 0.25, y2: y + c.size * 0.25, stroke: "#5d6679", "stroke-width": 0.4 }, svg);
          if (withAnswers) answer(svg, x + w / 2, y, tok, "middle");
          x += w + gap;
        } else {
          const s = String(tok);
          el("text", { x, y, "font-family": stack, "font-size": fs, fill: INK }, svg).textContent = s;
          x += wOf(s) + gap;
        }
      });
    };

    const drawColumn = (svg, x, y, it, withAnswers) => {
      const nd = digits; // même largeur pour tous les calculs posés
      const xr = x + signW + nd * cw;                 // bord droit des chiffres
      const lines = [[it.a, y], [it.b, y + lh], [it.r, y + resDy]];
      el("text", { x, y: y + lh, "font-family": stack, "font-size": fs, fill: INK }, svg).textContent = OPS[it.op].sym;
      el("line", { x1: x, x2: xr + pad, y1: y + barDy, y2: y + barDy, stroke: INK, "stroke-width": 0.45, "stroke-linecap": "round" }, svg);
      lines.forEach(([v, yy], k) => {
        if (k === it.hole) {
          // Le trou du résultat est sous la barre : une case seulement si demandé ; celui d'un nombre est toujours une case
          if (c.holeStyle === "box" || k !== 2) box(svg, xr - nd * cw - pad, yy, nd * cw + 2 * pad);
          if (withAnswers) answer(svg, xr, yy, v, "end");
        } else {
          el("text", { x: xr, y: yy, "text-anchor": "end", "font-family": stack, "font-size": fs, fill: INK }, svg).textContent = String(v);
        }
      });
    };

    const drawSheet = (withAnswers) => {
      let page, row = 0, rows = 0, firstBase = 0, i = 0;
      const addPage = () => {
        page = C.paper.newPage(out, c.paper, { ruling: c.ruling, interval: 2, cell: 5, top: TOP, marginX: MARGIN_X });
        let y = TOP + 6;
        if (c.header) { C.paper.header(page.svg, x0, y + 4); y += 12; }
        const title = withAnswers ? `Corrigé${c.title ? " : " + c.title : ""}` : c.title;
        if (title) {
          el("text", { x: x0, y: y + 7, "font-family": stack, "font-size": 7 / digitR * 0.9, fill: withAnswers ? ANSWER : INK }, page.svg).textContent = title;
          y += 14;
        }
        firstBase = snap(y + c.size * 1.4);
        rows = Math.max(1, Math.floor((bottom - below - firstBase) / pitch) + 1);
        row = 0;
      };
      addPage();
      while (i < items.length) {
        if (row >= rows) addPage();
        const y = firstBase + row * pitch;
        for (let col = 0; col < c.cols && i < items.length; col++, i++) {
          let x = x0 + col * colW;
          if (c.numbers) {
            el("text", { x: x + numW - c.size * 0.4, y, "text-anchor": "end", "font-family": "Segoe UI, sans-serif",
              "font-size": c.size * 0.75, fill: "#8a93a6" }, page.svg).textContent = `${i + 1}.`;
            x += numW;
          }
          (column ? drawColumn : drawLine)(page.svg, x, y, items[i], withAnswers);
        }
        row++;
      }
    };

    drawSheet(false);
    if (c.answers) drawSheet(true);
  }

  C.register({
    id: "calcul",
    label: "Calcul",
    init() {
      C.store.load(STORE_KEY, FIELDS, P);
      try {
        const saved = JSON.parse(C.store.get(STORE_KEY + "-radios", "{}"));
        for (const n of RADIOS) {
          const r = saved[n] && document.querySelector(`input[name="${P}${n}"][value="${saved[n]}"]`);
          if (r) r.checked = true;
        }
      } catch (e) {}
      const save = () => {
        C.store.save(STORE_KEY, FIELDS, P);
        C.store.set(STORE_KEY + "-radios", JSON.stringify(Object.fromEntries(RADIOS.map(n => [n, radio(n)]))));
      };
      C.bindPanel($(P + "panel"), () => { save(); render(); });
      $(P + "new").addEventListener("click", () => {
        $(P + "seed").value = String(Math.floor(Math.random() * 1e9) + 1);
        save();
        render();
        C.toast("Nouvelle série de calculs.");
      });
      return render();
    },
    render,
  });
})(window.Cahier);
