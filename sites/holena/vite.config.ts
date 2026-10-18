import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Tout est regroupé dans un seul fichier HTML (images comprises),
// pour pouvoir ouvrir le site d'un double-clic.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { assetsInlineLimit: 100_000_000 },
});
