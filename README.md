[![StackHawk](https://www.stackhawk.com/stackhawk-light-long@2x.png)](https://stackhawk.com)

# StackHawk HawkScan Action

The [StackHawk](https://www.stackhawk.com/) [HawkScan](https://hub.docker.com/r/stackhawk/hawkscan) GitHub Action makes it easy to integrate application security testing into your CI pipeline.

## About StackHawk
Here's the rundown:

 * 🧪 Modern Application Security Testing: StackHawk is a dynamic application security testing (DAST) tool, helping you catch security bugs before they hit production.
 * 💻 Built for Developers: The engineers building software are the best equipped to fix bugs, including security bugs. StackHawk does security, but is built for engineers like you.
 * 🤖 Simple to Automate in CI: Application security tests belong in CI, running tests on every PR. Adding StackHawk tests to a DevOps pipeline is easy.

## Getting Started
 * Get your application set up in StackHawk with our [quickstart guide](https://docs.stackhawk.com/hawkscan/#quickstart)
 * Add your HawkScan Action to your GitHub repository. [Continuous Integration with HawkScan GitHub Action](https://docs.stackhawk.com/continuous-integration/github-actions.html)

## Inputs

### `apiKey`

**Required** Your StackHawk API key.

For example:
```yaml
jobs:
  stackhawk-hawkscan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: stackhawk/hawkscan-action@v2.3.0
      with:
        apiKey: ${{ secrets.HAWK_API_KEY }}
```

### `args`

**Optional** If you wish to supply additional arguments as a multi line input use the `args` option.

For example:
```yaml
jobs:
  stackhawk-hawkscan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: stackhawk/hawkscan-action@v2.3.0
      with:
        args: |
          --hawk-mem 1g
```

### `command`

**Optional** If you want to run a command other than `scan`, it can be supplied in the command option.

For example:
```yaml
jobs:
  stackhawk-hawkscan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: stackhawk/hawkscan-action@v2.3.0
      with:
        command: rescan
```

### `dryRun`

**Optional** If set to `true`, shows HawkScan commands, but don't run them. 

For example:
```yaml
jobs:
  stackhawk-hawkscan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: stackhawk/hawkscan-action@v2.3.0
      with:
        apiKey: ${{ secrets.HAWK_API_KEY }}
        dryRun: true
```

### `configurationFiles`

**Optional** A list of HawkScan configuration files to use. Defaults to `stackhawk.yml`. File names can be separated with spaces, commas, or newlines.

For example:
```yaml
jobs:
  stackhawk-hawkscan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: stackhawk/hawkscan-action@v2.3.0
      with:
        apiKey: ${{ secrets.HAWK_API_KEY }}
        configurationFiles: stackhawk.yml stackhawk-extra.yml
```

### `installCLIOnly`

**Optional** Flag to signal to only install the CLI and not run a scan if set to true. Then you can optionally run hawk CLI from the job

For example:
```yaml
jobs:
  stackhawk-hawkscan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: stackhawk/hawkscan-action@v2.3.0
    with:
      installCLIOnly: true
    - name: Run CLI Scan
      run: hawk --api-key=${{ secrets.HAWK_API_KEY }} scan
```

### `codeScanningAlerts`

**Optional** *(requires [`githubToken`](#githubtoken))* If set to `true`, uploads SARIF scan data to GitHub so that scan results are available from [Code Scanning](https://docs.github.com/en/code-security/secure-coding/automatically-scanning-your-code-for-vulnerabilities-and-errors/about-code-scanning).

The `codeScanningAlerts` feature works in conjunction with the HawkScan's [`hawk.failureThreshold`](https://docs.stackhawk.com/hawkscan/configuration/#hawk) configuration option. If your scan produces alerts that meet or exceed your `hawk.failureThreshold` alert level, it will fail the scan with exit code 42, and trigger a Code Scanning alert in GitHub with a link to your scan results.

For example:
```yaml
jobs:
  stackhawk-hawkscan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: stackhawk/hawkscan-action@v2.3.0
      with:
        apiKey: ${{ secrets.HAWK_API_KEY }}
        codeScanningAlerts: true
        githubToken: ${{ github.token }}
```

> NOTE: GitHub Code Scanning features are free for public repositories. For private repositories, a [GitHub Advanced Security](https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security) license is required.

### `githubToken`

**Optional** If set to `${{ github.token }}`, gives HawkScan Action a temporary GitHub API token to enable uploading SARIF data. This input is required if `codeScanningAlerts` is set to `true`.

### `debug` 

**Optional** If you need additional information on your scans enable the debug and verbose environment variables to see detailed logs in the workflow output

```yaml
jobs:
  stackhawk-hawkscan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: stackhawk/hawkscan-action@v2.3.0
        with:
          apiKey: ${{ secrets.HAWK_API_KEY }}
          verbose: true
          debug: true
```

### `workspace`

**Optional** If you need to configure your scan to run in folder outside your .github folder you can set a workspace path relative to your directory

```yaml
jobs:
  stackhawk-hawkscan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: stackhawk/hawkscan-action@v2.3.0
        with:
          workspace: ./app/config/
```

### `version`

**Optional** If you need to configure your scan to run with a specific version of HawkScan you can set the version

```yaml
jobs:
  stackhawk-hawkscan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: stackhawk/hawkscan-action@v2.3.0
        with:
          version: 2.7.0
```

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
      uses: stackhawk/hawkscan-action@v2.3.0
      with:
        apiKey: ${{ secrets.HAWK_API_KEY }}
```

The next example shows a similar job with more options enabled, described below.

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
      uses: stackhawk/hawkscan-action@v2.3.0
      with:
        apiKey: ${{ secrets.HAWK_API_KEY }}
        dryRun: true
        configurationFiles: |
          stackhawk.yml
          stackhawk-extras.yml
```

The configuration above will perform a dry run, meaning it will only print out the Docker command that it would run if `dryRun` were set to `false`, which is the default.  Finally, it tells HawkScan to use the `stackhawk.yml` configuration file and overlay the `stackhawk-extra.yml` configuration file on top of it.

## Windows Support
The HawkScan action is also supported on windows! With some nuances:

### Ensure java is up to date
Github's `windows-2022` runners may default to an earlier version of Java 11. As a result, you might see this error when running on Windows:

```
Error: A JNI error has occurred, please check your installation and try again
com/stackhawk/zap/Bootstrap has been compiled by a more recent version of the Java Runtime (class file version 55.0), this version of the Java Runtime only recognizes class file versions up to 52.0
```

To address this, Java on Hosted Windows Runners can be easily setup in a prior workflow step to instead use a later java version:
```yaml
    - uses: actions/setup-java@v3
      with:
        distribution: 'temurin'
        java-version: '17'
```

Due to the nature of powershell and how we call java, this defect may not fail a build, and can pass silently.

## Need Help?

If you have questions or need some help, please email us at support@stackhawk.com.
