import { defineConfig } from 'tsup';
import { solidPlugin } from 'esbuild-plugin-solid';

export default defineConfig({
    entry: {
        dev: 'src/dev.tsx',
        gallery: 'src/demos/gallery.tsx',
        workbench: 'src/demos/workbench.tsx',
    },
    outDir: '.dev',
    format: ['esm'],
    dts: false,
    sourcemap: true,
    clean: true,
    target: 'node20',
    platform: 'node',
    noExternal: ['solid-js'],
    treeshake: true,
    esbuildOptions(options) {
        options.conditions = ['browser'];
    },
    esbuildPlugins: [
        solidPlugin({
            solid: {
                moduleName: '#renderer',
                generate: 'universal',
            }
        })
    ]
});
