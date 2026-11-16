/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // server/ has its own tests (npm test inside server/), they need PostgreSQL
    exclude: [...configDefaults.exclude, 'server/**'],
  },
})
