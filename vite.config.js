import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const rootDirectory = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDirectory, './src'),
      '@components': path.resolve(rootDirectory, './src/components'),
      '@pages': path.resolve(rootDirectory, './src/pages'),
      '@theme': path.resolve(rootDirectory, './src/theme'),
      '@types': path.resolve(rootDirectory, './src/types'),
      '@utils': path.resolve(rootDirectory, './src/utils'),
      '@hooks': path.resolve(rootDirectory, './src/hooks'),
      '@services': path.resolve(rootDirectory, './src/services'),
      '@data': path.resolve(rootDirectory, './src/data'),
    },
  },
})
