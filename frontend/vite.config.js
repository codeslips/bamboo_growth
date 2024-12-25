import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  },
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.[jt]sx?$/,
    exclude: [],
  },
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: 'static',
    target: ['es2015', 'chrome76'],
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': [
            'react',
            'react-dom',
            // Add other major dependencies here
          ],
        },
        entryFileNames: 'static/js/[name].[hash].js',
        chunkFileNames: 'static/js/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'static/css/[name].[hash][extname]';
          }
          return 'static/assets/[name].[hash][extname]';
        }
      }
    }
  },
  optimizeDeps: {

    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.jsx': 'jsx'
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 10086,
    proxy: {
      '/api/v1': {
        target: 'http://10.101.102.108:8001',
        changeOrigin: true,
        secure: false,
      },
      '/data': {
        target: 'http://10.101.102.108:8001',
        changeOrigin: true,
        secure: false,
      },
      '/files': {
        target: 'http://10.101.102.80:8002',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/files/, '')  
      },
      '/objects': {
        target: 'https://growth.tingqi.xyz',
        changeOrigin: true,
        secure: false,
        //rewrite: (path) => path.replace(/^\/objects/, '')
      },
    }
  },
}) 