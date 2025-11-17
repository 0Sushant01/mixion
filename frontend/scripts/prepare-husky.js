const { execSync } = require('child_process');
const fs = require('fs');

try {
  if (fs.existsSync('.git')) {
    console.log('.git found — installing husky hooks');
    execSync('npx husky install', { stdio: 'inherit' });
  } else {
    console.log('.git not found — skipping husky install');
  }
} catch (err) {
  console.error('Failed to run husky install:', err);
  process.exit(0);
}
