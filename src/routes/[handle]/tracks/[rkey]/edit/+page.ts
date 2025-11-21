import type { PageLoad } from './$types';
import { resolveHandle } from '$lib/services/r4-service';

export const ssr = false;
export const prerender = false;

export const load: PageLoad = async ({ params }) => {
	const rawHandle = params.handle?.replace(/^@/, '') ?? '';
	const rkey = params.rkey ?? '';
	let repo = params.repo ?? '';

	if (!repo && rawHandle) {
		try {
			repo = (await resolveHandle(rawHandle)) || '';
		} catch {
			repo = '';
		}
	}

	return {
		repo,
		handle: params.handle,
		rkey
	};
};
