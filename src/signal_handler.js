const core = require("@actions/core");

let childProcess = '';

function killChildProcess() {
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
