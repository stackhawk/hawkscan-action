## Develop

To install and update dependencies:

```bash
npm install
```

To run tests:

```bash
npm test
```

To lint the code:

```bash
npm run lint
```

## Package for Distribution

To prepare this action for distribution, you must package it into the `dist` directory:

```bash
npm run prepare
```

Better yet, you can test, lint, and package it all in one step:

```bash
npm run all
```

Packaging creates a single consolidated action file in the `dist` folder. That directory contains all code, dependencies, and licenses, enabling fast and reliable execution and preventing the need to check in the `node_modules` directory.

## Releasing and Publishing to the GitHub Marketplace

To release a new version of this action to the marketplace, you must do the following:
 1. Lint, package, and test the code in your feature branch
 2. Bump the version number in `package.json` and `README.md`
 3. Create a PR to `main` with your changes
 4. Once the PR is merged, tag and release it
 5. Publish the release to the GitHub Marketplace

The `release-pr.sh` script handles steps 1 through 3, up to and including the creation of a PR.

> `release-pr.sh` requires [bump2version](https://pypi.org/project/bump2version/) and [gh](https://cli.github.com/manual/installation).

Run `release-pr.sh` with your desired bump level - **major**, **minor**, or **patch**:

```shell
./scripts/release-pr.sh -b patch
```

Once the PR is merged, the `.github/workflows/test.yml` workflow handles step 4, tagging and releasing, automatically.

The final *manual* step is to [edit the release](https://github.com/stackhawk/hawkscan-action/releases) and publish it to the GitHub Marketplace.

> ✅ *Publish this Action to the GitHub Marketplace*

## Check the Marketplace

To make sure the action has been released correctly, [view it on the Marketplace](https://github.com/marketplace/actions/stackhawk-hawkscan-action), and check the latest available version there.
