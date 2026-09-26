/* ─── Trip story captions ───
   A short headline goes on the image; a longer caption (headline + closer + emojis + hashtags)
   is for the Instagram post. 200+ headlines × closers × emoji sets × hashtag sets gives thousands
   of combinations. Tags keep lines honest: a night line never lands on a sunrise trip. */

export type CaptionMood = 'fun' | 'aesthetic' | 'nostalgic' | 'desi' | 'friendship' | 'adventure' | 'foodie' | 'calm' | 'savage';

export const CAPTION_MOODS: { key: CaptionMood; label: string }[] = [
  { key: 'fun', label: 'Fun' },
  { key: 'aesthetic', label: 'Aesthetic' },
  { key: 'desi', label: 'Desi' },
  { key: 'friendship', label: 'Friendship' },
  { key: 'nostalgic', label: 'Nostalgic' },
  { key: 'adventure', label: 'Adventure' },
  { key: 'foodie', label: 'Foodie' },
  { key: 'calm', label: 'Calm' },
  { key: 'savage', label: 'Savage' },
];

type Tag = 'solo' | 'duo' | 'squad' | 'single' | 'multi' | 'sunrise' | 'day' | 'golden' | 'night' | 'weekend' | 'weekday';
type Line = { t: string; tags: Tag[] };
const L = (t: string, ...tags: Tag[]): Line => ({ t, tags });

/* Placeholders: {place} first/only place · {stops} "A → B → C" · {count} number of places
   {crew} people on the trip · {day} weekday name · {date} "27 Sep" */
