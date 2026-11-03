"""Fill in latitude/longitude for places from their Google Maps link.

Run from backend/:
  python scripts/backfill_coords.py                # places with no location yet (dry run)
  python scripts/backfill_coords.py --all          # re-read every place's link, show what would move
  python scripts/backfill_coords.py --all --apply  # ...and save it
Places whose link can't be read are listed so their location can be added by hand in Edit Place.
"""
import argparse
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import or_  # noqa: E402

from server.database import SessionLocal  # noqa: E402
from server.geo import coords_from_map_link  # noqa: E402
from SQLite import models  # noqa: E402

# Places whose link is a plain search ("query=MTR") or an address with no pin. Used only when the
# link itself gives nothing; better to replace these links with a proper place link in Edit Place.
MANUAL_COORDS = {
    7: (12.9507, 77.5848),    # Lalbagh Botanical Garden
    40: (12.9345, 77.6215),   # Sri Prasanna Ganapati Temple, KHB Colony 5th Block, Koramangala
    41: (12.9427, 77.5687),   # Sri Dodda Ganapathi Temple, Basavanagudi
}


def km_between(a, b) -> float:
    la1, lo1, la2, lo2 = map(math.radians, (*a, *b))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--all", action="store_true", help="re-read every place, not only ones without a location")
    parser.add_argument("--apply", action="store_true", help="save the changes (default is a dry run)")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        query = db.query(models.Destination)
        if not args.all:
            query = query.filter(or_(models.Destination.latitude.is_(None), models.Destination.longitude.is_(None)))

        moved, same, skipped = 0, 0, []
        for dest in query.order_by(models.Destination.id).all():
            coords, source = coords_from_map_link(dest.map_link), "link"
            if not coords and dest.id in MANUAL_COORDS:
                coords, source = MANUAL_COORDS[dest.id], "manual"
            if not coords:
                skipped.append(dest)
                continue

            old = (dest.latitude, dest.longitude)
            if None not in old and km_between(old, coords) < 0.05:
                same += 1
                continue
            shift = "new" if None in old else f"moved {km_between(old, coords):.1f} km"
            print(f"  #{dest.id} {dest.name}: {old[0]}, {old[1]} -> {coords[0]:.6f}, {coords[1]:.6f}  ({shift}, {source})")
            dest.latitude, dest.longitude = coords
            moved += 1

        if args.apply:
            db.commit()
        else:
            db.rollback()

        print(f"\n{moved} place(s) {'updated' if args.apply else 'would change (dry run, use --apply)'}, "
              f"{same} already right, {len(skipped)} without a readable location.")
        for dest in skipped:
            print(f"  needs a location  #{dest.id} {dest.name}  ({dest.map_link or 'no map link'})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
