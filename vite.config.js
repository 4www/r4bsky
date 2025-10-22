import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig(({ command }) => {
  const config = {
    plugins: [svelte()],
    server: {
      host: true,
      allowedHosts: ['c3.risk-tritone.ts.net']
    }
  }

  if (command === 'build') {
    config.base = '/r4bsky/'
  }

  return config
})
