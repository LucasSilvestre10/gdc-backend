const { spawn } = require('child_process');
const os = require('os');

const platform = os.platform();

console.log('⏳ Subindo containers...');

// 1. Sobe containers em background
const up = spawn('docker-compose', ['up', '-d'], { stdio: 'inherit' });

up.on('close', (code) => {
    console.log(`docker-compose up finalizou com código ${code}`);
    
    //TODO: ajustar essa parte depois
    // 2. Mostra apenas os logs do mongo-express
    // const logs = spawn('docker-compose', ['logs', '-f', '--no-log-prefix', 'mongo-express'], { stdio: 'inherit' });


    ////TODO:ajustar essa parte depois
    // // 3. Após mongo-express indicar que está pronto, o wait-mongo.ps1/sh pode rodar
    // logs.on('close', () => {
    //     if (platform === 'win32') {
    //         console.log('Executando wait-mongo.ps1 para Windows...');
    //         spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', 'wait-mongo.ps1'], { stdio: 'inherit' });
    //     } else {
    //         console.log('Executando wait-mongo.sh para Linux/macOS...');
    //         spawn('bash', ['./wait-mongo.sh'], { stdio: 'inherit' });
    //     }
    // });
});
