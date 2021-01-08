[![StackHawk](https://www.stackhawk.com/wp-content/uploads/2019/07/stackhawk-long.png)](https://stackhawk.com)

# StackHawk HawkScan Action

The [StackHawk](https://www.stackhawk.com/) [HawkScan](https://hub.docker.com/r/stackhawk/hawkscan) GitHub Action makes it easy to integrate application security testing into your CI pipeline.

## About StackHawk
Here's the rundown:

* ⚡ **Dynamic Application Scanning:** Use HawkScan to find and fix security bugs in your web apps, before you push to production. Think of it as security integration testing. [Get started](https://docs.stackhawk.com/hawkscan/getting-started.html) with your first scan in minutes.
* 🦸 **Built for Modern Dev Teams:** Automate scans with Docker commands, manage configs via YAML, and add app scanning as a build stage. We're built for dev teams that care about security and quality.
* 🧰 **Vulnerability Management:** Document for compliance. Prioritize and manage fixes with integrations to existing ticketing tools. Point in time assessments are a thing of the past - there is a better way.

## Inputs

### `apiKey`

**Required** Your StackHawk API key.

### `dryRun`

**Optional** If set to `true`, show HawkScan commands, but don't run them.

### `environmentVariables`

**Optional** A space-separated list of environment variable to pass to HawkScan.

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

**Optional** A space-separated list of HawkScan configuration files to use. Defaults to `stackhawk.yml`.

### `network`

**Optional** Docker network settings for running HawkScan.  Defaults to `host`.

The following options for `network` are most available:
 - **`host`** (default): Use Docker host networking mode. HawkScan will run with full access to the GitHub virtual environment hosts network stack. This works in most cases if your scan target is a remote URL or a localhost address.
 - **`bridge`**: Use the default Docker bridge network setting for running the HawkScan container. This works in most cases if your scan target is a remote URL or a localhost address.
 - **`NETWORK`**: Use the user-defined Docker bridge network, `NETWORK`. This network may be created with `docker network create`, or `docker-compose`. This is appropriate for scanning other containers running locally on the GitHub virtual environment within a named Docker network.

See the [Docker documentation](https://docs.docker.com/engine/reference/run/#network-settings) for more details on Docker network settings.

### `image`

**Optional** The name of the HawkScan Docker image to use. Defaults to `stackhawk/hawkscan`.

### `version`

**Optional** The version of HawkScan to run. Defaults to `latest`.

## Examples

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
