const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

console.log('=== All Light Universal Vercel & Go Build ===');

// Directories where any preset (Other, Angular, Vite, Next, etc.) might look
const targetDirs = [
  rootDir,
  distDir,
  path.join(distDir, 'browser'),
  path.join(distDir, 'allight-app'),
  path.join(distDir, 'allight-app', 'browser'),
  path.join(distDir, 'frontend'),
  path.join(distDir, 'frontend', 'browser'),
  path.join(rootDir, 'public')
];

// Files to sync across all potential output folders
const staticFiles = [
  'index.html',
  'main-TVCXTZC7.js',
  'styles-VJF5A3FQ.css',
  'favicon.svg',
  'icons.svg',
  'favicon.ico'
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  for (const file of staticFiles) {
    const src = path.join(rootDir, file);
    const dest = path.join(dir, file);
    if (fs.existsSync(src) && src !== dest) {
      fs.copyFileSync(src, dest);
    }
  }
}
console.log('Synchronized static Angular app across all target directories.');

// Optional Go build if running in local environment
try {
  execSync('go version', { stdio: 'ignore' });
  execSync('go build -o allight-server.exe ./backend/main.go', { cwd: rootDir, stdio: 'inherit' });
  console.log('Golang binary compiled for local execution.');
} catch (e) {
  // Go not available on Vercel Node container - safe to ignore
}

console.log('=== Build Completed Successfully! ===');
