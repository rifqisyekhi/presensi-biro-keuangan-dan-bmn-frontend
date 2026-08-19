import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Frontend memanggil backend dengan path relatif (/api, /uploads).
// Di produksi Nginx yang meneruskannya ke backend; saat
// pengembangan, proxy di bawah ini yang melakukannya. Jadi tidak
// ada alamat backend yang perlu diatur di mana pun.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
})
