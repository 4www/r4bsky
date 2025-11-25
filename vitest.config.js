import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

export default defineConfig({
	plugins: [svelte({ hot: false })],
	server: {
		host: '127.0.0.1' // atproto no `localhost`
	},
	resolve: {
		conditions: ['svelte', 'browser'],
		alias: {
			$lib: path.resolve('./src/lib')
		}
	},
	test: {
		environment: 'happy-dom',
		globals: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.js'],
			exclude: ['src/**/*.test.js', 'src/**/*.spec.js'],
			all: true,
			lines: 90,
			functions: 90,
			branches: 85,
			statements: 90
		},
		setupFiles: ['./vitest.setup.js']
	}
})
