import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'node20',
    platform: 'node',
    external: [/^solid-js/],
    noExternal: [],
    treeshake: true,
    esbuildOptions(options) {
        options.outExtension = { '.js': '.mjs' };
    },
});