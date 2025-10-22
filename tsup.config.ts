import { defineConfig } from 'tsup'
import vueJsx from 'esbuild-plugin-vue-jsx'

export default defineConfig({
    entry: ['src/index.tsx'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    esbuildPlugins: [vueJsx()],
    platform: 'node',
    external: ['vue'],
    outDir: 'dist'
});