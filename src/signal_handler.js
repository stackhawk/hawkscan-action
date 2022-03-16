const core = require("@actions/core");

let childProcessId = -1;

function killChildProcess() {
    core.debug(`Killing process ${childProcessId}`)
    process.kill(Number(childProcessId), 'SIGTERM');
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

    process.on('SIGHUP', () => {
        core.debug(`SIGHUP received for ${process.pid}`);
        if (process.pid !== childProcessId){
            killChildProcess();

            setTimeout(() => {
                console.log('Exiting.');
                process.exit(1);
            }, 1000);
        }
    });
}

module.exports.addChildProcessId = function addChildProcessId(id){
    core.debug(`Starting process ${id}`)
    childProcessId = id;
}
