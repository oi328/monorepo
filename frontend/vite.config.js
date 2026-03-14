import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
export default defineConfig({
  base: './',   // بدل '/'
  server: {
    host: '0.0.0.0',
    port: 5173,
    // hmr: {
    //     host: 'crm.test'
    // }
  },
  plugins: [react()],
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router', 'react-router-dom'],
          ui: ['lucide-react', 'react-icons'],
          i18n: ['i18next', 'react-i18next'],
          data: ['axios', '@tanstack/react-query'],
          excel: ['xlsx'],
          pdf: ['jspdf', 'jspdf-autotable'],
          maps: ['leaflet', 'react-leaflet', 'maplibre-gl'],
          charts: ['chart.js', 'react-chartjs-2', 'recharts'],
          animation: ['framer-motion'],
          forms: ['react-hook-form', 'zod'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@features': path.resolve(__dirname, 'src/features'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@router': path.resolve(__dirname, 'src/router'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@providers': path.resolve(__dirname, 'src/providers'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@config': path.resolve(__dirname, 'src/config'),
    },
  },
})
