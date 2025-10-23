import { defineConfig } from 'tsup';
import { solidPlugin } from 'esbuild-plugin-solid';

export default defineConfig({
    entry: ['src/dev.tsx'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'node20',
    platform: 'node', // 保持 node 平台
    // 将 solid-js 打包进去，并使用 browser 条件
    noExternal: ['solid-js'],
    esbuildOptions(options) {
        options.conditions = ['browser'];
    },
    esbuildPlugins: [solidPlugin({
        solid: {
            moduleName: '#renderer',
            generate: 'universal',
            hydratable: false,
        },
    })],
});