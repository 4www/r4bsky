// for cloudflare workers deploy
export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		// Try to get the asset from the ASSETS binding
		let response = await env.ASSETS.fetch(request);

		// If not found (404), serve index.html for client-side routing (SPA fallback)
		if (response.status === 404) {
			const indexRequest = new Request(new URL('/index.html', request.url), request);
			response = await env.ASSETS.fetch(indexRequest);
		}

		return response;
	},
};
