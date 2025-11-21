export const ssr = false;
export const prerender = false;

export function load({ params }) {
  return {
    handle: params.handle,
    rkey: params.rkey
  };
}
