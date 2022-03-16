const core = require("@actions/core");
const {kill} = require("process");


module.exports.killChildProcess = function killChildProcess() {
    let processId = core.getState("SubProcessId");

    core.debug(`Killing process ${process.pid}`)
    kill(Number(processId), 2)
}

module.exports.addSignalHandler = function addSignalHandler(){
    process.on('SIGINT', () => {
        core.debug('SIGINT received');
        if (process.pid !== (Number(core.getState("SubProcessId")))) {
            this.killChildProcess();
        }
        process.exit();
    });
}
