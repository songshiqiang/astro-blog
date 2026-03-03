
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PAGES_DIR = path.join(PROJECT_ROOT, 'src', 'pages');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

// Folders to exclude
const EXCLUSIONS = [
  { base: PAGES_DIR, original: 'admin', temp: '_admin' },
  { base: PAGES_DIR, original: 'api', temp: '_api' },
  { base: PUBLIC_DIR, original: 'images', temp: '_images' }
];

function renameFolders(toTemp) {
  EXCLUSIONS.forEach(({ base, original, temp }) => {
    const src = toTemp ? path.join(base, original) : path.join(base, temp);
    const dest = toTemp ? path.join(base, temp) : path.join(base, original);

    if (fs.existsSync(src)) {
      console.log(`Renaming ${src} to ${dest}`);
      try {
        fs.renameSync(src, dest);
      } catch (e) {
        console.error(`Failed to rename ${src} to ${dest}:`, e);
      }
    } else {
      if (toTemp) {
        console.log(`Directory ${src} does not exist, skipping rename.`);
      }
    }
  });
}

function runBuild() {
  try {
    // 1. Run R2 Image Upload (Incremental)
    console.log('--- starting R2 image upload ---');
    execSync('node scripts/r2-upload.js', {
      stdio: 'inherit',
      cwd: PROJECT_ROOT
    });

    // 2. Rename to temp folders (exclude from build)
    console.log('--- preparing build: excluding admin and images ---');
    renameFolders(true);

    // 3. Run actual build
    console.log('--- running build command ---');
    execSync('node scripts/themeGenerator.js && pnpm generate-json && astro build', {
      stdio: 'inherit',
      cwd: PROJECT_ROOT
    });

    // 4. Clean up excluded folders from dist
    const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
    EXCLUSIONS.forEach(({ temp }) => {
      const distPath = path.join(DIST_DIR, temp);
      if (fs.existsSync(distPath)) {
        console.log(`Cleaning up ${distPath} from dist...`);
        fs.rmSync(distPath, { recursive: true, force: true });
      }
    });

    console.log('--- build successful ---');
  } catch (error) {
    console.error('--- build failed ---');
    process.exitCode = 1;
  } finally {
    // 3. Rename back to original (restore env)
    console.log('--- restoring admin lines ---');
    renameFolders(false);
  }
}

runBuild();
