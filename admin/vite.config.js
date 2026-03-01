import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  server: {
    proxy: {
      '/api': {
        target: 'http://smspaisa-backend-env.eba-p3icmzxs.us-east-1.elasticbeanstalk.com',
        changeOrigin: true,
      }
    }
  }
})
