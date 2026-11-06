# Tabimate

A daily browser trivia game about animals. See [CLAUDE.md](CLAUDE.md) for the project brief and architecture rules.

## Setup

Requires Node.js 22 or newer.

```sh
npm install
```

## Commands

| Command              | What it does                                    |
| -------------------- | ----------------------------------------------- |
| `npm run dev`        | Start the dev server at http://localhost:5173   |
| `npm run build`      | Typecheck, then build to `dist/`                |
| `npm run preview`    | Serve the production build locally              |
| `npm run test`       | Run unit tests once                             |
| `npm run test:watch` | Run unit tests in watch mode                    |
| `npm run lint`       | ESLint (incl. layer boundaries) + Prettier      |
| `npm run format`     | Format all files with Prettier                  |
| `npm run typecheck`  | TypeScript, app and tool configs                |
| `npm run check`      | typecheck + lint + test — run before committing |

## Deploy

Cloudflare Pages: build command `npm run build`, output directory `dist`.
