const DISCOGS_API_URL = 'api.discogs.com';
const DiscogsResourceTypes = ['release', 'master'];

interface DiscogsInfo {
  id: string;
  type: string;
}

interface DiscogsTrack {
  title: string;
  position: string;
  duration?: string;
}

interface DiscogsVideo {
  uri: string;
  title: string;
}

interface DiscogsArtist {
  name: string;
}

interface DiscogsResource {
  id: number;
  title: string;
  artists?: DiscogsArtist[];
  artists_sort?: string;
  year?: number;
  genres?: string[];
  styles?: string[];
  tracklist?: DiscogsTrack[];
  videos?: DiscogsVideo[];
  uri: string;
  cover_image?: string;
  thumb?: string;
}

export async function fetchDiscogs({ id, type = 'release' }: DiscogsInfo): Promise<DiscogsResource> {
  const url = `https://${DISCOGS_API_URL}/${type}s/${id}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.errors) {
    throw new Error(data.errors);
  }
  return data;
}

export function parseDiscogsUrl(url: string): DiscogsInfo | null {
  try {
    const discogsUrl = new URL(url);
    if (!discogsUrl.hostname.includes('discogs.com')) {
      return null;
    }
    const pathParts = discogsUrl.pathname.slice(1).split('/');
    const type = pathParts.find((part) => DiscogsResourceTypes.includes(part));
    if (type) {
      const typeIndex = pathParts.indexOf(type);
      const id = pathParts[typeIndex + 1]?.split('-')[0];
      if (id) {
        return { id, type };
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

export function resourceTrackToR4Track(track: DiscogsTrack, resource: DiscogsResource) {
  const video = resource.videos?.find((v) => {
    const videoTitle = v.title.toLowerCase().trim();
    const trackTitle = track.title.toLowerCase().trim();
    return videoTitle.includes(trackTitle);
  });

  return {
    title: track.title,
    url: video?.uri || '',
    discogsUrl: resource.uri,
    discogs_url: resource.uri,
    description: track.duration || '',
  };
}
