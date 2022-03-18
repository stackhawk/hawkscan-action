const https = require("https");

function getDownloadObject(version, urlPath) {
    const binPath = `/hawk-${ version }`;
    const url = `${urlPath}/hawk-${ version }.zip`;
    return {
        url,
        binPath
    };
}

async function getLatestVersion() {
    return new Promise(function(resolve, reject) {
        https.get('https://api.stackhawk.com/hawkscan/version', (res) => {
            if (res.statusCode !== 200)
                reject(res);
            let data = "";
            res.on('data', function (chunk) {
                data += chunk
            });
            res.on('end', function () {
                resolve(data);
            });

        }).on('error', (e) => {
            console.error(e);
            reject(e);
        });
    });
}
module.exports = { getDownloadObject, getLatestVersion }