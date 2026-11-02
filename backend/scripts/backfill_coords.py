"""Fill in latitude/longitude for places that only have a Google Maps link.

Run from backend/:  python scripts/backfill_coords.py
Places whose link can't be read are listed so their location can be added by hand in Edit Place.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import or_  # noqa: E402

from server.database import SessionLocal  # noqa: E402
from server.geo import coords_from_map_link  # noqa: E402
from SQLite import models  # noqa: E402


def main() -> None:
    db = SessionLocal()
    try:
        missing = (
            db.query(models.Destination)
            .filter(or_(models.Destination.latitude.is_(None), models.Destination.longitude.is_(None)))
            .order_by(models.Destination.id)
            .all()
        )
        fixed, skipped = 0, []
        for dest in missing:
            coords = coords_from_map_link(dest.map_link)
            if coords:
                dest.latitude, dest.longitude = coords
                fixed += 1
                print(f"  fixed  #{dest.id} {dest.name}: {coords[0]:.6f}, {coords[1]:.6f}")
            else:
                skipped.append(dest)
        db.commit()

        print(f"\n{fixed} place(s) updated, {len(skipped)} still without a location.")
        for dest in skipped:
            print(f"  needs a location  #{dest.id} {dest.name}  ({dest.map_link or 'no map link'})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
