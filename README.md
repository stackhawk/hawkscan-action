[![StackHawk](https://www.stackhawk.com/wp-content/uploads/2019/07/stackhawk-long.png)](https://stackhawk.com)

# StackHawk HawkScan Action

The [StackHawk](https://www.stackhawk.com/) [HawkScan](https://hub.docker.com/r/stackhawk/hawkscan) GitHub Action makes it easy to integrate application security testing into your CI pipeline.

## About StackHawk
Here's the rundown:

 * 🧪 Modern Application Security Testing: StackHawk is a dynamic application security testing (DAST) tool, helping you catch security bugs before they hit production.
 * 💻 Built for Developers: The engineers building software are the best equipped to fix bugs, including security bugs. StackHawk does security, but is built for engineers like you.
 * 🤖 Simple to Automate in CI: Application security tests belong in CI, running tests on every PR. Adding StackHawk tests to a DevOps pipeline is easy.

## Inputs

### `apiKey`

**Required** Your StackHawk API key.

### `dryRun`

**Optional** If set to `true`, show HawkScan commands, but don't run them.

### `environmentVariables`

**Optional** A list of environment variable to pass to HawkScan. Environment variables can be separated with spaces, commas, or newlines.

For example:
```yaml
jobs:
  stackhawk-hawkscan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: stackhawk/hawkscan-action@v1
      with:
        apiKey: ${{ secrets.HAWK_API_KEY }}
        environmentVariables: APP_HOST APP_ENV
      env:
        APP_HOST: http://example.com
        APP_ENV: Preproduction
```

### `configurationFiles`

**Optional** A list of HawkScan configuration files to use. Defaults to `stackhawk.yml`. File names can be separated with spaces, commas, or newlines.

### `network`

**Optional** Docker network settings for running HawkScan.  Defaults to `host`.

The following options for `network` are most available:
 - **`host`** (default): Use Docker host networking mode. HawkScan will run with full access to the GitHub virtual environment hosts network stack. This works in most cases if your scan target is a remote URL or a localhost address.
 - **`bridge`**: Use the default Docker bridge network setting for running the HawkScan container. This works in most cases if your scan target is a remote URL or a localhost address.
 - **`NETWORK`**: Use the user-defined Docker bridge network, `NETWORK`. This network may be created with `docker network create`, or `docker-compose`. This is appropriate for scanning other containers running locally on the GitHub virtual environment within a named Docker network.

See the [Docker documentation](https://docs.docker.com/engine/reference/run/#network-settings) for more details on Docker network settings.

## Examples

The following example shows how to run HawkScan with a StackHawk platform API key stored as a GitHub Actions secret environment variable, `HAWK_API_KEY`. In this workflow, GitHub Actions will checkout your repository, build your Python app, and run it. It then uses the HawkScan Action to run HawkScan with the given API key. HawkScan automatically finds the `stackhawk.yml` configuration file at the root of your repository and runs a scan based on that configuration.

```yaml
jobs:
  stackhawk-hawkscan:
    runs-on: ubuntu-latest
    name: Run my app and scan it
    steps:
    - name: Check out repo
      uses: actions/checkout@v2
    - name: Build and run my app
      run: |
        pip3 install -r requirements.txt
        nohup python3 app.py &
    - name: Scan my app
      uses: stackhawk/hawkscan-action@v1
      with:
        apiKey: ${{ secrets.HAWK_API_KEY }}
```

The next example shows a similar job, but this time with several inputs.

```yaml
jobs:
  stackhawk-hawkscan:
    runs-on: ubuntu-latest
    name: Run my app and scan it
    steps:
    - name: Check out repo
      uses: actions/checkout@v2
    - name: Build and run my app
      run: |
        pip3 install -r requirements.txt
        nohup python3 app.py &
    - name: Scan my app
      env:
        APP_HOST: 'http://localhost:5000'
        APP_ID: AE624DB7-11FC-4561-B8F2-2C8ECF77C2C7
        APP_ENV: Development
      uses: stackhawk/hawkscan-action@v1
      with:
        apiKey: ${{ secrets.HAWK_API_KEY }}
        dryRun: true
        environmentVariables: |
          APP_HOST
          APP_ID
          APP_ENV
        configurationFiles: |
          stackhawk.yml
          stackhawk-extras.yml
        network: host
```

The configuration above will perform a dry run, meaning it will only print out the Docker command that it would run if `dryRun` were set to `false`, which is the default. It will pass the environment variables `APP_HOST`, `APP_ID`, and `APP_ENV` to HawkScan so that they can be used in the `stackhawk.yml` and `stackhawk-extra.yml` configuration files. And finally, it tells HawkScan to use the `stackhawk.yml` configuration file and overlay the `stackhawk-extra.yml` configuration file.
