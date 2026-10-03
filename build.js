const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const frontendDir = path.join(rootDir, 'frontend');
const distDir = path.join(rootDir, 'dist');
const angularDistDir = path.join(frontendDir, 'dist', 'frontend', 'browser');

console.log('=== All Light Build (Angular & Golang) ===');

// 1. Build Angular Frontend if needed
try {
  console.log('1. Building Angular Frontend...');
  execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });
} catch (e) {
  console.warn('Note: Angular build step in subfolder returned error or was skipped:', e.message);
}

// 2. Prepare dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// 3. Copy built Angular files to dist/
if (fs.existsSync(angularDistDir)) {
  console.log('2. Copying Angular output to dist/...');
  for (const file of fs.readdirSync(angularDistDir)) {
    const src = path.join(angularDistDir, file);
    const dest = path.join(distDir, file);
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.cpSync(src, dest, { recursive: true });
    } else {
      fs.copyFileSync(src, dest);
    }
  }
} else {
  console.warn('Warning: Angular dist directory not found at', angularDistDir);
}

// 4. Build Golang backend if Go is installed
try {
  console.log('3. Building Golang Backend...');
  execSync('go build -o allight-server.exe ./backend/main.go', { cwd: rootDir, stdio: 'inherit' });
  console.log('   allight-server.exe compiled successfully.');
} catch (e) {
  console.log('   Go build skipped or failed:', e.message);
}

console.log('=== Build Complete! ===');
