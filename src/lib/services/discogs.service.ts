/**
 * Discogs API Service
 * Consolidated service for interacting with Discogs API
 */

const DISCOGS_URL = 'discogs.com';
const DISCOGS_API_URL = 'api.discogs.com';

export const DiscogsResourceTypes = ['release', 'master'] as const;
export const DiscogsSearchResourceTypes = [...DiscogsResourceTypes, 'artist', 'label', 'all'] as const;

export type DiscogsResourceType = typeof DiscogsResourceTypes[number];
export type DiscogsSearchResourceType = typeof DiscogsSearchResourceTypes[number];

// Core interfaces
export interface DiscogsInfo {
  id: string;
  type: DiscogsResourceType;
}

export interface DiscogsTrack {
  title: string;
  position: string;
  duration?: string;
}

export interface DiscogsVideo {
  uri: string;
  title: string;
}

export interface DiscogsArtist {
  name: string;
}

export interface DiscogsLabel {
  name: string;
}

export interface DiscogsResource {
  id: number;
  title: string;
  artists?: DiscogsArtist[];
  artists_sort?: string;
  year?: number;
  genres?: string[];
  styles?: string[];
  labels?: DiscogsLabel[];
  tracklist?: DiscogsTrack[];
  videos?: DiscogsVideo[];
  uri: string;
  cover_image?: string;
  thumb?: string;
  errors?: string;
}

export interface R4Track {
  title: string;
  url: string;
  discogsUrl: string;
  description: string;
}

/**
 * Fetch a Discogs resource by ID and type
 */
export async function fetchDiscogs({ id, type = 'release' }: DiscogsInfo): Promise<DiscogsResource> {
  const url = `https://${DISCOGS_API_URL}/${type}s/${id}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.errors) {
    throw new Error(data.errors);
  }

  return data;
}

/**
 * Parse a Discogs URL to extract resource info
 */
export function parseDiscogsUrl(url: string): DiscogsInfo | null {
  try {
    const discogsUrl = new URL(url);

    if (!discogsUrl.hostname.endsWith(DISCOGS_URL)) {
      return null;
    }

    const pathParts = discogsUrl.pathname.slice(1).split('/');
    const type = pathParts.find((part) =>
      DiscogsResourceTypes.includes(part as DiscogsResourceType)
    ) as DiscogsResourceType | undefined;

    if (type) {
      const typeIndex = pathParts.indexOf(type);
      const id = pathParts[typeIndex + 1]?.split('-')[0];

      if (id) {
        return { id, type };
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Extract tag suggestions from a Discogs resource
 * Returns array of suggested hashtags based on genres, styles, year, and labels
 */
export function extractSuggestions(resource: DiscogsResource): string[] {
  const { year = 0, genres = [], styles = [], labels = [] } = resource;
  const labelNames = labels?.map(({ name }) => name) || [];

  return [...genres, ...styles, year, ...labelNames]
    .filter(Boolean)
    .map((s) => s.toString().replace(/\s+/g, '-').toLowerCase());
}

/**
 * Convert a Discogs track to an R4 track format
 * Attempts to find matching video for the track
 */
export function resourceTrackToR4Track(track: DiscogsTrack, resource: DiscogsResource): R4Track {
  const video = resource.videos?.find((v) => {
    const videoTitle = v.title.toLowerCase().trim();
    const trackTitle = track.title.toLowerCase().trim();
    return videoTitle.includes(trackTitle);
  });

  return {
    title: track.title,
    url: video?.uri || '',
    discogsUrl: resource.uri,
    description: track.duration || '',
  };
}

/**
 * Build API URL for a Discogs resource
 */
export function buildApiUrl({ type, id }: DiscogsInfo): string {
  return new URL(`${type}s/${id}`, `https://${DISCOGS_API_URL}`).href;
}
