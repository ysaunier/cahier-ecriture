/* Liens d'assistance : rapport de bug pré-rempli (GitHub) et courriel de contact.
   Les URL sont construites ici, dans le processus principal : la fenêtre ne demande
   qu'un nom de lien ("bug", "idea", "contact", "home", "release", "privacy", "terms") et ne peut pas faire ouvrir une URL arbitraire. */

/** Description du système, ex. « macOS 26.7.3 (arm64) » ou « Windows 10.0.22631 (x64) ». */
function describeSystem({ platform, systemVersion, arch }) {
  const names = { darwin: "macOS", win32: "Windows", linux: "Linux" };
  return `${names[platform] || platform} ${systemVersion || ""} (${arch})`.replace(/\s+/g, " ");
}

/** Nouvelle issue GitHub avec le modèle « bug.yml », version et système déjà remplis. */
function bugReportUrl(pkg, env) {
  const params = new URLSearchParams({
    template: "bug.yml",
    version: `${pkg.version} (Electron ${env.electron})`,
    os: describeSystem(env),
  });
  return `${pkg.bugs.url}/new?${params}`;
}

/** Nouvelle issue GitHub avec le modèle « suggestion.yml », version déjà remplie. */
function suggestionUrl(pkg) {
  const params = new URLSearchParams({ template: "suggestion.yml", version: pkg.version });
  return `${pkg.bugs.url}/new?${params}`;
}

/** Courriel de contact : champ standard « bugs.email » du package.json. */
function contactEmail(pkg) {
  return (pkg.bugs && pkg.bugs.email) || null;
}

/** Courriel pré-rempli : objet avec le nom et la version, système en bas du message. */
function contactUrl(pkg, env) {
  const email = contactEmail(pkg);
  if (!email) return null;
  const subject = `${pkg.productName} ${pkg.version}`;
  const body = `\n\n—\n${pkg.productName} ${pkg.version} · ${describeSystem(env)}`;
  // encodeURIComponent (et non URLSearchParams) : les espaces doivent devenir %20, pas « + »
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** « ysaunier/cahier-ecriture », tiré de la page du projet sur GitHub. */
function repoSlug(pkg) {
  const m = String(pkg.homepage || "").match(/^https:\/\/github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/);
  return m ? m[1] : null;
}

/** API GitHub de la dernière Release publiée (les préversions en sont exclues). */
function latestReleaseApi(pkg) {
  const slug = repoSlug(pkg);
  return slug ? `https://api.github.com/repos/${slug}/releases/latest` : null;
}

function parseVersion(v) {
  const m = String(v || "").trim().replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  return m ? { n: [+m[1], +m[2], +m[3]], pre: m[4] || null } : null;
}

/** Vrai si « latest » est une version plus récente que « current » (1.10.0 > 1.9.9, 1.2.0 > 1.2.0-beta.1). */
function isNewer(latest, current) {
  const a = parseVersion(latest), b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a.n[i] !== b.n[i]) return a.n[i] > b.n[i];
  return !a.pre && Boolean(b.pre);
}

/** Lien autorisé pour un nom donné, ou null si le nom est inconnu. */
function supportLink(name, pkg, env) {
  if (name === "bug") return bugReportUrl(pkg, env);
  if (name === "idea") return suggestionUrl(pkg);
  if (name === "contact") return contactUrl(pkg, env);
  if (name === "home") return pkg.homepage;
  if (name === "release") return `${pkg.homepage}/releases/latest`;
  if (name === "privacy") return `${pkg.homepage}/blob/main/PRIVACY.md`;
  if (name === "terms") return `${pkg.homepage}/blob/main/CONDITIONS.md`;
  return null;
}

module.exports = {
  describeSystem, bugReportUrl, suggestionUrl, contactEmail, contactUrl, supportLink,
  repoSlug, latestReleaseApi, parseVersion, isNewer,
};
