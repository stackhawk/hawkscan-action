const core = require("@actions/core");

let childProcessId = -1;

function killChildProcess() {
    core.debug(`Killing process ${childProcessId}`)
    if (childProcessId > 0)
        process.kill(Number(childProcessId), 'SIGTERM');
}

module.exports.addSignalHandler = function addSignalHandler(){
    process.on('SIGINT', () => {
        core.debug(`SIGINT received for ${process.pid}`);
        if (process.pid !== childProcessId){
            killChildProcess();
        }
    });
}

module.exports.addChildProcessId = function addChildProcessId(id){
    core.debug(`Starting process ${id}`)
    childProcessId = id;
}
