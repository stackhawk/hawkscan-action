const core = require("@actions/core");
const {kill} = require("process");

let childProcessId = -1;

function killChildProcess() {
    core.debug(`Killing process ${childProcessId}`)
    if (childProcessId > 0)
        kill(Number(childProcessId), 2);
}

module.exports.addSignalHandler = function addSignalHandler(){
    process.on('SIGINT', () => {
        core.debug('SIGINT received');
        if (process.pid !== childProcessId){
            killChildProcess();
        } else {
            process.exit();
        }
    });
}

module.exports.addChildProcessId = function addChildProcessId(id){
    core.debug(`Starting process ${id}`)
    childProcessId = id;
}
