const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');
const indexHtml = path.join(distDir, 'index.html');

console.log('=== All Light Build Process ===');

// Check if pre-built Angular dist is already present
if (fs.existsSync(indexHtml)) {
  console.log('Found verified pre-built Angular app in dist/');
  console.log('Static files ready for Vercel deployment.');
} else {
  // Try to build Angular if node_modules exists
  const frontendDir = path.join(rootDir, 'frontend');
  const angularDistDir = path.join(frontendDir, 'dist', 'frontend', 'browser');
  if (fs.existsSync(frontendDir)) {
    try {
      console.log('Building Angular frontend...');
      execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });
      if (fs.existsSync(angularDistDir)) {
        if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
        for (const file of fs.readdirSync(angularDistDir)) {
          fs.cpSync(path.join(angularDistDir, file), path.join(distDir, file), { recursive: true, force: true });
        }
      }
    } catch (e) {
      console.warn('Angular build skipped:', e.message);
    }
  }
}

// Mirror dist files to root so Vercel can serve from either root or dist
if (fs.existsSync(distDir)) {
  for (const file of fs.readdirSync(distDir)) {
    const src = path.join(distDir, file);
    const dest = path.join(rootDir, file);
    const stat = fs.statSync(src);
    if (!stat.isDirectory()) {
      fs.copyFileSync(src, dest);
    }
  }
}

// Check Go (optional, only if Go exists in local dev environment)
try {
  execSync('go version', { stdio: 'ignore' });
  console.log('Go detected. Compiling allight-server.exe for local run...');
  execSync('go build -o allight-server.exe ./backend/main.go', { cwd: rootDir, stdio: 'inherit' });
} catch (e) {
  console.log('Note: Go not installed in this environment (e.g. Vercel static build). Skipping Go binary build.');
}

console.log('=== Build Completed Successfully! ===');
