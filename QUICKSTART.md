## StackHawk Setup

1. If you do not have an existing account or application on StackHawk,
   [follow our platform quickstart guide](https://docs.stackhawk.com/hawkscan/#quickstart). Make sure to save your API key

2. [Save the API Key](https://app.stackhawk.com/settings/apikeys)

## GitHub Setup

1. Create or use an existing GitHub [Repository](https://help.github.com/en/github/creating-cloning-and-archiving-repositories/creating-a-new-repository).

2. Add the following secrets to your repository's [secrets](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets)

    - `API_KEY`: API Key from your stack hawk platform

3. Create a stackhawk.yml in your repository. Paste in the following values
```yaml
# -- stackhawk configuration for Your App --
app:
  # -- An applicationId obtained from the StackHawk platform. --
  applicationId: <APPLICATION_ID> # (required)
  # -- The environment for the applicationId defined in the StackHawk platform. --
  env: <APP_ENV> # (required)
  # -- The url of your application to scan --
  host: <HOST_URL> # (required)


  # -- Customized Configuration for GraphQL/SOAP/OpenAPI, add here --
  # Configuration Docs: https://docs.stackhawk.com/hawkscan/configuration/

  # -- If Authenticated Scanning is needed, add here --
  # Authenticated Scanning Docs: https://docs.stackhawk.com/hawkscan/authenticated-scanning.html
  # Authenticated Scanning Repo: https://github.com/kaakaww/scan-configuration/tree/main/Authentication

  # -- Help Section --
  # Docs: https://docs.stackhawk.com/
  # Contact Support: support@stackhawk.co 
```

4. Update `stackhawk.yml` to match the values corresponding to your application:

    - `APPLICATION_ID` - application id from the [StackHawkPlatform](https://app.stackhawk.com/applications)

    - `APP_ENV` - environment of your application (e.g. Development, Production, etc)

    - `HOST_URL` - url of our application (e.g. http://localhost:9000)

   To get a full list of configurations see [StackHawk Documentation](https://docs.stackhawk.com/hawkscan/configuration/)

## Set up your application in StackHawk
1. In your GitHub repo click the actions button

2. Push the new workflow button

3. Select set up a workflow yourself

4. Copy/paste the following yaml into the main.yml window
```yaml
name: "HawkScan Scan"
on:
  pull_request:

jobs:
  stackhawk-hawkscan:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v2
    - uses: stackhawk/hawkscan-action@v1.3.4
      with:
        apiKey: ${{ secrets.HAWK_API_KEY }}
        configurationFiles: /path/to/stackhawk.yml #path relative to the stackhawk.yml in your repository
```

## Example Workflows

1. [Example Workflows](example_workflows/README.md)


## Run the workflow

1. Create and commit a change to your repository:

    ```text
    $ git add .
    $ git commit -m "Set up GitHub workflow"
    ```

2. Push to a branch :

    ```text
    $ git push -u origin <branch>
    ```

3. View the GitHub Actions Workflow by selecting the `Actions` tab at the top
   of your repository on GitHub. Then click on the `HawkScan Scan`
   element to see the details.