/* Liens d'assistance : rapport de bug pré-rempli (GitHub) et courriel de contact.
   Les URL sont construites ici, dans le processus principal : la fenêtre ne demande
   qu'un nom de lien ("bug", "contact", "home") et ne peut pas faire ouvrir une URL arbitraire. */

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

/** Lien autorisé pour un nom donné, ou null si le nom est inconnu. */
function supportLink(name, pkg, env) {
  if (name === "bug") return bugReportUrl(pkg, env);
  if (name === "contact") return contactUrl(pkg, env);
  if (name === "home") return pkg.homepage;
  return null;
}

module.exports = { describeSystem, bugReportUrl, contactEmail, contactUrl, supportLink };
