const { exec } = require('child_process');

const applicationName = 'Install Software';

function installSoftware(packageName) {
    exec(`sudo apt install -y ${packageName}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
    });
}

function main() {
    const packageName = 'openbox'; 

    console.log(`Running ${applicationName}...`);
    installSoftware(packageName);
    console.log(`${applicationName} completed.`);
}

main();