const HEADLINES: Record<CaptionMood, Line[]> = {
  fun: [
    L('{place} ✔️ Assignments ❌'),
    L('Main character energy at {place}'),
    L('POV: you finally left the hostel'),
    L('Plot twist: we actually went'),
    L('Came for {place}. Stayed for the chaos.'),
    L('{place}, but make it iconic'),
    L('Low battery, high vibes'),
    L('Touching grass at {place} 🌱'),
    L("We said 'just an hour'. We lied."),
    L('Status: out of hostel, into {place}'),
    L('Weekend unlocked: {place}', 'weekend'),
    L('Bunked {day} for this. Worth it.', 'weekday'),
    L('{count} places. 1 day. 0 regrets.', 'multi'),
    L('Speedrun: {stops}', 'multi'),
    L('Side quest completed: {place}'),
    L('Achievement unlocked: {place} 🏆'),
    L('Camera roll: 200 new photos, 3 usable'),
    L('Today’s agenda: {place}. Tomorrow’s: sleep.'),
    L('Found: {place}. Lost: my sleep schedule.'),
    L('Mom, I promise I studied (at {place})'),
    L('Serotonin sponsored by {place}'),
    L('{crew} people, 1 braincell, {place}', 'squad'),
    L('Flew solo to {place}. 10/10.', 'solo'),
    L('Duo mode: {place}', 'duo'),
    L('Sunrise? At {place}? Who are we?', 'sunrise'),
    L('Night out, {place} edition', 'night'),
    L('Plans made at midnight hit different'),
  ],
  aesthetic: [
    L('Somewhere in {place}'),
    L('Soft light, slow day, {place}'),
    L('{place}, in frames'),
    L('A little bit of {place}'),
    L('Saved: {place}'),
    L('Postcards from {place}'),
    L('Here, now, {place}'),
    L('Chasing light at {place}'),
    L('Golden hour at {place}', 'golden'),
    L('First light, {place}', 'sunrise'),
    L('Mornings like this', 'sunrise'),
    L('City lights, {place}', 'night'),
    L('After dark in {place}', 'night'),
    L('{stops}', 'multi'),
    L('{count} stops, one story', 'multi'),
    L('Frames from {day}'),
    L('Moments, not minutes'),
    L('Quiet corners of {place}'),
    L('Collecting skies'),
    L('The long way, on purpose'),
    L('{date} · {place}'),
    L('Colour palette: {place}'),
    L('Unfiltered {place}'),
    L('Where the day went: {place}'),
    L('Lost in {place}, found in photos'),
  ],
  desi: [
    L('Kal ka pata nahi, aaj {place} tha'),
    L('Padhai baad mein, {place} pehle'),
    L('Ghar pe bola library ja rahe hain'),
    L('Chal na yaar, bas ek ghanta… (5 ghante baad)'),
    L('{place} ho gaya, ab assignment ka kya?'),
    L('Plan cancel hone wala tha, par ho gaya'),
    L('Yeh dosti, yeh {place} ❤️'),
    L('Paisa gaya, par memories aayi'),
    L('Hostel se bahar, zindagi ke andar'),
    L('Mummy ko mat batana'),
    L('Jugaad se pahunche {place}'),
    L('Kya scene hai {place} ka!'),
    L('Full paisa vasool trip'),
    L('Attendance short, memories long'),
    L('Weekend matlab {place}', 'weekend'),
    L('{day} ko bunk, {place} pe hunk', 'weekday'),
    L('Subah subah {place}, kya baat hai', 'sunrise'),
    L('Raat ko {place}, dil se', 'night'),
    L('Ek din, {count} jagah, full josh', 'multi'),
    L('Akele hi nikal pade {place}', 'solo'),
    L('Hum do, {place} hamara', 'duo'),
    L('{crew} log, ek hi mood: masti', 'squad'),
    L('Thoda sa {place}, bahut saara pyaar'),
    L('Aaj ka din: {place}. Kal ka: nahi pata.'),
    L('Bas yahi chahiye tha'),
  ],
  friendship: [
    L('Some trips end. The group chat doesn’t.'),
    L('Same people, new place'),
    L('Found my people at {place}'),
    L('Strangers at 9, friends by {place}'),
    L('The crew that made {place} a memory'),
    L('Good company, better {place}'),
    L('Friends who travel together, stay together'),
    L('{crew} people, one inside joke', 'squad'),
    L('Duo that doesn’t miss', 'duo'),
    L('Took myself out to {place}', 'solo'),
    L('Laughs louder than the playlist'),
    L('Proof we actually hang out'),
    L('Core memory: {place} with them'),
    L('Unplanned, unfiltered, unforgettable'),
    L('It’s the people, not the place (but also {place})'),
    L('Team {place} 🤝'),
    L('Seat taken. Memory made.'),
    L('The group project I actually liked'),
    L('We came, we saw, we sang badly'),
    L('Adding {place} to the friendship lore'),
    L('Found {count} places and a few friends', 'multi'),
    L('One trip, a hundred inside jokes'),
    L('Company > destination'),
    L('Split the fuel, kept the memories'),
    L('Met them on SafarNamma. Now they’re family.'),
  ],
  nostalgic: [
    L('We’ll miss this one'),
    L('Saving {place} for the days I need it'),
    L('Remember {place}?'),
    L('Years from now, we’ll talk about {place}'),
    L('Some days just stay'),
    L('{date}: a good day'),
    L('This is the one we’ll tell stories about'),
    L('College years, {place} chapter'),
    L('If I could replay one day'),
    L('Before the semester swallowed us'),
    L('Rewind to {place}'),
    L('Keeping this one forever'),
    L('The kind of day you don’t plan'),
    L('Bottled up: {place}'),
    L('Wish I could go back to {day}'),
    L('One for the memory box'),
    L('Last light at {place}', 'golden'),
    L('That {place} sunrise', 'sunrise'),
    L('The night we went to {place}', 'night'),
    L('From {stops}, with love', 'multi'),
    L('Just a {day} we won’t forget'),
    L('The good old days are now'),
    L('Photographs don’t do {place} justice'),
    L('Remembering this when exams hit'),
    L('Chapter: {place}'),
  ],
  adventure: [
    L('Conquered {place}'),
    L('Legs tired, soul full'),
    L('Worth every step to {place}'),
    L('Summit mood: {place}'),
    L('Off the map, onto {place}'),
    L('Adventure mode: on'),
    L('Wandered into {place}'),
    L('Where the road ends, {place} begins'),
    L('{count} stops, zero chill', 'multi'),
    L('Route: {stops}', 'multi'),
    L('Up before the sun for {place}', 'sunrise'),
    L('Chasing the last light at {place}', 'golden'),
    L('Into the wild(ish): {place}'),
    L('Mud on shoes, {place} in heart'),
    L('Found the trail, found myself', 'solo'),
    L('Two backpacks, one {place}', 'duo'),
    L('{crew} explorers, 1 mission', 'squad'),
    L('Breathe in: {place}'),
    L('Escape plan: executed'),
    L('Say yes to {place}'),
    L('Adrenaline, altitude, {place}'),
    L('Every road led to {place}'),
    L('Detour worth taking'),
    L('Hills > hostel'),
    L('We don’t do boring. We did {place}.'),
  ],
  foodie: [
    L('Ate our way through {place}'),
    L('Calories don’t count on trips'),
    L('Came for the food, stayed for more food'),
    L('{place}: 10/10, would eat again'),
    L('Hungry for {place}'),
    L('Plate full, heart fuller'),
    L('Food coma at {place}'),
    L('Menu? We ordered everything.'),
    L('Taste test: {place} passed'),
    L('Chai, chats, {place}'),
    L('Brunch at {place} hits different', 'day'),
    L('Breakfast with a view', 'sunrise'),
    L('Late night cravings sorted: {place}', 'night'),
    L('Food crawl: {stops}', 'multi'),
    L('{count} places, 1 very full stomach', 'multi'),
    L('Table for one at {place}', 'solo'),
    L('Split the bill, not the dessert', 'duo'),
    L('{crew} forks, 1 table', 'squad'),
    L('Mess food could never'),
    L('Diet starts Monday. Today: {place}.'),
    L('Rating {place}: ⭐⭐⭐⭐⭐'),
    L('Best bite in Bengaluru? {place}.'),
    L('Our love language is food'),
    L('Pet pooja at {place}'),
    L('Swipe for the food pics'),
  ],
  calm: [
    L('Peace found at {place}'),
    L('Quiet mind, {place}'),
    L('Slowing down at {place}'),
    L('A pause at {place}'),
    L('Blessed at {place} 🙏'),
    L('Stillness, {place}'),
    L('Breathing easy at {place}'),
    L('Soul reset: {place}'),
    L('Where the noise stops'),
    L('Calm before the exams'),
    L('Morning prayers at {place}', 'sunrise'),
    L('Evening bells at {place}', 'golden'),
    L('Lamps and stars at {place}', 'night'),
    L('A quiet trail: {stops}', 'multi'),
    L('Just me and {place}', 'solo'),
    L('Two souls, one quiet {place}', 'duo'),
    L('Gratitude, {place}'),
    L('Recharge complete'),
    L('Serenity at {place}'),
    L('In no hurry at {place}'),
    L('Found a little peace today'),
    L('Mind: clear. Heart: full.'),
    L('Offline at {place}'),
    L('Soft day at {place}'),
    L('Needed this more than I knew'),
  ],
  savage: [
    L('Doing better than your weekend'),
    L('You were invited. You chose sleep.'),
    L('FOMO? Should’ve come to {place}.'),
    L('Missed {place}? Your loss.'),
    L('Not sorry for the photo dump'),
    L('We don’t post. We flex {place}.'),
    L('Plans? We don’t make them. We go.'),
    L('Stay home. We’ll send photos.'),
    L('Our weekend > your whole month'),
    L('Caught in 4K at {place}'),
    L('Too cool for the hostel'),
    L('Rent-free in your head: {place}'),
    L('Sorry, we were busy at {place}'),
    L('The trip you said no to'),
    L('{count} places while you scrolled', 'multi'),
    L('Up at 5, while you slept', 'sunrise'),
    L('Night owls at {place}', 'night'),
    L('Solo and thriving at {place}', 'solo'),
    L('Duo goals: {place}', 'duo'),
    L('{crew} of us, zero regrets', 'squad'),
    L('Reply "next time" one more time'),
    L('Proof we have a life'),
    L('Screenshot this for your next excuse'),
    L('Had fun. Didn’t invite you. Kidding. (Join next time.)'),
    L('{place} just got a glow up (it was us)'),
  ],
};

