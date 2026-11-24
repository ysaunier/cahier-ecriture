/* Tirage des calculs, sans dépendance au navigateur : utilisé par l'onglet Calcul et par les tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Cahier.mathGen = api;
})(typeof self !== "undefined" ? self : this, function () {
  const OPS = {
    add: { sym: "+", calc: (a, b) => a + b },
    sub: { sym: "−", calc: (a, b) => a - b },
    mul: { sym: "×", calc: (a, b) => a * b },
    div: { sym: ":", calc: (a, b) => a / b },
  };

  /** Générateur pseudo-aléatoire (mulberry32) : même graine = même suite. */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Tire c.count calculs.
   * c = { ops: ["add"|"sub"|"mul"|"div"], min, max, hole: "after"|"before"|"mixed", count, seed }
   * Chaque calcul : { a, b, r, op, hole } avec hole 0 = premier terme, 1 = second terme, 2 = résultat.
   */
  function generate(c) {
    if (!c.ops || !c.ops.length) return [];
    const rnd = rng(c.seed);
    const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
    const items = [], seen = new Set();
    for (let tries = 0; items.length < c.count && tries < c.count * 60; tries++) {
      const op = c.ops[ri(0, c.ops.length - 1)];
      let a, b;
      if (op === "div") {
        b = ri(Math.max(1, c.min), Math.max(1, c.max)); // diviseur jamais nul
        a = b * ri(c.min, c.max);                        // division exacte
      } else {
        a = ri(c.min, c.max);
        b = ri(c.min, c.max);
        if (op === "sub" && b > a) [a, b] = [b, a];       // jamais de résultat négatif
      }
      const r = OPS[op].calc(a, b);
      const hole = c.hole === "after" ? 2 : c.hole === "before" ? ri(0, 1) : ri(0, 2);
      // Écarte les trous à plusieurs réponses possibles (☐ × 0 = 0, 0 × ☐ = 0, 0 : ☐ = 0)
      const ambiguous = (op === "mul" && ((hole === 0 && b === 0) || (hole === 1 && a === 0)))
        || (op === "div" && hole === 1 && a === 0);
      if (ambiguous) continue;
      const key = `${a}${op}${b}${hole}`;
      if (seen.has(key) && tries < c.count * 40) continue; // évite les doublons tant que possible
      seen.add(key);
      items.push({ a, b, r, op, hole });
    }
    return items;
  }

  return { OPS, rng, generate };
});
