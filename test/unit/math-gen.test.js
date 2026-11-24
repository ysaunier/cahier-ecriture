const test = require("node:test");
const assert = require("node:assert/strict");
const { OPS, rng, generate } = require("../../src/lib/math-gen.js");

const base = { ops: ["add", "sub", "mul", "div"], min: 0, max: 10, hole: "mixed", count: 200, seed: 42 };

test("rng : même graine, même suite, valeurs dans [0, 1)", () => {
  const a = rng(7), b = rng(7);
  for (let i = 0; i < 1000; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});

test("generate : reproductible avec la même graine, différent avec une autre", () => {
  assert.deepEqual(generate(base), generate(base));
  assert.notDeepEqual(generate(base), generate({ ...base, seed: 43 }));
});

test("generate : aucune opération cochée donne une feuille vide", () => {
  assert.deepEqual(generate({ ...base, ops: [] }), []);
});

test("generate : respecte le nombre demandé", () => {
  for (const count of [1, 10, 20, 50]) {
    assert.equal(generate({ ...base, count }).length, count);
  }
});

test("generate : le résultat est toujours juste", () => {
  for (const it of generate(base)) {
    assert.equal(it.r, OPS[it.op].calc(it.a, it.b), JSON.stringify(it));
  }
});

test("generate : soustractions jamais négatives", () => {
  for (const it of generate({ ...base, ops: ["sub"] })) assert.ok(it.r >= 0, JSON.stringify(it));
});

test("generate : divisions exactes, diviseur jamais nul", () => {
  for (const it of generate({ ...base, ops: ["div"] })) {
    assert.ok(it.b > 0, JSON.stringify(it));
    assert.ok(Number.isInteger(it.r), JSON.stringify(it));
  }
});

test("generate : les nombres restent dans l'intervalle choisi", () => {
  const c = { ...base, min: 3, max: 9 };
  for (const it of generate(c)) {
    if (it.op === "div") {
      assert.ok(it.r >= 3 && it.r <= 9 && it.b >= 3 && it.b <= 9, JSON.stringify(it));
    } else {
      assert.ok(it.a >= 3 && it.a <= 9 && it.b >= 3 && it.b <= 9, JSON.stringify(it));
    }
  }
});

test("generate : place du trou selon le réglage", () => {
  assert.ok(generate({ ...base, hole: "after" }).every(it => it.hole === 2));
  const before = generate({ ...base, hole: "before" });
  assert.ok(before.every(it => it.hole === 0 || it.hole === 1));
  assert.ok(before.some(it => it.hole === 0) && before.some(it => it.hole === 1));
  const mixed = new Set(generate(base).map(it => it.hole));
  assert.deepEqual([...mixed].sort(), [0, 1, 2]);
});

test("generate : aucun trou à plusieurs réponses possibles", () => {
  for (let seed = 1; seed <= 50; seed++) {
    for (const it of generate({ ...base, ops: ["mul", "div"], seed })) {
      if (it.op === "mul") {
        assert.ok(!(it.hole === 0 && it.b === 0), JSON.stringify(it));
        assert.ok(!(it.hole === 1 && it.a === 0), JSON.stringify(it));
      } else {
        assert.ok(!(it.hole === 1 && it.a === 0), JSON.stringify(it));
      }
    }
  }
});

test("generate : pas de doublon quand il y a assez de calculs possibles", () => {
  const items = generate({ ...base, count: 20 });
  const keys = items.map(it => `${it.a}${it.op}${it.b}${it.hole}`);
  assert.equal(new Set(keys).size, keys.length);
});
