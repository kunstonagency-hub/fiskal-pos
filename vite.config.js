import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true // Permite probar el modo offline en localhost
      },
      manifest: {
        name: 'Fiskal Sistema de Gestión',
        short_name: 'Fiskal',
        description: 'Punto de Venta con soporte Offline',
        theme_color: '#ffffff',
        background_color: '#f8f9fa',
        display: 'standalone'
      }
    })
  ],
})