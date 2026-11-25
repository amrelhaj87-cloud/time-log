import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

function getBuildCommit(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      // Baked into the bundle so the running app can compare itself with /version.json.
      __BUILD_COMMIT__: JSON.stringify(getBuildCommit())
    },
    build: {
      rollupOptions: {
        output: {
          // Split heavy third-party libraries into dedicated cacheable chunks so
          // the main app chunk stays small on first load, and repeat visits only
          // re-download the app code instead of the big vendor libraries.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase';
            if (id.includes('lucide')) return 'vendor-icons';
            if (id.includes('motion') || id.includes('framer')) return 'vendor-motion';
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
            return 'vendor';
          },
        },
      },
    },
  };
});
