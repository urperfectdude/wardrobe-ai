import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@phosphor-icons/react', 'framer-motion', 'lucide-react'],
          supabase: ['@supabase/supabase-js'],
          ai: ['openai']
        }
      }
    }
  }
})
