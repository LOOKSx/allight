const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const distDir = path.join(__dirname, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    const base = path.basename(src);
    if (base === 'dist' || base === 'node_modules' || base === '.git') {
      return;
    }
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    const name = path.basename(src);
    if (!['server.js', 'build.js', 'package.json', 'package-lock.json', 'README.md', '.gitignore', 'start.bat', 'vercel.json'].includes(name)) {
      fs.copyFileSync(src, dest);
    }
  }
}

copyRecursive(srcDir, distDir);
console.log('Build complete: static files copied to dist/');
