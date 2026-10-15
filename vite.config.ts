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
  build: {
    rolldownOptions: {
      output: {
        // Shared chunks are named after their first module ("Button"); name the
        // one carrying Mediabunny's decoding core after what it actually is.
        chunkFileNames: (chunk) =>
          !chunk.isDynamicEntry &&
          chunk.moduleIds.some((id) => id.includes("node_modules/mediabunny"))
            ? "assets/media-[hash].js"
            : "assets/[name]-[hash].js",
        // Stable vendor chunks that app changes don't invalidate. Mediabunny is
        // deliberately not grouped: left alone, its encoding/muxing half lands
        // in the lazily loaded export dialog instead of the startup bundle.
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            {
              name: "codemirror",
              test: /node_modules[\\/](@codemirror|@lezer|crelt|style-mod|w3c-keyname)[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
  plugins: lazyPlugins(() => [
    // The StyleX plugin holds file handles open after a run, keeping Vitest
    // from exiting; tests cover core logic only, so it is skipped there.
    ...(process.env.VITEST ? [] : [stylex()]),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ]),
});
