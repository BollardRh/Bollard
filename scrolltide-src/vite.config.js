import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], define: { 'process.env.NODE_ENV': JSON.stringify('production') }, build: { outDir: '../dist/assets/scrolltide', emptyOutDir: true, minify: 'esbuild', lib: { entry: 'src/bollard.jsx', formats: ['es'], fileName: () => 'bollard.js', cssFileName: 'bollard' }, cssCodeSplit: false } })
