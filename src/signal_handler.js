const core = require("@actions/core");
const {exec} = require("child_process");


let childProcess = '';

function killChildProcess() {

    exec('pgrep java', function(err, stdout) {
        core.debug(stdout);
        let result = stdout.toString().split('\n');
        result.forEach(element => {
            core.debug(element)
            let pid = parseInt(element);
            if (!isNaN(pid) && pid > -1)
                process.kill(pid, 'SIGINT')
        });
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
