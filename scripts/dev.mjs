// Launcher توسعه: اجرای همزمان Backend و Frontend بدون وابستگی خارجی
import { spawn } from 'node:child_process';
import process from 'node:process';

function run(label, command, cwd) {
  const child = spawn(command, { cwd, shell: true, stdio: 'inherit' });
  child.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.log(`[${label}] exited with code ${code}`);
    }
  });
  return child;
}

console.log('========================================');
console.log('  صدرا — شروع هم‌زمان سرورها');
console.log('  Backend : http://localhost:4000');
console.log('  Frontend: http://localhost:5173');
console.log('========================================');

const server = run('server', 'npm run dev -w server', process.cwd());
const client = run('client', 'npm run dev -w client', process.cwd());

function shutdown() {
  server.kill();
  client.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);