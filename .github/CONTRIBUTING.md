## HawkScan Action Development

Install the dependencies

```bash
npm install
```

Run the tests :heavy_check_mark:

```bash
npm test
```

## Package for distribution

GitHub Actions will run the entry point from the action.yml. Packaging assembles the code into one file that can be checked in to Git, enabling fast and reliable execution and preventing the need to check in node_modules.

Actions are run from GitHub repos.  Packaging the action will create a packaged action in the dist folder.

Run prepare

```bash
npm run prepare
```

## Create a release branch

Users shouldn't consume the action from master since that would be latest code and actions can break compatibility between major versions.

Checkin to the v1 release branch

```bash
git checkout -b v1
git commit -a -m "v1 release"
```

```bash
git push origin v1
```

Your action is now published! :rocket:

See the [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)

## Usage

You can now consume the action by referencing the v1 branch

```yaml
uses: stackhawk/hawkscan-action@v1
with:
  apiKey: ${{ secrets.SHAWK_API_KEY }}
```

See the [actions tab](https://github.com/stackhawk/hawkscan-action/actions) for runs of this action! :rocket:
