import https from 'https';
import semver from 'semver';

const FIRST_BINARY_VERSION = '6.0.0';

// The sourceURL input is the legacy ZIP base and ends in /cli
// (default: https://download.stackhawk.com/hawk/cli).
// Binaries live one level up, in a version folder with a bare filename:
//   https://download.stackhawk.com/hawk/{version}/{platform}/hawk[.exe]
// This also works when sourceURL points at dev builds:
//   https://download.stackhawk.com/dev/hawk/cli → https://download.stackhawk.com/dev/hawk
function binaryBaseUrl(urlPath) {
  return urlPath.replace(/\/cli\/?$/, '');
}

function getBinaryDownloadObject(version, urlPath) {
  const platform = process.platform; // darwin, linux, win32
  const arch = process.arch;          // x64, arm64
  const platformKey = {
    darwin: { x64: 'darwin-x64',  arm64: 'darwin-arm64'  },
    linux:  { x64: 'linux-x64',   arm64: 'linux-aarch64' },
    win32:  { x64: 'windows-x64', arm64: 'windows-arm64' },
  }[platform]?.[arch];

  if (!platformKey) {
    throw new Error(`Unsupported platform/arch: ${platform}/${arch}`);
  }

  const ext = platform === 'win32' ? '.exe' : '';
  return {
    url: `${binaryBaseUrl(urlPath)}/${version}/${platformKey}/hawk${ext}`,
    binaryName: `hawk${ext}`,
    isBinary: true,
  };
}

export function getDownloadObject(version, urlPath) {
  // semver comparison: use binary path for 6.0.0+, ZIP path for older versions
  if (semver.gte(version, FIRST_BINARY_VERSION)) {
    return getBinaryDownloadObject(version, urlPath);
  }
  // Legacy ZIP path — unchanged (urlPath keeps its /cli suffix here)
  const binPath = `/hawk-${version}`;
  const url = `${urlPath}/hawk-${version}.zip`;
  return { url, binPath, isBinary: false };
}

export async function getLatestVersion() {
  return new Promise(function (resolve, reject) {
    https
      .get('https://api.stackhawk.com/hawkscan/version', (res) => {
        if (res.statusCode !== 200) {
          reject(res);
        }
        let data = '';
        res.on('data', function (chunk) {
          data += chunk;
        });
        res.on('end', function () {
          resolve(data);
        });
      })
      .on('error', (e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        reject(e);
      });
  });
}
