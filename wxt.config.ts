import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  webExt: {
    disabled: true, // load it as an unpacked extension yourself (data doesn't persist even with the flag in the docs)
  },
  // https://stackoverflow.com/questions/72618944/get-error-to-build-my-project-in-vite-top-level-await-is-not-available-in-the
  vite: () => {
    return {
      build: {
        target: "esnext",
      },
    };
  },
  srcDir: "src",
  // https://wxt.dev/guide/essentials/config/manifest.html#global-options
  // you can use args in the function def like manifest: ({ browser, command, etc. }) but we don't need it rn
  manifest: ({ browser, mode }) => {
    return {
      name: "Auto 2FA",
      description: "Login through Duo Mobile in your browser",
      version: "1.6.2",
      permissions: ["storage"],
      host_permissions: ["https://*.duosecurity.com/*"],
      // Specific to firefox during dev
      ...(browser === "firefox" &&
        mode === "development" && {
          browser_specific_settings: {
            gecko: { id: "extensionname@example.org", strict_min_version: "88.0" },
          },
        }),
    };
  },
});
