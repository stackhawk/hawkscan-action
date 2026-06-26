import { spawn } from 'child_process';

export function spawnHawk(command, args) {
    // Forward action version to HawkScan so the platform can track adoption metrics.
    // GITHUB_ACTION_REF is set by the runner (e.g., "v3", "v3.1.0").
    const env = {
        ...process.env,
        '_STACKHAWK_ACTION_VERSION':    process.env['GITHUB_ACTION_REF']        ?? 'unknown',
        '_STACKHAWK_ACTION_REPOSITORY': process.env['GITHUB_ACTION_REPOSITORY'] ?? 'unknown',
    };

    const child = spawn(command, args, { env })
    let stdout = '';
    let stderr = '';
    const response = {};

    if (child.stdout) {
        child.stdout.on('data', data => {
            stdout += data.toString();
            process.stdout.write(data);
        })
    }

    if (child.stderr) {
        child.stderr.on('data', data => {
            stderr += data.toString();
            process.stderr.write(data);
        })
    }

    const promise = new Promise((resolve, reject) => {
        child.on('error',(err) => {
            reject(err);
        });

        child.on('close', code => {
            if (code === 0) {
                response.stdout = stdout;
                response.code = code;
                resolve(response);
            } else {
                const err = new Error(`child exited with code ${code}`);
                err.code = code;
                err.stderr = stderr;
                err.stdout = stdout;
                reject(err);
            }
        })
    })

    promise.child = child

    return promise
}
