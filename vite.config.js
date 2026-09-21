import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const path = (env.VITE_BASE_PATH || '/').trim().replace(/^\/+|\/+$/g, '')
  return {
    base: path ? `/${path}/` : '/',
    plugins: [react()],
  }
})
