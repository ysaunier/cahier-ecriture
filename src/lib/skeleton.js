/* Transforme un texte dessiné en image en tirets qui suivent le milieu du trait (le chemin du crayon). */
(function (C) {
  // Amincissement de Zhang-Suen : réduit chaque trait à une ligne d'un pixel
  function thin(img, w, h) {
    const del = [];
    let changed = true;
    while (changed) {
      changed = false;
      for (let step = 0; step < 2; step++) {
        del.length = 0;
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (!img[i]) continue;
          const p2 = img[i - w], p3 = img[i - w + 1], p4 = img[i + 1], p5 = img[i + w + 1],
                p6 = img[i + w], p7 = img[i + w - 1], p8 = img[i - 1], p9 = img[i - w - 1];
          const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (B < 2 || B > 6) continue;
          const A = (!p2 && p3) + (!p3 && p4) + (!p4 && p5) + (!p5 && p6) + (!p6 && p7) + (!p7 && p8) + (!p8 && p9) + (!p9 && p2);
          if (A !== 1) continue;
          if (step === 0 ? (p2 && p4 && p6) || (p4 && p6 && p8) : (p2 && p4 && p8) || (p2 && p6 && p8)) continue;
          del.push(i);
        }
        for (const i of del) img[i] = 0;
        if (del.length) changed = true;
      }
    }
  }

  // Parcourt le squelette et le découpe en tirets (dash pixels tracés, gap pixels vides)
  function walkDashes(img, w, h, dash, gap) {
    const nb = [-w, 1, w, -1, -w + 1, w + 1, w - 1, -w - 1];
    const deg = i => nb.reduce((n, o) => n + img[i + o], 0);
    const ends = [], rest = [];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (img[i]) (deg(i) === 1 ? ends : rest).push(i);
    }
    const seen = new Uint8Array(w * h);
    const out = [];
    const xy = i => { const x = i % w; return [x, (i - x) / w]; };
    for (const start of [...ends, ...rest]) {
      if (seen[start]) continue;
      const chain = [];
      let cur = start;
      while (cur >= 0) {
        seen[cur] = 1;
        chain.push(cur);
        let next = -1;
        for (let k = 0; k < 8; k++) {
          const j = cur + nb[k];
          if (img[j] && !seen[j]) { next = j; break; }
        }
        cur = next;
      }
      if (chain.length < 3) continue;
      let on = true, acc = 0, line = [xy(chain[0])], sinceLast = 0;
      for (let n = 1; n < chain.length; n++) {
        const [x0, y0] = xy(chain[n - 1]), [x1, y1] = xy(chain[n]);
        const len = Math.hypot(x1 - x0, y1 - y0);
        acc += len; sinceLast += len;
        if (on) {
          if (sinceLast >= 3 || acc >= dash) { line.push([x1, y1]); sinceLast = 0; }
          if (acc >= dash) { out.push(line); on = false; acc = 0; line = null; }
        } else if (acc >= gap) {
          on = true; acc = 0; sinceLast = 0; line = [[x1, y1]];
        }
      }
      if (on && line && line.length > 1) out.push(line);
    }
    return out;
  }

  /**
   * draw(g) dessine le texte dans un canvas (échelle S px/mm, origine décalée de padMM).
   * Renvoie des polylignes en mm, relatives à l'origine du texte.
   */
  C.skeletonDashes = function ({ widthMM, aboveMM, belowMM, padMM = 2, S = 16, dashMM, gapMM, draw }) {
    const w = Math.ceil((widthMM + 2 * padMM) * S), h = Math.ceil((aboveMM + belowMM) * S);
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const g = cv.getContext("2d");
    g.fillStyle = "#000";
    draw(g, padMM * S, aboveMM * S, S);
    const data = g.getImageData(0, 0, w, h).data;
    const img = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) img[i] = data[i * 4 + 3] > 110 ? 1 : 0;
    thin(img, w, h);
    return walkDashes(img, w, h, dashMM * S, gapMM * S)
      .map(l => l.map(([px, py]) => [px / S - padMM, py / S - aboveMM]));
  };
})(window.Cahier);
