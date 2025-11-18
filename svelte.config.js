import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.env.NODE_ENV === 'development';
const basePath = process.env.R4_BASE ?? (dev ? '' : '/r4atproto');

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			pages: 'dist',
			assets: 'dist',
			fallback: 'index.html',
			precompress: false,
			strict: true
		}),
		paths: {
			base: basePath
		},
		prerender: {
			handleMissingId: 'ignore',
			handleHttpError: 'warn',
			entries: ['/', '/search', '/add', '/settings'],
			handleUnseenRoutes: 'ignore'
		}
	}
};

export default config;