/* Mix-and-match headlines: "<start> {place}<end>", 8 × 8 per mood, used once the hand-written
   ones for a mood have all been shown. Every pair is written to read naturally. */
const PARTS: Record<CaptionMood, { starts: string[]; ends: string[] }> = {
  fun: {
    starts: ['Weekend report:', 'Today’s side quest:', 'Status update:', 'Current mood:', 'Breaking news:', 'New core memory:', 'Escaped to', 'Speedran'],
    ends: [' 🔥', ', 10/10', ', no regrets', ', no notes', ' (again)', ' with the gang', ', a total vibe', ', highly recommend'],
  },
  aesthetic: {
    starts: ['A quiet day at', 'Light and air,', 'Somewhere between here and', 'Notes from', 'Still thinking about', 'Soft focus:', 'Borrowed a sky at', 'Pages from'],
    ends: ['', ' ✨', ', softly', ', in colour', ', slowly', ', just like that', ', unposed', ', as it was'],
  },
  desi: {
    starts: ['Aaj ka plan:', 'Dil se:', 'Full on masti at', 'Bina plan ke', 'Jugaad trip to', 'Bas chal pade', 'Ekdum mast:', 'Yaaron ke saath'],
    ends: [' 🔥', ', ekdum mast', ', dil khush', ', full josh', ', kya baat', ', paisa vasool', ', maza aa gaya', ' ❤️'],
  },
  friendship: {
    starts: ['With my people at', 'Crew goals:', 'Us, at', 'Same gang, new place:', 'Inside jokes made at', 'Best seat in the house:', 'Tagging everyone from', 'Friendship lore:'],
    ends: ['', ' 🤝', ', together', ', obviously', ', as always', ' ❤️', ', the full squad', ', again soon'],
  },
  nostalgic: {
    starts: ['Remembering', 'One day we’ll miss', 'Keeping', 'Back to', 'Forever:', 'Replaying', 'Holding onto', 'Chapter closed:'],
    ends: ['', ' 🤍', ', always', ', forever', ', in my head', ', on repeat', ', like yesterday', ', for a while'],
  },
  adventure: {
    starts: ['Mission complete:', 'Trail log:', 'Out here at', 'Checkpoint:', 'Explored', 'Next stop after', 'Uphill to', 'Wild day at'],
    ends: [' 🥾', ', conquered', ', and beyond', ', no shortcuts', ', done', ', every step', ', worth the climb', ', next one soon'],
  },
  foodie: {
    starts: ['Food report:', 'Tasting notes from', 'Eating through', 'Hungry at', 'Plates from', 'Menu review:', 'Snack run to', 'Feast mode at'],
    ends: [' 😋', ', 5 stars', ', full stomach', ', no leftovers', ', worth every bite', ', delicious', ', seconds please', ', chef’s kiss'],
  },
  calm: {
    starts: ['Peaceful at', 'Slow hours at', 'Quiet moments,', 'A deep breath at', 'Gratitude for', 'Finding calm at', 'Unhurried at', 'Soft pause:'],
    ends: [' 🙏', ', gently', ', in peace', ', unhurried', ', breathing easy', ', all good', ', with gratitude', ' 🕊️'],
  },
  savage: {
    starts: ['Meanwhile at', 'While you slept:', 'Unbothered at', 'Living rent-free at', 'Flexing', 'Excuse us, we’re at', 'Told you so:', 'Not jealous?'],
    ends: [' 😏', ', obviously', ', your loss', ', no invite needed', ', stay mad', ', next time come', ', just saying', ' 💅'],
  },
};
const partsFor = (mood: CaptionMood): Line[] =>
  PARTS[mood].starts.flatMap((s) => PARTS[mood].ends.map((e) => L(`${s} {place}${e}`)));

