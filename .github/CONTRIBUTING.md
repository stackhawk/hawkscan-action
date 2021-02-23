## Develop

To install and update dependencies:

```bash
npm install
```

To run tests:

```bash
npm test
```

## Package for Distribution

To prepare this action for distribution, you must package it:

```bash
npm run prepare
```

Packaging will create a packaged single action file in the `dist` folder. The single file contains all the code, dependencies, and licenses, enabling fast and reliable execution and preventing the need to check in node_modules.

GitHub Actions will run the entry point from `action.yml`. That entrypoint is currently defined as `dist/index.js`.

## Prepare a Version for Release

Releases are created from the `main` branch. To prepare for a release, bump the version number in all relevant files using [`bumpversion`](https://pypi.org/project/bump2version/). For instance, if the current version is `1.0.0`, and you want to bump it to `1.0.1`, run:

```shell
bumpversion patch
```

Use the `.bumpversion.cfg` file at the root of this project to define which files get updated by `bumpversion`. Currently this includes `.package.json` and `README.md`.

## Cut a Release

When the `main` branch is stable and reflects the desired release version, create a new release in GitHub, and prepend the version name with a `v`, e.g. `v1.0.0`. Be sure to check the box at the top of the Release page:

> ✅ *Publish this Action to the GitHub Marketplace*

See the GitHub Actions [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md) for more information about GitHub Actions versioning.

## Check the Marketplace

To make sure the action has been released correctly, [view it on the Marketplace](https://github.com/marketplace/actions/stackhawk-hawkscan-action), and check the latest available version there.
