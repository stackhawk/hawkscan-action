const core = require('@actions/core');
const { Octokit } = require('@octokit/core');
const simpleGit = require('simple-git');
const zlib = require('zlib');
const url = require("url");
const git = simpleGit();

// https://docs.github.com/en/rest/reference/code-scanning#upload-an-analysis-as-sarif-data--code-samples
module.exports.uploadSarif = async function uploadSarif(scanData, githubToken) {
  let exitCode = 0;
  const resultsLink = scanData.resultsLink;
  const hawkscanVersion = scanData.hawkscanVersion;
  const failureThreshold = scanData.failureThreshold;
  const sarifContent = sarifBuilder(resultsLink, hawkscanVersion, failureThreshold);
  core.debug(`Running SARIF upload with results link: ${scanData.resultsLink}`);
  core.debug(`Running SARIF upload with HawkScan version: ${scanData.hawkscanVersion}`);
  core.debug(`Running SARIF upload with failure threshold: ${scanData.failureThreshold}`);
  core.debug(`SARIF file contents:\n${JSON.stringify(sarifContent)}`);

  const octokit = new Octokit({ auth: githubToken });
  const githubRepository = process.env['GITHUB_REPOSITORY'];
  if (githubRepository === undefined) throw new Error(`GITHUB_REPOSITORY environment variable must be set`);
  const [owner, repo] = githubRepository.split('/');
  const ref = await getRef();
  const commitShaLocal = await git.revparse('HEAD')
  const commitSha = process.env['GITHUB_SHA'] || commitShaLocal;
  const sarifZip = zlib.gzipSync(JSON.stringify(sarifContent)).toString('base64');

  try {
    await octokit.request(`POST /repos/${owner}/${repo}/code-scanning/sarifs`, {
      // owner: owner,
      // repo: repo,
      commit_sha: commitSha,
      ref: ref,
      sarif: sarifZip,
      tool_name: 'StackHawk HawkScan Dynamic Application Security Test Scanner',
      checkout_uri: url.pathToFileURL(process.cwd()).toString(),
    });
  } catch (e) {
    exitCode = 1;
    core.debug('Error uploading the SARIF results...')
    core.error(e);
  }
  return exitCode
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

function sarifBuilder(resultsLink, hawscanVersion, failureThreshold) {
  return {
    "version": "2.1.0",
    "$schema": "http://json.schemastore.org/sarif-2.1.0",
    "runs": [
      {
        "tool": {
          "driver": {
            "name": "HawkScan",
            "version": hawscanVersion,
            "semanticVersion": hawscanVersion,
            "informationUri": "https://docs.stackhawk.com/hawkscan/",
            "rules": [
              {
                "id": "alert/threshold-met",
                "name": "alert/threshold-met",
                "helpUri": "https://docs.stackhawk.com/web-app/scans.html#scan-details-page",
                "help": {
                  "text": "HawkScan found results that meet or exceed your failure threshold, `hawk.failureThreshold`"
                },
                "shortDescription": {
                  "text": "HawkScan found results that meet or exceed your failure threshold"
                },
                "properties": {
                  "tags": [
                    "Alert Threshold Met"
                  ]
                }
              }
            ]
          }
        },
        "results": [
          {
            "level": "warning",
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
              "text": `HawkScan found issues that meet or exceed your failure threshold.\n\`hawk.failureThreshold=${failureThreshold}\`.\nSee [Scan Results](${resultsLink}) for more details.`
            },
            "ruleId": "alert/threshold-met"
          }
        ]
      }
    ]
  };
}
