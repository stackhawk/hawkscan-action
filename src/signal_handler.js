const core = require("@actions/core");
const {exec} = require("child_process");

function killHawkProcess() {
    interruptProcess('hawk');
    interruptProcess('java');
}

function interruptProcess(name){
    core.debug(`Killing process ${name}`)
    exec(`pgrep ${name}`, function(err, stdout) {
        core.debug(stdout);
        let result = stdout.toString().split('\n');
        result.forEach(element => {
            core.debug(`Killing process id ${element}`)
            let pid = parseInt(element);
            if (!isNaN(pid) && pid > -1)
                process.kill(pid, 'SIGINT');
        });
    });
}

module.exports.addSignalHandler = function addSignalHandler(){
    process.on('SIGINT', () => {
        core.debug(`SIGINT received for ${process.pid}`);
        killHawkProcess();
    });
}