/* Second line of the post caption. {sn} = call-out to SafarNamma. */
const CLOSERS: Record<CaptionMood, string[]> = {
  fun: ['Already planning the next one.', 'Tag the one who bailed.', 'Would do it again tomorrow.', 'Brb, looking at these photos again.', 'Next trip, you’re coming.'],
  aesthetic: ['Some places just get it.', 'Keeping this one close.', 'Colour me happy.', 'All the light, none of the noise.', 'A day well spent.'],
  desi: ['Agli baar tu bhi chal.', 'Aise hi chalti rahe zindagi.', 'Bas yahi toh chahiye.', 'Next trip ka plan ready hai.', 'Dil khush ho gaya.'],
  friendship: ['Grateful for this crew.', 'Same time next weekend?', 'Tag your travel people.', 'Here’s to many more.', 'Best company, always.'],
  nostalgic: ['Holding onto this.', 'One for the archive.', 'Already miss it.', 'Future me will thank me for these.', 'Some memories don’t fade.'],
  adventure: ['Where to next?', 'Collect moments, not things.', 'The road is calling again.', 'Onto the next one.', 'Go further next time.'],
  foodie: ['Recommendations welcome.', 'Rate our plates.', 'Hungry already, again.', 'Save this for your next food run.', 'Food tour part 2 loading.'],
  calm: ['Carrying this peace into the week.', 'Grateful.', 'Go slow, go often.', 'Find your quiet.', 'Breathe.'],
  savage: ['Next time, don’t say no.', 'Invite pending. Don’t bail.', 'You know where to find us.', 'Catch up if you can.', 'Stay jealous (then join).'],
};
const SN_LINES = [
  'Planned on SafarNamma.',
  'Found this trip on SafarNamma.',
  'Trip made with SafarNamma.',
  'Want in? Find trips on SafarNamma.',
  'Next trip’s on SafarNamma. Join us.',
];

