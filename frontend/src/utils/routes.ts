// Pages that open with a full-bleed dark photo hero running underneath the floating navbar.
// The navbar uses light text over these until the page scrolls.
export const hasPhotoHero = (path: string) =>
  path === '/explore' ||
  path === '/groups' ||
  path === '/submit' ||
  path === '/profile' ||
  path.startsWith('/places/') ||
  path.startsWith('/itineraries/') ||
  path.startsWith('/groups/');

// Pages that manage their own top spacing (photo heroes, the light home hero, split-screen auth).
// Every other page gets padding so its content starts below the navbar.
export const isFullBleed = (path: string) =>
  hasPhotoHero(path) || path === '/' || path === '/itineraries' || path === '/login' || path === '/register';
