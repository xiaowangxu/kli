import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/dev.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'node20',
});