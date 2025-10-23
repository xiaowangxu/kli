import { defineConfig } from 'tsup';
import { solidPlugin } from 'esbuild-plugin-solid';

export default defineConfig({
    entry: {
        dev: 'src/dev.tsx',
    },
    format: ['esm'],
    dts: true,
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