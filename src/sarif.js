const core = require('@actions/core');
const { Octokit } = require('@octokit/core');
const simpleGit = require('simple-git');
const zlib = require('zlib');
const url = require("url");
const git = simpleGit();

// https://docs.github.com/en/rest/reference/code-scanning#upload-an-analysis-as-sarif-data--code-samples
module.exports.uploadSarif = async function uploadSarif(scanData, githubToken) {
  const octokit = new Octokit({ auth: githubToken });

  const githubRepository = process.env['GITHUB_REPOSITORY'];
  if (githubRepository === undefined || '') throw new Error(`GITHUB_REPOSITORY environment variable must be set`);
  const [owner, repo] = githubRepository.split('/');
  const ref = await getRef();
  const commitShaLocal = await git.revparse('HEAD')
  const commitSha = process.env['GITHUB_SHA'] || commitShaLocal;

  let exitCode = 0;

  const sarifContent = sarifBuilder(scanData);
  core.debug(`Running SARIF upload with results link: ${scanData.resultsLink}`);
  core.debug(`Running SARIF upload with HawkScan version: ${scanData.hawkscanVersion}`);
  core.debug(`Running SARIF upload with failure threshold: ${scanData.failureThreshold}`);
  core.debug(`SARIF file contents:\n${JSON.stringify(sarifContent)}`);

  const sarifZip = zlib.gzipSync(JSON.stringify(sarifContent)).toString('base64');

  core.info('Uploading SARIF results to GitHub.');
  try {
    const response = await octokit.request(`POST /repos/${owner}/${repo}/code-scanning/sarifs`, {
      commit_sha: commitSha,
      ref: ref,
      sarif: sarifZip,
      tool_name: 'StackHawk HawkScan Dynamic Application Security Test Scanner',
      checkout_uri: url.pathToFileURL(process.cwd()).toString(),
    });
    core.info('SARIF upload complete.');
    core.debug(response.data);
  } catch (e) {
    exitCode = 1;
    core.error('Error uploading the SARIF results.')
    core.error(e);
  }
  return exitCode;
}

async function getRef() {
  const gitRefLocal = await git.revparse(['--symbolic-full-name', 'HEAD']);
  const gitRef = process.env['GITHUB_REF'] || gitRefLocal;
  const pullRefRegex = /refs\/pull\/(\d+)\/merge/;
  if (pullRefRegex.test(gitRef)) {
    return gitRef.replace(pullRefRegex, 'refs/pull/$1/head');
  } else {
    return gitRef;
  }
}

function sarifBuilder(scanData) {
  core.info('Preparing SARIF scan results file for GitHub Code Scanning Alerts.');
  let sarif = {
    "version": "2.1.0",
    "$schema": "http://json.schemastore.org/sarif-2.1.0",
    "runs": [
      {
        "tool": {
          "driver": {
            "name": "HawkScan",
            "version": scanData.hawkscanVersion,
            "semanticVersion": scanData.hawkscanVersion,
            "informationUri": "https://docs.stackhawk.com/hawkscan/",
            "rules": [
              {
                "id": "alert/threshold-met",
                "name": "alert/threshold-met",
                "helpUri": "https://docs.stackhawk.com/web-app/scans.html#scan-details-page",
                "help": {
                  "text": "StackHawk found results that meet or exceed your failure threshold, `hawk.failureThreshold`"
                },
                "shortDescription": {
                  "text": "StackHawk found results that meet or exceed your failure threshold"
                },
                "properties": {
                  "tags": [
                    "StackHawk",
                    "HawkScan"
                  ]
                }
              }
            ]
          }
        },
        "results": []
      }
    ]
  };
  if (scanData.exitCode === 42) {
    sarif.runs[0].results[0] = {
      "level": "",
      "locations": [
        {
          "id": 1,
          "physicalLocation": {
            "region": {
              "startLine": 1
            },
            "artifactLocation": {
              "uri": "nofile.md"
            }
          }
        }
      ],
      "message": {
        "text": `StackHawk found issues that meet or exceed your failure threshold.\n\`hawk.failureThreshold=${scanData.failureThreshold}\`.\nSee [Scan Results](${scanData.resultsLink}) for more details.`
      },
      "ruleId": "alert/threshold-met"
    }
  }
  return sarif;
}
