import eslintConfigPrettier from "eslint-config-prettier/flat";

export default [
  {
    ignores: ["node_modules/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  eslintConfigPrettier,
];
