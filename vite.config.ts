import babel from "@rolldown/plugin-babel";
import stylex from "@stylexjs/unplugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["design/**", ".claude/**"],
  },
  lint: {
    plugins: ["react", "typescript", "oxc"],
    rules: {
      "react/rules-of-hooks": "error",
      "react/only-export-components": ["error", { allowConstantExport: true }],
      "react/no-multi-comp": ["error", { ignoreStateless: false }],
      "vite-plus/prefer-vite-plus-imports": "error",
      "stylex/valid-styles": "error",
      "stylex/no-unused": "error",
      "stylex/valid-shorthands": "error",
      "stylex/enforce-extension": "error",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      { name: "stylex", specifier: "@stylexjs/eslint-plugin" },
    ],
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
  plugins: lazyPlugins(() => [stylex(), react(), babel({ presets: [reactCompilerPreset()] })]),
});