const EMOJI_SETS: Record<CaptionMood, string[]> = {
  fun: ['😂🔥', '🤪✨', '🎉📸', '😎🌴', '🙌💫'],
  aesthetic: ['✨🤍', '🌿☁️', '📷🌅', '🍂✨', '🌙🤍'],
  desi: ['🔥💯', '❤️🙌', '😎🛵', '🚗💨', '🎶✨'],
  friendship: ['🤝❤️', '🫶✨', '👯‍♀️📸', '💛🌻', '🧑‍🤝‍🧑💫'],
  nostalgic: ['🤍🎞️', '📼✨', '🌅💭', '🕰️🤍', '💌📷'],
  adventure: ['🏔️🥾', '🌄🔥', '🧭🌲', '⛰️💪', '🚙🌿'],
  foodie: ['🍕😋', '☕🥐', '🍜🔥', '🍰✨', '🥘💯'],
  calm: ['🙏🕊️', '🌸☁️', '🪷✨', '🌿🤍', '🕯️🌙'],
  savage: ['😏🔥', '💅✨', '🙄📸', '😌💯', '🫡🔥'],
};

const HASHTAG_SETS = [
  '#SafarNamma #NammaBengaluru #WeekendTrip',
  '#SafarNamma #Bengaluru #TravelWithFriends',
  '#SafarNamma #HiddenGems #Karnataka',
  '#SafarNamma #BangaloreDiaries #HostelLife',
  '#SafarNamma #WeekendVibes #ExploreKarnataka',
  '#SafarNamma #TravelDiaries #CollegeLife',
  '#SafarNamma #NammaBengaluru #PhotoDump',
  '#SafarNamma #BangaloreTravel #TripWithFriends',
];

/* ── Context ── */
export interface CaptionContext {
  place: string;
  stops: string[];
  crew: number;
  tripDate: Date;
}

const timeTag = (d: Date): Tag => {
  const h = d.getHours();
  if (h < 9) return 'sunrise';
  if (h >= 20 || h < 4) return 'night';
  if (h >= 16) return 'golden';
  return 'day';
};

