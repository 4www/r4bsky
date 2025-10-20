import { defineConfig } from 'vite'

export default defineConfig(({ command }) => {
  const config = {
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
