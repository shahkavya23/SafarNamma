import re
from typing import Optional, Tuple
from urllib.parse import urlparse

import requests

# Google Maps puts a place's position in the URL in one of these shapes
_COORD_PATTERNS = (
    r'@(-?\d+\.\d+),(-?\d+\.\d+)',
    r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)',
    r'[?&](?:q|query|ll|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)',
)

# Share links like maps.app.goo.gl/abc carry no coordinates until they are followed
_SHORT_HOSTS = {"maps.app.goo.gl", "goo.gl", "g.co"}


def _match_coords(url: str) -> Optional[Tuple[float, float]]:
    for pattern in _COORD_PATTERNS:
        m = re.search(pattern, url)
        if m:
            lat, lng = float(m.group(1)), float(m.group(2))
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
