import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { spriteify } from '../../dist/index.mjs';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    spriteify({
      inputDir: 'src/assets/icons',
      outputDir: 'src/components',
      withTypes: true,
    })],
});
