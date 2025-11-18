import type { PageLoad } from './$types';
import { getTrackByUri, resolveHandle } from '$lib/services/r4-service';

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

	let track: any = null;
	if (repo && rkey) {
		const uri = `at://${repo}/com.radio4000.track/${rkey}`;
		try {
			track = await getTrackByUri(uri);
		} catch {
			track = null;
		}
	}

	return {
		repo,
		track,
	};
};
