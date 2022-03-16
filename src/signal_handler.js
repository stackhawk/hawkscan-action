const core = require("@actions/core");
const {kill} = require("process");

function killChildProcess() {
    let processId = core.getState("SubProcessId");

    core.debug(`Killing process ${process.pid}`)
    kill(Number(processId), 2)
}

module.exports.addSignalHandler = function addSignalHandler(){
    process.on('SIGINT', () => {
        core.debug('SIGINT received');
        killChildProcess();
        process.exit();
    });
}
