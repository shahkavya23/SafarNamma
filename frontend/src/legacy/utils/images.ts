/* ─── Curated site photography ───
   Every photo ships as WebP at 1600w and 800w (see public/images/).
   Use `photoProps(key)` on an <img> to get src, srcSet, intrinsic size and alt. */

export interface Photo {
  file: string;
  width: number;
  height: number;
  alt: string;
  place: string;
  credit?: { name: string; url: string };
}

export const PHOTOS = {
  nandi: {
    file: 'nandi-hills-hero', width: 1376, height: 768, place: 'Nandi Hills',
    alt: 'Hairpin road winding up Nandi Hills at sunrise above a sea of mist',
  },
  skandagiri: {
    file: 'skandagiri-sunrise', width: 896, height: 1200, place: 'Skandagiri',
    alt: 'Trekkers standing on the Skandagiri summit above the clouds at sunrise',
  },
  coorgFalls: {
    file: 'coorg-waterfall', width: 896, height: 1200, place: 'Coorg',
    alt: 'Waterfall tumbling through rainforest into a green pool in Coorg',
  },
  ghatsRoad: {
    file: 'western-ghats-road', width: 1376, height: 768, place: 'Western Ghats',
    alt: 'Rain-soaked road curving through misty Western Ghats forest',
  },
  friends: {
    file: 'friends-convoy', width: 1376, height: 768, place: 'Western Ghats',
    alt: 'Four friends laughing on a rocky viewpoint above forested hills',
  },
  ghatsSummit: {
    file: 'ghats-summit', width: 1376, height: 768, place: 'Western Ghats',
    alt: 'Two travellers on the roof of a Karnataka-registered 4x4 above the clouds at sunrise',
  },
  hampi: {
    file: 'hampi-chariot', width: 1600, height: 1066, place: 'Hampi',
    alt: 'The carved stone mandapas of Vittala Temple, Hampi, under a clear blue sky',
    credit: { name: 'Sandip Kalal', url: 'https://unsplash.com/photos/TN6WLhneISI' },
  },
  omBeach: {
    file: 'om-beach', width: 1600, height: 2134, place: 'Gokarna',
    alt: 'Palm fronds framing a quiet cove on the Om Beach trail, Gokarna',
    credit: { name: 'Shashank Hegade', url: 'https://unsplash.com/photos/jUUox80nXtQ' },
  },
  mullayanagiri: {
    file: 'mullayanagiri', width: 1600, height: 2400, place: 'Mullayanagiri',
    alt: 'Cars lined along the ridge road to Mullayanagiri peak, Chikmagalur',
    credit: { name: 'Umesh Soni', url: 'https://unsplash.com/photos/the-sun-shines-brightly-over-a-grassy-hill-CgQBRoZm34Y' },
  },
  chikmagalurHills: {
    file: 'chikmagalur-hills', width: 1600, height: 1067, place: 'Chikmagalur',
    alt: 'A traveller raising both arms towards the green, forested hills of Chikmagalur',
    credit: { name: 'Mayank Agarwal', url: 'https://unsplash.com/photos/man-in-blue-shirt-raising-his-hands-M-bDdjOE-JM' },
  },
  commercialStreet: {
    file: 'commercial-street', width: 1600, height: 1067, place: 'Commercial Street, Bengaluru',
    alt: 'Commercial Street, Bengaluru, strung with festive lights over its shopfronts at night',
    credit: { name: 'Saad Faruque', url: 'https://commons.wikimedia.org/wiki/File:Commercial_Street,_Bangalore_(7870975840).jpg' },
  },
  ubCityNight: {
    file: 'ub-city-night', width: 1600, height: 1198, place: 'UB City, Bengaluru',
    alt: 'UB City and Kingfisher Towers lit up at night, with Vidhana Soudha glowing in the distance',
    credit: { name: 'Kshitiz Bathwal', url: 'https://commons.wikimedia.org/wiki/File:UB_City_at_night_.jpg' },
  },
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof PHOTOS;

export const photoSrc = (key: PhotoKey, size: 800 | 1600 = 1600) => `/images/${PHOTOS[key].file}-${size}.webp`;

export const photoProps = (key: PhotoKey, sizes = '100vw') => {
  const p: Photo = PHOTOS[key];
  return {
    src: photoSrc(key),
    srcSet: `/images/${p.file}-800.webp 800w, /images/${p.file}-1600.webp ${p.width}w`,
    sizes,
    width: p.width,
    height: p.height,
    alt: p.alt,
  };
};

/** Stable fallback photo for a record that has no image of its own. */
const FALLBACK_ROTATION: PhotoKey[] = ['nandi', 'coorgFalls', 'ghatsRoad', 'hampi', 'omBeach', 'skandagiri', 'mullayanagiri'];
export const fallbackPhoto = (seed: number | string = 0) => {
  const n = typeof seed === 'number' ? seed : [...String(seed)].reduce((a, c) => a + c.charCodeAt(0), 0);
  return photoSrc(FALLBACK_ROTATION[Math.abs(n) % FALLBACK_ROTATION.length], 800);
};

export const PHOTO_CREDITS = Object.values(PHOTOS as Record<string, Photo>)
  .filter((p) => p.credit)
  .map((p) => ({ place: p.place, ...p.credit! }));

/** Ask the image CDN for a right-sized, modern-format version of a user photo (display only; stored URLs are untouched). */
export const optimizeImageUrl = (url: string | undefined, width = 900): string | undefined => {
  if (!url) return url;
  try {
    if (url.includes('res.cloudinary.com') && url.includes('/upload/') && !/\/upload\/[^/]*(w_|q_auto|f_auto)/.test(url)) {
      return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${width}/`);
    }
    if (url.includes('images.unsplash.com')) {
      const u = new URL(url);
      u.searchParams.set('w', String(width));
      u.searchParams.set('auto', 'format');
      u.searchParams.set('fit', 'crop');
      if (!u.searchParams.has('q')) u.searchParams.set('q', '75');
      return u.toString();
    }
  } catch {
    /* fall through to the original URL */
  }
  return url;
};
