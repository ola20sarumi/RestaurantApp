// Builds the shareable demo (npm run build:demo): the app with its API replaced by an in-browser stand-in
// (src/main.demo.ts), packed into one self-contained HTML file at dist/demo/restaurant-demo.html.
// Everything is inlined (scripts, styles, icon font, menu photos) because the page is shared as a single file
// that may not load anything from other sites.
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist/demo/browser');

execSync('npx ng build --configuration production,demo', { cwd: root, stdio: 'inherit' });

const read = (file) => readFileSync(join(out, file), 'utf8');
const dataUri = (path, type) => `data:${type};base64,${readFileSync(path).toString('base64')}`;
// "</script" inside an inline script would end it early.
const inlineScript = (code) => code.replace(/<\/script/gi, '<\\/script');

const styles = read('styles.css').replace(/url\("?\.\/media\/(bootstrap-icons\.woff2?)[^)"]*"?\)/g, (_, font) =>
  `url("${dataUri(join(out, 'media', font), font.endsWith('2') ? 'font/woff2' : 'font/woff')}")`);

const imageDir = join(root, 'src/demo/images');
const images = Object.fromEntries(readdirSync(imageDir).filter(f => f.endsWith('.jpg')).map(f =>
  [`https://images.unsplash.com/photo-${f.replace(/\.jpg$/, '')}`, dataUri(join(imageDir, f), 'image/jpeg')]));

const page = `<title>Restaurant Ordering Demo</title>
<style>
${styles}
.demo-banner { background: #1f2a33; color: #f4f6f8; }
.demo-banner a { color: #ffd166; }
.demo-banner code { color: #ffd166; background: rgba(255, 255, 255, .08); padding: 0 .3em; border-radius: .25rem; }
</style>
<app-root></app-root>
<script>window.__DEMO_IMAGES__ = ${JSON.stringify(images)};</script>
<script type="module">${inlineScript(read('polyfills.js'))}</script>
<script type="module">${inlineScript(read('main.js'))}</script>
`;

const target = join(root, 'dist/demo/restaurant-demo.html');
writeFileSync(target, page);
console.log(`Demo written to ${target} (${(Buffer.byteLength(page) / 1024).toFixed(0)} kB)`);
