# StackHawk HawkScan Action

A GitHub Action for running [StackHawk](https://www.stackhawk.com/) [HawkScan](https://hub.docker.com/r/stackhawk/hawkscan) to find security issues in your application.

HawkScan scans a specified URL and sends results to the StackHawk platform for alerting, tracking, and triage.

## Inputs

### Environment Variables

You can use environment variables in your HawkScan configuration file to dynamically configure settings. [read the HawkDocs](https://docs.stackhawk.com/hawkscan/configuration/#environment-variable-runtime-overrides) for more information about how to incorporate environment variables into your HawkScan configuration file, `stackhawk.yml`.

*Be sure to declare any environments you wish to pass to HawkScan in the `environment-variables` input below*!

### `api-key`

**Required** Your StackHawk API key.

### `dry-run`

**Optional** If set to `true`, show HawkScan commands, but don't run them.

### `environment-variables`

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
        api-key: ${{ secrets.HAWK_API_KEY }}
        environment-variables: APP_HOST APP_ENV
      env:
        APP_HOST: http://example.com
        APP_ENV: GitHub
```

### `configuration-files`

**Optional** A space-separated list of HawkScan configuration files to use. Defaults to `stackhawk.yml`.

### `network`

**Optional** Docker network settings for running HawkScan.  Defaults to `bridge`.

The following options for `docker-network` are most commonly used:
 - **`bridge`** (default): Use the default Docker bridge network setting for running the HawkScan container. This works in most cases if your scan target is a remote URL or a localhost address.
 - **`host`**: Use Docker host networking mode. HawkScan will run with full access to the GitHub virtual environment hosts network stack. This works in most cases if your scan target is a remote URL or a localhost address.
 - **`NETWORK`**: Use the user-defined Docker bridge network, `NETWORK`. This network may be created with `docker network create`, or `docker-compose`. This is appropriate for scanning other containers running locally on the GitHub virtual environment within a named Docker network.

See the [Docker documentation](https://docs.docker.com/engine/reference/run/#network-settings) for more details on Docker network settings.

### `image`

**Optional** The name of the HawkScan Docker image to use. Defaults to `stackhawk/hawkscan`.

### `version`

**Optional** The version of HawkScan to run. Defaults to `latest`.

## Outputs

### `success`

Boolean: `true` if the scan exited successfully.

## Examples

```yaml
on: [push]

jobs:
  stackhawk-hawkscan:
    runs-on: ubuntu-latest
    name: Run a container and scan it
    steps:
    - name: Check out repo
      uses: actions/checkout@v2
    - name: Build and run my app
      run: |
        pip3 install -r requirements.txt
        nohup python3 app.py &
    - name: Scan my app
      id: hawkscan
      uses: stackhawk/hawkscan-action@v1
      env:
        HOST: http://localhost:5000
      with:
        api-key: ${{ secrets.HAWK_API_KEY }}
        network: host
    - name: Get scan success status
      run: echo "Was the scan successful? ${{ steps.hawkscan.outputs.success }}"

```