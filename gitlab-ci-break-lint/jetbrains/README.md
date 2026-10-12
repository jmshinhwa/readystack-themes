# GitLab CI Break Lint — JetBrains plugin source

The IntelliJ Platform plugin for **GitLab CI Break Lint** (right-click in the editor or Tools → "Check This File").

- The plugin is a thin wrapper: it writes the current buffer to a temp file and runs the checking engine, the npm package [`@readystack/gitlab-ci-break-lint`](https://www.npmjs.com/package/@readystack/gitlab-ci-break-lint) (Node 18+, `npx`). The engine and its rule set live in the folder above this one (`engine.js`, `rules.json`).
- Build: `gradle buildPlugin` (IntelliJ Platform Gradle Plugin 2.x).
- Licence: proprietary — see [getreadystack.com/license](https://getreadystack.com/license). The source is published for review; checking the file you have open is free, workspace scans and report files need a licence key.
