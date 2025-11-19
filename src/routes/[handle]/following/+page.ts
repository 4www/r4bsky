import type { PageLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';

export const load: PageLoad = ({ params, url }) => {
  const rawHandle = params.handle || '';
  const handleValue = rawHandle.startsWith('@') ? rawHandle.slice(1) : rawHandle;
  const search = url.search || '';
  const target = `${base}/@${handleValue}/favorites${search}`;
  throw redirect(308, target);
};
