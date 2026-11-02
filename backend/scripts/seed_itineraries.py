"""Seed ready-made itineraries that start from Electronic City.

Run from backend/:
  python scripts/seed_itineraries.py                 # create the itineraries (skips ones that already exist)
  python scripts/seed_itineraries.py --flag-gems     # also mark the hidden-gem places as is_hidden_gem
  python scripts/seed_itineraries.py --markdown ../docs/itineraries-from-electronic-city.md   # write a preview, no DB needed

Stops reference places by id, so the ids below must exist in the target database. Missing ids are
skipped with a warning. Stops are (destination_id, place name, transport to reach it, note).
Every itinerary deliberately mixes food, sightseeing, nature, activities and shopping.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

ADMIN_EMAIL = "shahkavya2307@gmail.com"

# Places teammates added that are lesser known; --flag-gems marks these.
HIDDEN_GEM_IDS = {54, 52, 59, 24, 62, 63, 64, 22, 77, 11, 61}

# Category of each place used below (from the places table), so the preview shows the mix.
CATEGORY = {
    3: "Cafes & Restaurants", 6: "Street Shopping", 7: "Nature", 8: "Games & Adventure",
    9: "Cafes & Restaurants", 10: "Games & Adventure", 11: "Nature", 12: "Cafes & Restaurants",
    13: "Cafes & Restaurants", 15: "Monuments", 17: "Games & Adventure", 20: "Entertainment",
    22: "Entertainment", 24: "Nature", 27: "Cafes & Restaurants", 31: "Mall", 36: "Mall",
    37: "Religious Places", 39: "Religious Places", 40: "Religious Places", 41: "Religious Places",
    45: "Mall", 46: "Mall", 47: "Street Shopping", 49: "Monuments", 50: "Nature", 51: "Monuments",
    52: "Nature", 54: "Monuments", 55: "Religious Places", 56: "Nature", 59: "Museums",
    60: "Museums", 61: "Food Places", 62: "Food Places", 63: "Games & Adventure",
    64: "Games & Adventure", 65: "Food Places", 67: "Cafes & Restaurants", 70: "Cafes & Restaurants",
    74: "Cafes & Restaurants", 76: "Nature", 77: "Religious Places",
}

ITINERARIES = [
    {
        "title": "Heritage, Temples & Tiffin",
        "description": (
            "A Basavanagudi and Lalbagh day that mixes a classic breakfast, a giant Ganesha, billion-year-old rocks, "
            "the famous MTR lunch, Tipu's palace and an evening garden walk."
        ),
        "duration": "Full Day (8-9 Hours)",
        "budget": 1200,
        "stops": [
            (70, "Taaza Thindi", "Cab / auto from Electronic City, leave by 7 AM", "Self-service idli, vada and filter coffee. Breakfast hours are 7 AM-12 PM; expect a queue on weekends."),
            (41, "Sri Dodda Ganapathi Temple", "Cab", "18 ft monolithic Ganesha, free darshan. Open 6:30 AM-12:30 PM and 5:30-8:30 PM."),
            (52, "Bugle Rock Park", "Walk (next to the temple)", "Hidden gem. Ancient granite rocks and a Kempegowda watchtower. Wear comfortable shoes; allow 45 min."),
            (74, "MTR", "Auto", "Rava idli and the unlimited lunch thali, around Rs. 500. Closed on Mondays, lunch is 12:30-2:30 PM."),
            (49, "Tipu Sultan's Summer Palace", "Auto", "Wooden palace and small museum, about Rs. 20 entry. Open 8:30 AM-5:30 PM."),
            (7, "Lalbagh Botanical Garden", "Auto", "Finish with a slow walk through 240 acres of garden. Small entry fee; best 5:30-7 PM."),
        ],
    },
    {
        "title": "South-Side Sampler",
        "description": (
            "JP Nagar, Jayanagar and HSR in one go: a hilltop temple, an interactive music museum, a lake, good coffee "
            "and a street-food finish."
        ),
        "duration": "Full Day (8-9 Hours)",
        "budget": 1100,
        "stops": [
            (37, "ISKCON Vaikuntha Hill", "Cab, or metro to Konanakunte Cross + auto", "Peaceful hill temple with city views and satvik prasadam. Go early; stairs can tire elders."),
            (59, "Indian Music Experience Museum", "Cab", "Hidden gem. Interactive instruments and listening stations, about Rs. 250. Open 10 AM-6 PM; plan 1-2 hours."),
            (24, "Yediyur Lake", "Cab / auto", "Hidden gem. 1 km walking track and pedal boats; lovely near sunset and free."),
            (9, "Blue Tokai Coffee Roasters", "Cab to Koramangala", "Specialty coffee and light bites, about Rs. 600. Good for a break before the evening."),
            (62, "27th Main Road Food Street", "Cab to HSR Layout", "Hidden gem. Comes alive after 6 PM. Share small plates of dosa, chaat, momos and rolls; crowded on weekends."),
        ],
    },
    {
        "title": "Central Bengaluru Day",
        "description": (
            "A city-centre day by metro: a science museum, the Vidhana Soudha, lunch and shopping at a quiet mall, "
            "street shopping on Brigade Road and a late evening on Church Street."
        ),
        "duration": "Full Day (9-10 Hours)",
        "budget": 1800,
        "stops": [
            (60, "Visvesvaraya Industrial & Technological Museum", "Yellow Line to Silk Board, Purple Line to Cubbon Park", "Hands-on science exhibits, about Rs. 100. Opens 9:30 AM."),
            (51, "Vidhana Soudha", "Walk / auto", "Look at the exterior for free; inside tours run Sundays and 2nd/4th Saturdays only (about Rs. 50)."),
            (36, "1 MG - Lido Mall", "Auto / metro to Trinity", "A calm, premium mall with a good food hall for lunch. Open 10 AM-9:30 PM."),
            (47, "Brigade Road", "Auto or MG Road metro + walk", "Street stalls, cafes and fashion. Bargain politely; shops are open about 11 AM-9 PM."),
            (6, "Church Street", "Walk", "Fairy lights, street music, momos and boba after dark; Amoeba bowling nearby. Open till about 1 AM."),
        ],
    },
    {
        "title": "Koramangala Day Out",
        "description": (
            "A morning darshan, a Kerala-bungalow brunch, an art activity, neon games and a street-food evening, all "
            "within walking or auto distance in Koramangala."
        ),
        "duration": "Full Day (8 Hours)",
        "budget": 2800,
        "stops": [
            (40, "Sri Prasanna Ganapati Temple", "Cab via Hosur Road, arrive by 9 AM", "Quiet neighbourhood temple. Open 6:30-11:50 AM and 5:30-8:30 PM; free."),
            (13, "Dyu Art Cafe", "Auto", "Brunch in a restored Kerala-style bungalow, about Rs. 500. Long waits on weekends, so go before 11 AM."),
            (20, "Splashit", "Auto", "Neon splatter room, pour art and slime. Book a slot; open 11 AM-8 PM, about Rs. 1,000."),
            (64, "Glow Arena", "Auto", "Hidden gem. Neon indoor games opposite Nexus Mall, about Rs. 600. Open 11 AM-10:30 PM."),
            (65, "Koramangala Food Street", "Auto", "Best 6-10 PM: momos, rolls, kebabs and desserts. Crowded on weekends."),
        ],
    },
    {
        "title": "Bannerghatta Side Adventure",
        "description": (
            "Start with the famous 5 AM Rameshwaram breakfast near Bommasandra, then a hidden fort, a safari, "
            "adventure activities with lunch, and go-karting in the evening."
        ),
        "duration": "Full Day (10-11 Hours)",
        "budget": 3500,
        "stops": [
            (3, "The Rameshwaram Cafe", "Auto / cab from Electronic City", "Ghee podi idli and crispy dosa. Open from 5 AM; go early to skip the queue."),
            (54, "Begur Fort", "Cab", "Hidden gem. Thousand-year-old fort ruins, temple and inscriptions. Free; allow 45 min."),
            (76, "Bannerghatta National Park", "Cab", "Safari, zoo and butterfly park, about Rs. 80 plus safari. Closed on Tuesdays; book tickets online. Open 9:30 AM-5 PM."),
            (8, "Area 83 Adventure Resort", "Cab", "Kayaking, archery tag and paintball with a buffet lunch, about Rs. 2,000. Weekdays are less crowded."),
            (10, "Raceway Gokarting", "Own vehicle / cab", "Outdoor track on Kanakapura Road, about Rs. 1,000. Open till 5 AM, so an evening slot works well."),
        ],
    },
    {
        "title": "Sarjapur Side Day (closest to E-City)",
        "description": (
            "A short, easy outing for a free afternoon: brunch, go-karting and paintball, a Mediterranean courtyard cafe "
            "and a mall stop on the way back."
        ),
        "duration": "Half Day (6 Hours)",
        "budget": 1800,
        "stops": [
            (12, "Kapoor's Cafe", "Auto from Electronic City", "Pure veg North Indian and Punjabi brunch, about Rs. 500. Open 9:30 AM-11 PM."),
            (63, "Red Riders Gokarting", "Cab to Kodathi", "Hidden gem. 750 m outdoor track plus paintball and archery, about Rs. 450 and up. Opens 10:30 AM."),
            (27, "Helen & Lorena's Place", "Cab at Kodathi Gate", "Mediterranean-style courtyard with Spanish tapas and Italian dishes, about Rs. 750. Photogenic at sunset."),
            (46, "M5 E-City Mall", "Cab back to Electronic City", "Shopping, INOX and a food court close to home. Open 11 AM-10 PM."),
        ],
    },
    {
        "title": "Quirky East Bengaluru",
        "description": (
            "Offbeat spots for people who skip the usual list: working potters, a Chola-era temple, a lake with islands, "
            "a bungalow cafe and an escape room."
        ),
        "duration": "Full Day (8-9 Hours)",
        "budget": 2200,
        "stops": [
            (22, "Pottery Town", "Cab, or metro to Cantonment + auto", "Hidden gem. Watch artisans at the wheel and buy directly. Best in daylight, 10 AM-5 PM."),
            (55, "Halasuru Someshwara Temple", "Cab", "One of Bengaluru's oldest temples with carved pillars and a grand gopuram."),
            (56, "Ulsoor Lake", "Walk", "Boating and sunset views; free to walk around."),
            (67, "Bohemians", "Cab", "Indiranagar bungalow cafe-bar, about Rs. 1,000. Open 11:30 AM-12:30 AM; karaoke on Wednesdays."),
            (17, "Mystery Room", "Auto", "60-minute escape rooms, about Rs. 500. Best with 4-6 friends; book online."),
        ],
    },
    {
        "title": "North Bengaluru Escape",
        "description": (
            "A long day with your own cab: sunrise at Nandi Hills, the 112-ft Adiyogi statue, a forest trail and a "
            "chocolate factory tour on the way back."
        ),
        "duration": "Full Day (12+ Hours)",
        "budget": 2500,
        "stops": [
            (50, "Nandi Hills", "Own cab, leave by 3:30 AM", "Tipu's Drop, Yoga Nandeeshwara Temple and sunrise views. Open 24/7; weekdays are calmer."),
            (77, "Adiyogi Shiva Statue Chikkaballapur", "Cab", "Free entry, modest dress. Parking Rs. 50 for cars. Open 6 AM-8 PM."),
            (11, "Avalahalli Forest", "Cab", "Hidden gem. Raw forest trail with peacocks. Open 6-9 AM and 3-6 PM; carry water."),
            (61, "SMOOR Experience Centre", "Cab", "Hidden gem. Chocolate factory tour, about Rs. 1,499. Tours run Friday-Sunday only; book ahead. Closes at 6 PM."),
        ],
    },
    {
        "title": "Royal Rajajinagar & Mall Day",
        "description": (
            "A temple on a hill, a lakeside mall lunch, the Tudor-style Bangalore Palace and an evening at one of the "
            "city's biggest malls."
        ),
        "duration": "Full Day (8-9 Hours)",
        "budget": 1800,
        "stops": [
            (39, "ISKCON Temple Bengaluru", "Metro Yellow + Green Line to Mahalakshmi", "Go 7-9 AM for a calm darshan. Dress modestly; no photography inside."),
            (45, "Orion Mall", "Auto", "Lunch at the food court or lakeside cafes. Open 10 AM-11 PM; cinema and Timezone are paid."),
            (15, "Bangalore Palace", "Cab", "Audio guide is good; entry is about Rs. 240 and camera passes cost extra. Open 10 AM-5:30 PM."),
            (31, "Phoenix Mall of Asia", "Cab", "Foodthopia food court, digital waterfalls and shopping. Open 10 AM-10 PM."),
        ],
    },
]


# Approximate road distance (km) and daytime cab/auto travel time (minutes) for each leg, in stop order.
# The first leg starts at Electronic City; "return" is the trip home from the last stop. Rough estimates
# for normal city traffic (peak hours can add 20-40%), not live routing.
LEGS = {
    "Heritage, Temples & Tiffin": {"legs": [(17, 50), (4, 15), (0.3, 5), (4, 20), (4, 20), (3, 15)], "return": (20, 60)},
    "South-Side Sampler": {"legs": [(22, 55), (6, 20), (6, 25), (8, 35), (4, 15)], "return": (14, 40)},
    "Central Bengaluru Day": {"legs": [(20, 65), (0.7, 10), (4.5, 20), (3, 15), (0.7, 10)], "return": (20, 55)},
    "Koramangala Day Out": {"legs": [(15, 45), (2, 10), (1.5, 10), (2, 10), (2, 10)], "return": (15, 45)},
    "Bannerghatta Side Adventure": {"legs": [(7, 20), (14, 35), (14, 35), (5, 15), (22, 50)], "return": (35, 70)},
    "Sarjapur Side Day (closest to E-City)": {"legs": [(3, 10), (20, 45), (1, 5), (25, 55)], "return": (0, 0)},
    "Quirky East Bengaluru": {"legs": [(28, 75), (8, 30), (1, 5), (4, 20), (1.5, 8)], "return": (22, 65)},
    "North Bengaluru Escape": {"legs": [(95, 150), (8, 20), (55, 80), (3, 10)], "return": (45, 105)},
    "Royal Rajajinagar & Mall Day": {"legs": [(30, 80), (1.5, 10), (7, 30), (11, 35)], "return": (40, 90)},
}


def leg_text(km: float, minutes: int) -> str:
    return f"~{km:g} km, ~{minutes} min"


def travel_totals(it: dict) -> tuple:
    """Total road km and minutes for the day, including the trip home."""
    info = LEGS[it["title"]]
    legs = info["legs"] + [info["return"]]
    return sum(k for k, _ in legs), sum(m for _, m in legs)


def duration_text(minutes: int) -> str:
    h, m = divmod(minutes, 60)
    return f"{h} h {m:02d} min" if m else f"{h} h"


def write_markdown(path: str) -> None:
    lines = [
        "# Itineraries from Electronic City",
        "",
        "Generated by `backend/scripts/seed_itineraries.py`. Edit the data there, then regenerate with `--markdown`. "
        "Places marked **(hidden gem)** are lesser-known spots added by the team. Budgets and transport tips are estimates.",
        "",
    ]
    for n, it in enumerate(ITINERARIES, 1):
        categories = [CATEGORY.get(s[0], "Other") for s in it["stops"]]
        total_km, total_min = travel_totals(it)
        info = LEGS[it["title"]]
        lines += [f"## {n}. {it['title']}", "", it["description"], "",
                  f"- **Duration:** {it['duration']}",
                  f"- **On the road:** about {total_km:g} km and {duration_text(total_min)} in total, including the trip home",
                  f"- **Budget per person:** about Rs. {it['budget']:,}",
                  f"- **Mix:** {len(set(categories))} kinds of places ({', '.join(sorted(set(categories)))})", ""]
        for i, ((dest_id, name, transport, note), (km, mins)) in enumerate(zip(it["stops"], info["legs"]), 1):
            gem = " (hidden gem)" if dest_id in HIDDEN_GEM_IDS else ""
            origin = "from Electronic City" if i == 1 else "from the previous stop"
            lines += [f"{i}. **{name}**{gem}: {CATEGORY.get(dest_id, 'Other')} (place #{dest_id})",
                      f"   - Getting there: {transport} ({leg_text(km, mins)} {origin})", f"   - {note}"]
        if info["return"][1]:
            lines.append(f"- Back to Electronic City: {leg_text(*info['return'])}")
        lines.append("")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Wrote {path}")


def seed(flag_gems: bool, email: str) -> None:
    from server.database import SessionLocal
    from SQLite import models

    db = SessionLocal()
    try:
        created, skipped, missing = 0, 0, []
        for it in ITINERARIES:
            if db.query(models.Itinerary).filter(models.Itinerary.title == it["title"]).first():
                print(f"  exists  {it['title']}")
                skipped += 1
                continue

            stops = []
            for (dest_id, name, transport, note), (km, mins) in zip(it["stops"], LEGS[it["title"]]["legs"]):
                dest = db.query(models.Destination).filter(models.Destination.id == dest_id).first()
                if not dest:
                    missing.append((it["title"], dest_id, name))
                    continue
                stops.append((dest, f"{transport} ({leg_text(km, mins)})", note))
            if not stops:
                continue

            total_km, total_min = travel_totals(it)
            itinerary = models.Itinerary(
                title=it["title"],
                description=f"{it['description']} About {total_km:g} km and {duration_text(total_min)} on the road, round trip from Electronic City.",
                image_url=stops[0][0].image_url,
                estimated_duration=it["duration"],
                estimated_budget=it["budget"],
                created_by_email=email,
            )
            for order, (dest, transport, note) in enumerate(stops, 1):
                itinerary.stops.append(models.ItineraryStop(
                    destination_id=dest.id, order_index=order, transport_mode=transport, note=note,
                ))
            db.add(itinerary)
            created += 1
            print(f"  created {it['title']} ({len(stops)} stops)")

        if flag_gems:
            flagged = (
                db.query(models.Destination)
                .filter(models.Destination.id.in_(HIDDEN_GEM_IDS))
                .update({models.Destination.is_hidden_gem: True}, synchronize_session=False)
            )
            print(f"  flagged {flagged} place(s) as hidden gems")

        db.commit()
        print(f"\n{created} created, {skipped} already existed.")
        for title, dest_id, name in missing:
            print(f"  missing place #{dest_id} {name} (in '{title}'), stop skipped")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--flag-gems", action="store_true", help="mark the hidden-gem places as is_hidden_gem")
    parser.add_argument("--email", default=ADMIN_EMAIL, help="admin email recorded as creator")
    parser.add_argument("--markdown", metavar="PATH", help="write a markdown preview and exit (no database)")
    args = parser.parse_args()

    if args.markdown:
        write_markdown(args.markdown)
        return
    seed(args.flag_gems, args.email)


if __name__ == "__main__":
    main()
