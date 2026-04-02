# hawkscan-action

GitHub Action for running StackHawk HawkScan in CI pipelines. Published to the GitHub Marketplace.

## Before Every Commit

**You MUST rebuild `dist/` before committing.** The `dist/` directory is checked into git and contains the packaged action. If you change any source code and don't rebuild, your changes won't take effect.

```bash
npm run all    # lint + rebuild dist/ + test
git add dist
```

This is the single most common mistake in this repo. Never skip it.

## Required Pre-Commit Checklist

1. `npm run all` (lint, package to dist/, run tests) — all must pass
2. `git add dist` — include rebuilt dist/ in your commit
3. If bumping versions: update `.bumpversion.cfg`, `package.json`, `README.md`, then `npm install` to sync `package-lock.json`

## Node Version

Use the version in `.nvmrc` (currently v24). Run `nvm use` before any npm commands.

## Release Process

**Every PR that should result in a new release MUST include a version bump.** Without it, the CI "Create Release" step will be skipped on merge because `scripts/version-check.sh` sees the existing tag and produces no output.

Bump the version using `bump2version`:

```bash
bump2version <major|minor|patch>   # updates .bumpversion.cfg, package.json, README.md and creates a commit
```

Alternatively, use the release PR script which handles the full flow:

```bash
./scripts/release-pr.sh -b <major|minor|patch>   # requires bump2version and gh CLI
```

See `.github/CONTRIBUTING.md` for full release details. On merge to `main`, CI auto-creates a GitHub Release with tag `v{version}`. After that:
1. Manually edit the release to publish to GitHub Marketplace
2. Manually run the "Update Main Version" workflow dispatch to move the `v2` tag to the new release

## Project Structure

- `src/` — action source code (JavaScript)
- `dist/` — packaged action output (committed to git, built by `ncc`)
- `__tests__/` — jest tests
- `scripts/` — release and version tooling
- `action.yml` — GitHub Action definition

## Branch Convention

- Default branch: `main`
- PRs target `main`

## Testing

```bash
npm test       # unit tests (jest)
npm run lint   # eslint
npm run all    # lint + build + test
```
