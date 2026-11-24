/* Exercice de calcul : opérations à trou (résultat ou terme manquant), avec corrigé. */
(function (C) {
  const { $, el } = C;
  const P = "c-";
  const STORE_KEY = "cahier-calcul";
  const FIELDS = ["add", "sub", "mul", "div", "min", "max", "count", "cols", "title", "paper", "ruling", "font", "size", "header", "numbers", "answers", "seed"];
  const RADIOS = ["hole", "holeStyle"];
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
      count: Math.min(200, Math.max(1, int("count", 20))),
      cols: Math.min(4, Math.max(1, int("cols", 2))),
      title: $(P + "title").value.trim(),
      paper: $(P + "paper").value,
      ruling: $(P + "ruling").value,
      font: $(P + "font").value,
      size: int("size", 7),
      header: $(P + "header").checked,
      numbers: $(P + "numbers").checked,
      answers: $(P + "answers").checked,
      seed: int("seed", 1),
    };
  }

  function updatePreview(c) {
    const op = OPS[c.ops[0] || "add"].sym;
    const ex = { "+": [2, 3, 5], "−": [5, 3, 2], "×": [2, 3, 6], ":": [6, 3, 2] }[op];
    const t = h => [ex[0], op, ex[1], "=", ex[2]].map((v, i) => (i === [0, 2, 4][h] ? "☐" : v)).join(" ");
    $(P + "preview").textContent = c.hole === "after" ? t(2) : c.hole === "before" ? `${t(0)}   ·   ${t(1)}` : `${t(2)}   ·   ${t(1)}`;
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
    const holeW = v => Math.max(2, String(v).length) * digitW + 2 * pad;

    const paper = C.paper.get(c.paper);
    const unit = c.ruling === "grid" ? 5 : c.ruling === "seyes" ? 8 : 5;
    const snap = v => TOP + Math.ceil((v - TOP) / unit - 1e-6) * unit;
    const pitch = Math.ceil((c.size * 2.6) / unit - 1e-6) * unit;
    const bottom = paper.h - 12;
    const x0 = MARGIN_X + 6, contentW = paper.w - 10 - x0;
    const colW = contentW / c.cols;
    const numW = c.numbers ? c.size * 1.7 : 0;

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
        rows = Math.max(1, Math.floor((bottom - firstBase) / pitch) + 1);
        row = 0;
      };
      addPage();
      while (i < items.length) {
        if (row >= rows) addPage();
        const y = firstBase + row * pitch;
        for (let col = 0; col < c.cols && i < items.length; col++, i++) {
          const it = items[i];
          let x = x0 + col * colW;
          if (c.numbers) {
            el("text", { x: x + numW - c.size * 0.4, y, "text-anchor": "end", "font-family": "Segoe UI, sans-serif",
              "font-size": c.size * 0.75, fill: "#8a93a6" }, page.svg).textContent = `${i + 1}.`;
            x += numW;
          }
          const tokens = [it.a, OPS[it.op].sym, it.b, "=", it.r];
          tokens.forEach((tok, k) => {
            const isHole = (k === 0 && it.hole === 0) || (k === 2 && it.hole === 1) || (k === 4 && it.hole === 2);
            if (isHole) {
              const w = holeW(tok);
              if (c.holeStyle === "box") {
                el("rect", { x, y: y - c.size * 1.35, width: w, height: c.size * 1.75, rx: 1.2,
                  fill: "#fff", stroke: "#5d6679", "stroke-width": 0.35 }, page.svg);
              } else {
                el("line", { x1: x, x2: x + w, y1: y + c.size * 0.25, y2: y + c.size * 0.25,
                  stroke: "#5d6679", "stroke-width": 0.4 }, page.svg);
              }
              if (withAnswers) {
                el("text", { x: x + w / 2, y, "text-anchor": "middle", "font-family": stack, "font-size": fs, fill: ANSWER }, page.svg)
                  .textContent = String(tok);
              }
              x += w + gap;
            } else {
              const s = String(tok);
              el("text", { x, y, "font-family": stack, "font-size": fs, fill: INK }, page.svg).textContent = s;
              x += wOf(s) + gap;
            }
          });
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
    paperKey: () => $(P + "paper").value,
    init() {
      C.paper.fillSelect($(P + "paper"));
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
