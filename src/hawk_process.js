const {spawn} = require("child_process");
const core = require('@actions/core');

module.exports.spawnHawk = function spawnHawk(command, args) {
    const child = spawn(command, args)
    let stdout = '';
    let stderr = '';
    const response = {};

    if (child.stdout) {
        child.stdout.on('data', data => {
            stdout += data.toString();
            process.stdout.write(data);
        })
    }

    if (child.stderr) {
        child.stderr.on('data', data => {
            stderr += data.toString();
            process.stderr.write(data);
        })
    }

    const promise = new Promise((resolve, reject) => {
        child.on('error',(err) => {
            core.info("The child process errored")
            reject(err);
        });

        child.on('close', code => {
            core.info("The child process closed")
            if (code === 0) {
                response.stdout = stdout;
                response.code = code;
                resolve(response);
            } else {
                core.info("The child process non zeroed")
                const err = new Error(`child exited with code ${code}`);
                // err.code = code;
                // err.stderr = stderr;
                // err.stdout = stdout;
                reject(err);
                //throw err
            }
        })
    })

    promise.child = child

    return promise
}