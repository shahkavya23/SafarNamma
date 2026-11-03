import re
from typing import Optional, Tuple
from urllib.parse import unquote, urlparse

import requests

# Google Maps puts a place's position in the URL in one of these shapes, most reliable first.
# (pattern, True when the longitude comes first). "@lat,lng" is only the map viewport, which on a
# directions link is wherever the person sharing it was standing, so it is the last resort.
_COORD_PATTERNS = (
    (r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)', False),   # the place pin
    (r'!1d(-?\d+\.\d+)!2d(-?\d+\.\d+)', True),    # a directions destination
    (r'[?&](?:q|query|ll|center|daddr)=(-?\d+\.\d+),\s*(-?\d+\.\d+)', False),
    (r'@(-?\d+\.\d+),(-?\d+\.\d+)', False),
)

# Share links like maps.app.goo.gl/abc carry no coordinates until they are followed
_SHORT_HOSTS = {"maps.app.goo.gl", "goo.gl", "g.co"}


def _match_coords(url: str) -> Optional[Tuple[float, float]]:
    url = unquote(url)
    for pattern, lng_first in _COORD_PATTERNS:
        # The last match wins: a directions link lists the start before the destination
        matches = re.findall(pattern, url)
        if matches:
            a, b = (float(v) for v in matches[-1])
            lat, lng = (b, a) if lng_first else (a, b)
            if -90 <= lat <= 90 and -180 <= lng <= 180 and (lat, lng) != (0.0, 0.0):
                return lat, lng
    return None


def coords_from_map_link(link: Optional[str]) -> Optional[Tuple[float, float]]:
    """Latitude/longitude from a Google Maps link, expanding short share links when needed.
    Never raises: a link we can't read just gives None."""
    if not link:
        return None
    link = link.strip()

    coords = _match_coords(link)
    if coords:
        return coords

    try:
        host = (urlparse(link).hostname or "").lower()
    except ValueError:
        return None
    if host not in _SHORT_HOSTS:
        return None

    try:
        resp = requests.get(
            link,
            allow_redirects=True,
            timeout=6,
            headers={"User-Agent": "Mozilla/5.0 (SafarNamma place locator)"},
        )
    except requests.RequestException:
        return None

    # The final URL usually has the position; older redirects leave it in the page instead
    return _match_coords(resp.url) or _match_coords(resp.text[:200_000])
