# HawkScan  - GitHub Actions

An example workflow that uses [GitHub Actions][actions] to run a scan on your application.

This code is intended to be an _example_. You will likely need to change or
update values to match your setup.

## Workflow description

For pushes to the `main` branch, this workflow will:

1. Use your API Key to authenticate against the StackHawk platform

2. Run a scan against the website specified in the stackhawk_custom.yml

3. Push the scan results to your account on the [StackHawk Platform](https://app.stackhawk.com/scans)


## Setup

1. If you do not have an existing account or application on StackHawk.
    [follow our platform quickstart guide](https://docs.stackhawk.com/hawkscan/#quickstart). Make sure to save your API key

2. [Save the API Key](https://app.stackhawk.com/settings/apikeys)

3. Create or reuse a GitHub repository for the example workflow:

    1. [Create a repository](https://help.github.com/en/github/creating-cloning-and-archiving-repositories/creating-a-new-repository).

    2. Move into the repository directory:

         ```
         $ cd <repo>
         ```

    3. Copy the example into the repository:

        ```
        $ cp -r <path_to>/hawkscan-action/example-workflows/scan/ .
        ```

4. Add the following secrets to your repository's secrets [secrets]:

    - `HAWK_API_KEY`: API Key from your stack hawk platform

5. Update `.github/workflows/stackhawk_custom.yml` to match the values corresponding to your application:

    - `APPLICATION_ID` - application id from the [StackHawkPlatform](https://app.stackhawk.com/applications)

    - `APP_ENV` - environment of your application (e.g. Development, Production, etc)

    - `HOST_URL` - url of our application (e.g. http://localhost:9000)

    To get a full list of configurations see [StackHawk Documentation](https://docs.stackhawk.com/hawkscan/configuration/)

## Run the workflow

1. Add and commit your changes:

    ```text
    $ git add .
    $ git commit -m "Set up GitHub workflow"
    ```

2. Push to the `main` branch:

    ```text
    $ git push -u origin main
    ```

3. View the GitHub Actions Workflow by selecting the `Actions` tab at the top
    of your repository on GitHub. Then click on the `HawkScan Scan`
    element to see the details.

[actions]: https://help.github.com/en/categories/automating-your-workflow-with-github-actions
[secrets]: https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets
