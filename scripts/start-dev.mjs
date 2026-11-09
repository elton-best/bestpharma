#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const env = {
  ...process.env,
  PATH: `/opt/local/bin:/opt/local/sbin:${process.env.PATH || ''}`,
};

console.log('🚀 Démarrage de BEGPHARMA en local...');

const backend = spawn('php', ['artisan', 'serve', '--host=127.0.0.1', '--port=8001'], {
  cwd: join(rootDir, 'backend'),
  env,
  stdio: 'inherit',
});

const frontend = spawn('npm', ['run', 'dev', '--prefix', 'frontend'], {
  cwd: rootDir,
  env,
  stdio: 'inherit',
});

const cleanExit = () => {
  console.log('\n🛑 Arrêt des services BEGPHARMA...');
  backend.kill('SIGTERM');
  frontend.kill('SIGTERM');
  process.exit(0);
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);

backend.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Backend s'est arrêté avec le code ${code}`);
  }
});

frontend.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Frontend s'est arrêté avec le code ${code}`);
  }
});
