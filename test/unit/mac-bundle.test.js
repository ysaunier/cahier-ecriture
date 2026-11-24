const test = require("node:test");
const assert = require("node:assert/strict");
const pkg = require("../../package.json");

// Electron (macOS) retrouve ses helpers à partir de CFBundleName, puis vérifie octet par octet
// que le chemin résolu sur le disque est le même (CHECK_EQ dans AppendExtraCommandLineSwitches).
// electron-builder nomme les fichiers en NFD mais écrit CFBundleName tel quel (NFC) :
// avec un accent dans le nom, l'app plante au lancement du processus GPU.
test("macOS : CFBundleName est le nom du produit en forme NFD", () => {
  const bundleName = pkg.build.mac.extendInfo && pkg.build.mac.extendInfo.CFBundleName;
  assert.equal(bundleName, pkg.productName.normalize("NFD"),
    "build.mac.extendInfo.CFBundleName doit valoir productName.normalize(\"NFD\")");
});
