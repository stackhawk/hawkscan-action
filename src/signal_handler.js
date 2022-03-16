const core = require("@actions/core");
const ps = require("ps-node");


let childProcess = '';

function killChildProcess() {
    ps.lookup({
        command: 'node',
        arguments: '--debug',
    }, function(err, resultList ) {
        if (err) {
            throw new Error( err );
        }

        resultList.forEach(function( process ){
            if( process ){
                console.log( 'PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments );
            }
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
