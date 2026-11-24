const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  {
    // Code de l'interface : scripts classiques chargés par index.html
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "script",
      globals: { ...globals.browser, Cahier: "writable", module: "readonly" },
    },
  },
  {
    // Processus principal, preload, scripts et tests : Node.js (CommonJS)
    files: ["main.js", "preload.js", "support.js", "eslint.config.js", "scripts/**/*.js", "test/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
  },
  {
    rules: {
      "no-unused-vars": ["error", { args: "after-used", argsIgnorePattern: "^_", caughtErrors: "none" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
];
