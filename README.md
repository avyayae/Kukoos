# Kukoos

A learning adventure for kids with Kukoos the bird. **Math**: a Grades 2–3 (Common Core) journey about carrying and borrowing, from Earth's animal habitats out to the planets. **Chess** (coming in v2): from the basics to a first win. It's an offline-first PWA: progress stays on the device, and there's no server and no tracking.

**Play:** https://avyayae.github.io/Kukoos/

- [Install on a tablet](docs/INSTALL.md)
- [Play-test kit](docs/PLAYTEST.md)
- Specs: [`specs/`](specs/) (start with the constitution, then `features/`)

## Develop
Requires Node 24+.

```sh
npm install
npm run dev        # http://localhost:5173
npm run verify     # format, lint, typecheck, unit, build, e2e
```

`BASE_PATH=/Kukoos/ npm run build` builds for GitHub Pages. Merges to `main` deploy automatically (`.github/workflows/pages.yml`).
