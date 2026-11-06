# Application versioning

The first tracked application version is **v1.1.0**. `package.json` contains the current version without the `v`; `PublicSiteFooter.svelte` displays it with the prefix immediately after Your Privacy Choices. Do not maintain a separate footer version constant.

Use Semantic Versioning (`MAJOR.MINOR.PATCH`):

- **PATCH:** bug fixes, polish, maintenance, documentation, tests, and cleanup. Example: `1.1.0` → `1.1.1`.
- **MINOR:** backward-compatible features. Example: `1.1.3` → `1.2.0`.
- **MAJOR:** breaking behavior, saved-document compatibility, or public API changes. Example: `1.2.4` → `2.0.0`.

For this repository, the user requires a new version for **every commit**, including each commit in a batch. This is a project policy in addition to SemVer's change categories. Choose the highest applicable category when a commit contains multiple kinds of changes.

Keep follow-up edits in an already-prepared, uncommitted release until the user asks to commit. Do not advance the version for each message or task within that pending release.

Changelog notes compare the final release with the previous finalized version. Consolidate refinements made during the pending release; do not list fixes to unreleased work as separate changes. Leave the pending release heading undated (`## v1.2.0`). When the user finalizes the release, add the actual finalization date in America/Chicago, rather than the date work began.

Before committing:

1. Compare the working version with `git show HEAD:package.json`.
2. Choose the appropriate bump. If the correct version is already prepared, do not bump again. The initial version-tracking commit uses `1.1.0`.
3. Run `pnpm version:patch`, `pnpm version:minor`, or `pnpm version:major`. These use npm's version command with `--no-git-tag-version`, so they update the version without creating a commit or tag. Editing the version field directly is also valid.
4. Include `package.json` in the same commit as its changes, with a matching release in `CHANGELOG.md`, dated on finalization. This Markdown file powers the public `/changelog` page; the footer version links directly to the matching release.
5. When committing a batch, repeat for each commit, using the version from the preceding commit as its baseline.

The footer updates automatically from `package.json`; selecting the SemVer category and preparing the version happen before each commit. These instructions do not install a machine-specific Git hook or automatically publish tags/releases.

## User-facing changelog

Put newest releases first. Write short, everyday-language bullets describing what users can do or what works better. Avoid developer terminology, internal refactors, commit IDs, and testing details. Separate Play Builder from Case Plays; put general updates under Across the App. Omit areas/categories with no changes instead of filling them with “no changes” notes.

Use this Markdown structure (headings and plain-text bullets are rendered as structured page content, without raw HTML):

```markdown
## v1.2.0 — 2026-11-06

### Play Builder

#### Added

- A brief explanation of a new feature.

#### Fixed

- A brief explanation of what now works correctly.

### Case Plays

#### Changed

- A brief explanation of what changed for readers.
```

Use Added, Changed, Fixed, and Removed only as applicable. No inline HTML or elaborate Markdown formatting is needed; the page supplies the typography, category labels, and release layout.
