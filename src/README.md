# Source code
This is the source code of the extension. We use [WXT](wxt.dev) for development.

## Quickstart
If you're not familiar with WXT, here's the basics:

| Command | Description |
| - | - |
| `npm i` | Downloads the necessary WXT node modules. Always do this first! |
| `npm run dev` | Launches a development server **for Chrome** that will auto-reload any changes you make live. You'll need to load *.output/chrome-mv3* as an unpacked extension yourself (unless you change *wxt.config.tsx* to launch a temp browser). |
| `npm run dev:firefox` | Same as above, but for Firefox. |
| `npm run build` | Builds for Chrome. |
| `npm run build:firefox` | Builds for Firefox. |
