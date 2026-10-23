import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) throw new Error('需要 Node 22.13 或更高版本');
const app = resolve(dirname(fileURLToPath(import.meta.url)), '../app');
if (!existsSync(resolve(app, 'dist/index.html'))) throw new Error('缺少构建产物，请下载完整发行包');
const probe = createServer();
await new Promise((ok, fail) => { probe.once('error', fail); probe.listen(0, '127.0.0.1', ok); });
const port = probe.address().port;
await new Promise(ok => probe.close(ok));
const url = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server-dist/production.js'], {
  cwd: app, env: { ...process.env, PORT: String(port), STUDIO_ORIGIN: url }, stdio: ['ignore', 'pipe', 'inherit']
});
child.stdout.on('data', () => { console.log(`敏敏矩阵工作台：${url}`); });
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = signal ? 0 : (code ?? 1); });