const tagsFor = (ctx: CaptionContext): Set<Tag> => {
  const t = new Set<Tag>();
  t.add(ctx.crew <= 1 ? 'solo' : ctx.crew === 2 ? 'duo' : 'squad');
  t.add(ctx.stops.length >= 2 ? 'multi' : 'single');
  t.add(timeTag(ctx.tripDate));
  const day = ctx.tripDate.getDay();
  t.add(day === 0 || day === 6 ? 'weekend' : 'weekday');
  return t;
};

/** The mood a place's category suggests, used as the starting mood. */
export const moodForCategory = (category?: string): CaptionMood => {
  const c = (category || '').toLowerCase();
  if (/cafe|restaurant|food/.test(c)) return 'foodie';
  if (/religious|temple/.test(c)) return 'calm';
  if (/nature|adventure|game/.test(c)) return 'adventure';
  if (/monument|museum/.test(c)) return 'aesthetic';
  return 'fun';
};

const fill = (text: string, ctx: CaptionContext) =>
  text
    .replaceAll('{place}', ctx.place)
    .replaceAll('{stops}', ctx.stops.join(' → ') || ctx.place)
    .replaceAll('{count}', String(Math.max(1, ctx.stops.length)))
    .replaceAll('{crew}', String(Math.max(1, ctx.crew)))
    .replaceAll('{day}', ctx.tripDate.toLocaleDateString('en-IN', { weekday: 'long' }))
    .replaceAll('{date}', ctx.tripDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));

/* Small seeded RNG so two members of one trip get different picks, and a user's shuffles are stable. */
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* Headlines this device has already shown, so Shuffle keeps finding new ones. */
const SEEN_KEY = 'sn:seenCaptions';
const readSeen = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
};
const markSeen = (id: string) => {
  try {
    const seen = [...readSeen(), id].slice(-600);
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    /* storage unavailable: repeats are possible, nothing breaks */
  }
};

export interface PickedCaption {
  /** Short line drawn on the image. */
  headline: string;
  /** Full post caption: headline, closer, emojis, SafarNamma line, hashtags. */
  caption: string;
}

/**
 * Picks a caption for this trip and mood that this device hasn't shown yet.
 * `seed` should mix the user and trip (e.g. `${email}:${tripId}`); `turn` increases on each Shuffle.
 */
export const pickCaption = (mood: CaptionMood, ctx: CaptionContext, seed: string, turn: number): PickedCaption => {
  const tags = tagsFor(ctx);
  const fits = (l: Line) => l.tags.every((t) => tags.has(t));
  const pool = HEADLINES[mood].filter(fits);
  const generated = partsFor(mood);
  const seen = readSeen();
  const idOf = (l: Line) => `${mood}:${l.t}`;
  // Hand-written lines first; once they're used up, the mix-and-match ones
  let fresh = pool.filter((l) => !seen.has(idOf(l)));
  if (fresh.length === 0) fresh = generated.filter((l) => !seen.has(idOf(l)));
  if (fresh.length === 0) {
    // Everything in this mood has been shown: start the cycle again
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].filter((id) => !id.startsWith(`${mood}:`))));
    } catch {
      /* ignore */
    }
    fresh = pool;
  }
  // Lines written for this exact situation (night, squad, multi-stop…) come up first
  const specific = fresh.filter((l) => l.tags.length > 0);
  const r = rng(hash(`${seed}:${mood}:${turn}`));
  const from = specific.length && r() < 0.45 ? specific : fresh;
  const line = from[Math.floor(r() * from.length)];
  markSeen(idOf(line));

  const headline = fill(line.t, ctx);
  const closer = CLOSERS[mood][Math.floor(r() * CLOSERS[mood].length)];
  const emojis = EMOJI_SETS[mood][Math.floor(r() * EMOJI_SETS[mood].length)];
  const sn = SN_LINES[Math.floor(r() * SN_LINES.length)];
  const hashtags = HASHTAG_SETS[Math.floor(r() * HASHTAG_SETS.length)];
  return { headline, caption: `${headline} ${emojis}\n\n${closer} ${sn}\n\n${hashtags}` };
};
