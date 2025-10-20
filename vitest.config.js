import { defineConfig } from 'vitest/config'

export default defineConfig({
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
