# Application versioning

The first tracked application version is **v1.1.0**. `package.json` contains the current version without the `v`; `PublicSiteFooter.svelte` displays it with the prefix immediately after Your Privacy Choices. Do not maintain a separate footer version constant.

Use Semantic Versioning (`MAJOR.MINOR.PATCH`):

- **PATCH:** bug fixes, polish, maintenance, documentation, tests, and cleanup. Example: `1.1.0` → `1.1.1`.
- **MINOR:** backward-compatible features. Example: `1.1.3` → `1.2.0`.
- **MAJOR:** breaking behavior, saved-document compatibility, or public API changes. Example: `1.2.4` → `2.0.0`.

For this repository, the user requires a new version for **every commit**, including each commit in a batch. This is a project policy in addition to SemVer's change categories. Choose the highest applicable category when a commit contains multiple kinds of changes.

Before committing:

1. Compare the working version with `git show HEAD:package.json`.
2. Choose the appropriate bump. If the correct version is already prepared, do not bump again. The initial version-tracking commit uses `1.1.0`.
3. Run `pnpm version:patch`, `pnpm version:minor`, or `pnpm version:major`. These use npm's version command with `--no-git-tag-version`, so they update the version without creating a commit or tag. Editing the version field directly is also valid.
4. Include `package.json` in the same commit as its changes. Record significant release notes in `CHANGELOG.md`; its entries are historical, not a second current-version source.
5. When committing a batch, repeat for each commit, using the version from the preceding commit as its baseline.

The footer updates automatically from `package.json`; selecting the SemVer category and preparing the version happen before each commit. These instructions do not install a machine-specific Git hook or automatically publish tags/releases.
