const core = require("@actions/core");
const {kill} = require("process");

function killChildProcess() {
    let processId = process.env.STATE_SubProcessId;

    core.debug(`Killing process ${processId}`)
    kill(Number(processId), 2);
}

module.exports.addSignalHandler = function addSignalHandler(){
    process.on('SIGINT', () => {
        core.debug('SIGINT received');
        if (process.pid !== Number(process.env.STATE_SubProcessId)){
            killChildProcess();
        } else {
            process.exit();
        }
    });

    // process.on('SIGHUP', () => {
    //     core.debug('SIGHUP received');
    //     killChildProcess();
    //     process.exit();
    // });
    //
    // process.on('SIGTERM', () => {
    //     core.debug('SIGTERM received');
    //     killChildProcess();
    //     process.exit();
    // });
}
