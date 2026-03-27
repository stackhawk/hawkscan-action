# Update All Dependencies Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update all outdated dependencies in hawkscan-action, remove dead code, migrate eslint to flat config, and clear npm audit vulnerabilities — in a single PR.

**Architecture:** All source files use CommonJS (`require()`). The ESM-only deps (@actions/* v3, @octokit/core v7) will work because `ncc` (webpack-based bundler) transpiles ESM into the CJS `dist/index.js` bundle. ncc 0.38.4 specifically added `import.meta` CJS support for this scenario. Source `require()` calls do NOT need to change.

**Tech Stack:** Node 24, ncc 0.38.4, jest 30, eslint 10 (flat config), @actions/core 3, @actions/tool-cache 4, @octokit/core 7

**Branch:** `update-all-deps` off `main`

---

## Summary of Changes

| Dependency | Current | Target | Risk | Notes |
|---|---|---|---|---|
| @vercel/ncc | 0.38.1 | 0.38.4 | LOW | Patch bump, enables ESM bundling |
| @actions/core | 2.0.3 | 3.0.0 | MEDIUM | ESM-only, ncc handles it |
| @actions/tool-cache | 3.0.1 | 4.0.0 | MEDIUM | ESM-only, ncc handles it |
| @actions/exec | 2.0.0 | REMOVE | NONE | Never imported, dead dependency |
| @octokit/core | 5.2.2 | 7.0.6 | MEDIUM | ESM-only, API unchanged |
| eslint | 8.57.1 | 10.x | HIGH | Requires flat config migration |
| jest | 29.7.0 | 30.x | MEDIUM | Major bump, check config |
| process | 0.11.10 | REMOVE | NONE | Node provides it globally |

---

### Task 1: Create branch and upgrade ncc first

ncc 0.38.4 adds `import.meta` CJS build support — must be upgraded before ESM deps.

**Files:**
- Modify: `package.json`

**Step 1: Create branch**

```bash
cd /Users/brandon.ward/Code/hawkscan-action
git checkout main && git pull origin main
git checkout -b update-all-deps
```

**Step 2: Upgrade ncc**

```bash
source ~/.nvm/nvm.sh && nvm use
npm install --save-dev @vercel/ncc@latest
```

**Step 3: Verify build still works**

```bash
npm run all
```
Expected: lint passes (warnings ok), build succeeds, all 6 tests pass.

**Step 4: Commit**

```bash
git add package.json package-lock.json dist
git commit -m "chore: upgrade @vercel/ncc to 0.38.4"
```

---

### Task 2: Remove dead dependencies (@actions/exec, process)

**Files:**
- Modify: `package.json`

**Step 1: Remove unused deps**

```bash
npm uninstall @actions/exec process
```

**Step 2: Verify nothing breaks**

```bash
npm run all
```
Expected: all passes — these packages are never imported in source.

**Step 3: Commit**

```bash
git add package.json package-lock.json dist
git commit -m "chore: remove unused @actions/exec and process dependencies"
```

---

### Task 3: Upgrade @actions/core and @actions/tool-cache (ESM-only)

These share internal dependencies and should be upgraded together.

**Files:**
- Modify: `package.json`

**Step 1: Upgrade both packages**

```bash
npm install @actions/core@latest @actions/tool-cache@latest
```

**Step 2: Verify ncc bundles the ESM deps correctly**

```bash
npm run all
```
Expected: ncc should consume the ESM packages and produce a working CJS bundle. All 6 tests pass.

**Step 3: If ncc build fails** — check the error. Likely causes:
- `import.meta` not handled → verify ncc is actually 0.38.4 (`npx ncc --version`)
- Dynamic import issues → check ncc output for chunk files (should be single `dist/index.js`)

**Step 4: Commit**

```bash
git add package.json package-lock.json dist
git commit -m "chore: upgrade @actions/core to v3 and @actions/tool-cache to v4"
```

---

### Task 4: Upgrade @octokit/core to v7

**Files:**
- Modify: `package.json`
- Verify: `src/sarif.js` (no code changes expected — API is unchanged)

**Step 1: Upgrade octokit**

```bash
npm install @octokit/core@latest
```

**Step 2: Verify build and tests**

```bash
npm run all
```
Expected: build succeeds, tests pass. The `new Octokit({ auth })` constructor and `.request()` method are unchanged across v5→v7.

**Step 3: Commit**

```bash
git add package.json package-lock.json dist
git commit -m "chore: upgrade @octokit/core to v7"
```

---

### Task 5: Upgrade jest to v30

**Files:**
- Modify: `package.json`
- Possibly modify: jest config (currently inline in package.json or auto-detected)

**Step 1: Upgrade jest**

```bash
npm install --save-dev jest@latest
```

**Step 2: Run tests**

```bash
npm test
```
Expected: all 6 tests pass. Jest 30 is mostly backward compatible for simple test suites.

**Step 3: If tests fail** — check for:
- Config format changes (jest 30 may warn about deprecated options)
- `expect` API changes (unlikely for basic `.toEqual()` usage)

**Step 4: Full build verification**

```bash
npm run all
```

**Step 5: Commit**

```bash
git add package.json package-lock.json dist
git commit -m "chore: upgrade jest to v30"
```

---

### Task 6: Migrate eslint to v10 with flat config

This is the most involved task. ESLint 9+ dropped `.eslintrc.json` format entirely.

**Files:**
- Delete: `.eslintrc.json`
- Delete: `.eslintignore`
- Create: `eslint.config.mjs`
- Modify: `package.json` (upgrade eslint)

**Step 1: Install eslint v10 and required packages**

```bash
npm install --save-dev eslint@latest @eslint/js globals
```

**Step 2: Create `eslint.config.mjs`**

Replace the `.eslintrc.json` + `.eslintignore` with a flat config:

```javascript
import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.commonjs,
        ...globals.jest,
        ...globals.es6,
        Atomics: "readonly",
        SharedArrayBuffer: "readonly",
      },
    },
    rules: {
      "no-control-regex": "off",
      "guard-for-in": "warn",
      "object-shorthand": "warn",
    },
  },
  {
    ignores: ["dist/"],
  },
];
```

Note: Removed the `@typescript-eslint/no-var-requires: off` rule — there's no TypeScript in this project and that package isn't installed.

**Step 3: Delete old config files**

```bash
rm .eslintrc.json .eslintignore
```

**Step 4: Run lint**

```bash
npm run lint
```
Expected: same warnings as before (guard-for-in, object-shorthand), no new errors.

**Step 5: Full verification**

```bash
npm run all
```

**Step 6: Commit**

```bash
git add eslint.config.mjs package.json package-lock.json dist
git rm .eslintrc.json .eslintignore
git commit -m "chore: migrate eslint to v10 with flat config"
```

---

### Task 7: Run npm audit and verify clean

**Step 1: Check audit**

```bash
npm audit
```
Expected: 0 vulnerabilities (the brace-expansion chain was through eslint v8 and jest v29).

**Step 2: Check outdated**

```bash
npm outdated
```
Expected: no outdated packages (or only packages we intentionally kept).

**Step 3: If audit still shows issues** — investigate and fix remaining transitive deps.

---

### Task 8: Final verification and push

**Step 1: Full clean build from scratch**

```bash
rm -rf node_modules
npm clean-install
npm run all
```
Expected: clean install, lint passes, build succeeds, all tests pass.

**Step 2: Review all changes**

```bash
git diff main --stat
git log main..HEAD --oneline
```

**Step 3: Push and create PR**

```bash
git push -u origin update-all-deps
gh pr create --title "Update all dependencies" --body "$(cat <<'EOF'
## Summary
- Upgrade @vercel/ncc to 0.38.4 (enables ESM bundling for CJS output)
- Upgrade @actions/core to v3, @actions/tool-cache to v4 (ESM-only, bundled by ncc)
- Upgrade @octokit/core to v7 (ESM-only, API unchanged)
- Upgrade jest to v30
- Migrate eslint to v10 with flat config (eslint.config.mjs)
- Remove unused dependencies: @actions/exec (never imported), process (Node built-in)
- Clear all npm audit vulnerabilities (26 moderate → 0)
- Rebuild dist/ with all updated deps

Supersedes and replaces PRs #260, #261, #263, #264, #265, #266, #267.

## Test plan
- [ ] All CI checks pass (unit tests on ubuntu + windows)
- [ ] Live scan tests pass on both platforms
- [ ] Java Spring Vulny integration test passes
- [ ] `npm audit` shows 0 vulnerabilities
- [ ] `npm outdated` shows no outdated packages
- [ ] Verify dist/index.js is a single bundled file (no chunk splitting)

## Risk notes
- All @actions/* and @octokit/core major bumps are ESM-only. ncc 0.38.4 bundles them into CJS dist/. Source require() calls are unchanged.
- No changes to action.yml inputs/outputs — this is an internal-only update, stays at v2.
- The v2 floating tag is NOT moved until CI is verified — safety net for customers.
EOF
)"
```
