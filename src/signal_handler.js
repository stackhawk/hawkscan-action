const core = require("@actions/core");
const {exec} = require("child_process");

function killHawkProcess() {
    interruptProcess('hawk');
    interruptProcess('java');
}

function interruptProcess(name){
    core.debug(`Killing process ${name}`)
    exec(`pgrep ${name}`, function(err, stdout) {
        const result = stdout.toString().split('\n');
        result.forEach(element => {
            const pid = parseInt(element, 10);
            if (!isNaN(pid) && pid > -1) {
                core.debug(`Killing process id ${element}`);
                try {
                    process.kill(pid, 'SIGINT');
                } catch (e) {
                    core.error(e.message);
                }
            }
        });
    });
}

module.exports.addSignalHandler = function addSignalHandler(){
    process.on('SIGINT', () => {
        core.debug(`SIGINT received for ${process.pid}`);
        killHawkProcess();
    });
}
