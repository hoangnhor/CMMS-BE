const js = require("@eslint/js");

module.exports = [
  {
    ignores: ["node_modules/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        console: "readonly",
        process: "readonly",
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        setTimeout: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "error",
        { "args": "none", "caughtErrors": "none", "varsIgnorePattern": "^_" }
      ],
    },
  },
];
