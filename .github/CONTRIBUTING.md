## HawkScan Action Development

To install dependencies

```bash
npm install
```

To run tests :heavy_check_mark:

```bash
npm test
```

## Package for distribution

To prepare this action for distribution, you must package it before releasing it with:

```bash
npm run prepare
```

Packaging the action will create a packaged action in the `dist` folder. Packaging assembles the code, dependencies, and licenses into one file that can be checked in to Git, enabling fast and reliable execution and preventing the need to check in node_modules.

GitHub Actions will run the entry point from `action.yml`. That entrypoint is currently defined as `dist/index.js`.

## Prepare a Version for Release

Releases are created from the `main` branch. To prepare for a release, create a PR to `main` and make sure that your target release version is reflected in the following files:

 * **`package.json`** - set `version`, e.g. `1.0.0`
 * **`README.md`** - set version in all YAML examples, e.g. `stackhawk/hawkscan-action@v1.0.0`

## Cut a Release

When the `main` branch is stable and reflects the desired release version, create a new release in GitHub, and prepend the version name with a `v`, e.g. `v1.0.0`. Be sure to check the box at the top of the Release page:

> ✅ *Publish this Action to the GitHub Marketplace*

See the GitHub Actions [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md) for more information about GitHub Actions versioning.

## Check the Marketplace

To make sure the action has been released correctly, [view it on the Marketplace](https://github.com/marketplace/actions/stackhawk-hawkscan-action).
