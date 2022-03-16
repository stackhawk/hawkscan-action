const core = require("@actions/core");
const {exec} = require("child_process");


let childProcess = '';

function killChildProcess() {
    exec('ps', function(err, stdout, stderr) {
        core.debug(stdout);
        core.debug(stderr);
    });

    exec('pgrep java', function(err, stdout, stderr) {
        core.debug(stdout);
        core.debug(stderr);
    });
    core.debug(`Killing process ${childProcess.pid}`)
    childProcess.kill('SIGINT');
}

module.exports.addSignalHandler = function addSignalHandler(){
    process.on('SIGINT', () => {
        core.debug(`SIGINT received for ${process.pid}`);
        killChildProcess();
    });

    process.on('SIGTERM', () => {
        core.debug(`SIGTERM received for ${process.pid}`);
        killChildProcess();
    });
}

module.exports.addChildProcessId = function addChildProcessId(child){
    core.debug(`Starting process ${child.pid}`)
    childProcess = child;
}
