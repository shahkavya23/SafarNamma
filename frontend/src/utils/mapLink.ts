// Google Maps puts a place's position in the URL in one of these shapes. Share links
// (maps.app.goo.gl/…) carry none of them. Keep in step with backend/server/geo.py.
const COORD_PATTERNS = [
  /@(-?\d+\.\d+),(-?\d+\.\d+)/,
  /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
  /[?&](?:q|query|ll|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
];

const inRange = (lat: number, lng: number) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0);

export const coordsFromMapLink = (link?: string | null): [number, number] | null => {
  if (!link) return null;
  for (const pattern of COORD_PATTERNS) {
    const m = link.match(pattern);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (inRange(lat, lng)) return [lat, lng];
    }
  }
  return null;
};

/** "12.9716, 77.5946", as copied from a Google Maps pin, split into its two numbers. */
export const parseCoordPair = (text: string): [string, string] | null => {
  const m = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
  return m ? [m[1], m[2]] : null;
};

/** What's wrong with the latitude/longitude boxes, or null if they're fine (both empty is fine). */
export const coordsError = (latitude: string, longitude: string): string | null => {
  const lat = latitude.trim();
  const lng = longitude.trim();
  if (!lat && !lng) return null;
  if (!lat || !lng) return 'Enter both latitude and longitude, or leave both empty.';
  const latN = Number(lat);
  const lngN = Number(lng);
  if (isNaN(latN) || Math.abs(latN) > 90) return 'Latitude must be a number between -90 and 90.';
  if (isNaN(lngN) || Math.abs(lngN) > 180) return 'Longitude must be a number between -180 and 180.';
  if (latN === 0 && lngN === 0) return 'Latitude and longitude can’t both be 0.';
  return null;
};

export const coordNumber = (value: string): number | null => (value.trim() ? Number(value) : null);
