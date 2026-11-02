// Runs the Storybook interaction tests (npm run test-storybook) headless: serves the static build from
// `npm run build-storybook` (storybook-static/) on a local port, runs every story's play function in Chromium with
// @storybook/test-runner, then stops the server. Extra arguments go to test-storybook, e.g. `-- --maxWorkers=2`.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = join(root, 'storybook-static');
const port = Number(process.env.STORYBOOK_TEST_PORT ?? 6008);

if (!existsSync(join(dir, 'index.json'))) {
  console.error('No Storybook build found. Run `npm run build-storybook` first.');
  process.exit(1);
}

const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff'
};

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  let file = normalize(join(dir, path));
  if (!file.startsWith(dir)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});

server.listen(port, '127.0.0.1', () => {
  const runner = spawn('npx', ['test-storybook', '--url', `http://127.0.0.1:${port}`, ...process.argv.slice(2)], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  runner.on('exit', code => server.close(() => process.exit(code ?? 1)));
});
