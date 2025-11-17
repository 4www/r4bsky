import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

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
			base: process.env.NODE_ENV === 'production' ? '/r4bsky' : ''
		},
		prerender: {
			handleMissingId: 'ignore',
			handleHttpError: 'warn',
			entries: ['/', '/timeline', '/search', '/add', '/followers', '/following', '/settings'],
			handleUnseenRoutes: 'ignore'
		}
	}
};

export default config;
