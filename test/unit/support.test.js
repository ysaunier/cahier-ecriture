const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const pkg = require("../../package.json");
const { describeSystem, bugReportUrl, contactUrl, supportLink } = require("../../support.js");

const env = { platform: "darwin", systemVersion: "26.7.3", arch: "arm64", electron: "45.4.1" };
const template = fs.readFileSync(path.join(__dirname, "..", "..", ".github", "ISSUE_TEMPLATE", "bug.yml"), "utf8");

test("describeSystem : nom lisible du système", () => {
  assert.equal(describeSystem(env), "macOS 26.7.3 (arm64)");
  assert.equal(describeSystem({ platform: "win32", systemVersion: "10.0.22631", arch: "x64" }), "Windows 10.0.22631 (x64)");
});

test("rapport de bug : pointe vers le modèle et remplit des champs qui existent", () => {
  const url = new URL(bugReportUrl(pkg, env));
  assert.equal(`${url.origin}${url.pathname}`, `${pkg.bugs.url}/new`);
  const ids = [...template.matchAll(/^\s+id:\s*(\S+)/gm)].map(m => m[1]);
  for (const [key, value] of url.searchParams) {
    if (key === "template") {
      assert.ok(fs.existsSync(path.join(__dirname, "..", "..", ".github", "ISSUE_TEMPLATE", value)), `modèle ${value} absent`);
    } else {
      assert.ok(ids.includes(key), `le champ « ${key} » n'existe pas dans bug.yml`);
    }
  }
  assert.equal(url.searchParams.get("version"), `${pkg.version} (Electron 45.4.1)`);
  assert.equal(url.searchParams.get("os"), "macOS 26.7.3 (arm64)");
});

test("contact : mailto vers contact@, objet encodé avec %20", () => {
  assert.equal(pkg.bugs.email, "contact@ysaunier.dev");
  const url = contactUrl(pkg, env);
  assert.ok(url.startsWith("mailto:contact@ysaunier.dev?subject="));
  assert.ok(!url.includes("+"), "les espaces ne doivent pas devenir « + » dans un mailto");
  assert.equal(decodeURIComponent(url.split("subject=")[1].split("&")[0]), `${pkg.productName} ${pkg.version}`);
});

test("supportLink : seuls les noms connus donnent une URL", () => {
  assert.equal(supportLink("home", pkg, env), pkg.homepage);
  assert.ok(supportLink("bug", pkg, env).startsWith("https://github.com/"));
  assert.equal(supportLink("https://exemple.com", pkg, env), null);
  assert.equal(supportLink("file:///etc/passwd", pkg, env), null);
});
