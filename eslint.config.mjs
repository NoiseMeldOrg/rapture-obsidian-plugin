import tsparser from "@typescript-eslint/parser";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
    },
    plugins: {
      obsidianmd,
    },
    rules: {
      // Allow brand names to remain capitalized in UI text (sentence case check)
      "obsidianmd/ui/sentence-case": [
        "warn",
        {
          brands: ["Rapture", "Google", "Drive"],
          acronyms: ["OK"],
        },
      ],
    },
  },
];
