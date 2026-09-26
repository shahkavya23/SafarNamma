/* ─── Trip story renderer ───
   Draws an Instagram story (1080×1920) or post (1080×1350) on an off-screen canvas, entirely
   in the browser: photos never leave the device. Three templates in the site's palette, each
   with the SafarNamma footer so every shared story points back to the site. */

export type StoryFormat = 'story' | 'post';
export type StoryTemplate = 'ticket' | 'film' | 'collage';

export const STORY_SIZES: Record<StoryFormat, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1350 },
};

export interface StoryStop {
  name: string;
  images: ImageBitmap[];
}

export interface StoryInput {
  format: StoryFormat;
  template: StoryTemplate;
  stops: StoryStop[];
  headline: string;
  title: string;
  tripDate: Date;
  crew: number;
}

const C = {
  night: '#0E1F22',
  nightSoft: '#17302F',
  ink: '#102A2E',
  sand: '#F2ECE3',
  paper: '#FBF8F3',
  muted: '#5E6A68',
  accent: '#E0561F',
  peach: '#F4B08A',
  line: 'rgba(16,42,46,0.14)',
};
const DISPLAY = 'Fraunces, Georgia, serif';
const BODY = 'Manrope, system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

let logoPromise: Promise<HTMLImageElement | null> | null = null;
const loadLogo = () =>
  (logoPromise ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = '/safarnamma-logo.png';
  }));

const FONT_SPECS = [`600 80px Fraunces`, `italic 500 80px Fraunces`, `600 30px Manrope`, `500 26px "JetBrains Mono"`];

/* Canvas text silently falls back to Georgia/Arial if a web font isn't loaded yet, and the first
   preview is the one people often share, so wait until every font really reports ready. */
let fontsReady: Promise<void> | null = null;
export const warmStoryFonts = () =>
  (fontsReady ??= (async () => {
    try {
      await document.fonts.ready;
      for (let attempt = 0; attempt < 5; attempt++) {
        await Promise.all(FONT_SPECS.map((f) => document.fonts.load(f)));
        if (FONT_SPECS.every((f) => document.fonts.check(f))) return;
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch {
      /* fall back to system fonts */
    }
  })());
const ensureFonts = warmStoryFonts;

/* ── Drawing helpers ── */
const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};

/** Draws an image cropped to fill the box (like object-fit: cover), clipped to rounded corners. */
const drawCover = (ctx: CanvasRenderingContext2D, img: ImageBitmap, x: number, y: number, w: number, h: number, r = 0) => {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
};

const placeholder = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, dark: boolean) => {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = dark ? C.nightSoft : '#E7DED1';
  ctx.fill();
  ctx.fillStyle = dark ? 'rgba(242,236,227,0.35)' : 'rgba(16,42,46,0.35)';
  ctx.font = `500 28px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ADD A PHOTO', x + w / 2, y + h / 2);
  ctx.restore();
};

/** Splits text into lines that fit maxWidth, at most maxLines (last line gets an ellipsis). */
const wrap = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last}…`;
    return kept;
  }
  return lines;
};

/** Shrinks the font until the text fits in maxLines, then draws it. Returns the height used. */
const fitText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  opts: { font: (size: number) => string; start: number; min: number; maxLines: number; color: string; lineHeight?: number; align?: CanvasTextAlign }
) => {
  let size = opts.start;
  let lines: string[] = [];
  for (; size >= opts.min; size -= 4) {
    ctx.font = opts.font(size);
    lines = wrap(ctx, text, maxWidth, 99);
    if (lines.length <= opts.maxLines) break;
  }
  ctx.font = opts.font(Math.max(size, opts.min));
  lines = wrap(ctx, text, maxWidth, opts.maxLines);
  const lh = Math.round(Math.max(size, opts.min) * (opts.lineHeight ?? 1.08));
  ctx.fillStyle = opts.color;
  ctx.textAlign = opts.align ?? 'left';
  ctx.textBaseline = 'top';
  const ax = opts.align === 'center' ? x + maxWidth / 2 : x;
  lines.forEach((l, i) => ctx.fillText(l, ax, y + i * lh));
  return lines.length * lh;
};

const monoLabel = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size = 24, align: CanvasTextAlign = 'left') => {
  ctx.font = `500 ${size}px ${MONO}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.letterSpacing = `${Math.round(size * 0.18)}px`;
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.letterSpacing = '0px';
};

const footer = (ctx: CanvasRenderingContext2D, W: number, H: number, logo: HTMLImageElement | null, dark: boolean) => {
  const y = H - 110;
  const color = dark ? 'rgba(242,236,227,0.75)' : C.muted;
  if (logo) {
    const h = 70;
    const w = (logo.width / logo.height) * h;
    ctx.drawImage(logo, 60, y - 8, w, h);
  } else {
    ctx.font = `600 40px ${DISPLAY}`;
    ctx.fillStyle = dark ? C.sand : C.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('SafarNamma', 60, y);
  }
  ctx.font = `600 26px ${BODY}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('Plan yours on', W - 60, y);
  ctx.fillStyle = dark ? C.peach : C.accent;
  ctx.fillText('safarnamma.vercel.app', W - 60, y + 34);
};

const tripMeta = (input: StoryInput) => {
  const d = input.tripDate;
  const date = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const route = input.stops.map((s) => s.name).join(' → ');
  return { date, route };
};

/* ── Templates ── */

/* Ticket: a big hero photo, extra photos as thumbnails, and a boarding-pass stub. */
const drawTicket = (ctx: CanvasRenderingContext2D, W: number, H: number, input: StoryInput, photos: { img: ImageBitmap; stop: string }[]) => {
  const story = input.format === 'story';
  const { date, route } = tripMeta(input);
  ctx.fillStyle = C.night;
  ctx.fillRect(0, 0, W, H);

  const m = 60;
  // Sized so a 2-line headline and the boarding-pass stub always fit above the footer
  const heroH = story ? 960 : 700;
  const heroY = story ? 150 : 60;
  if (photos[0]) drawCover(ctx, photos[0].img, m, heroY, W - m * 2, heroH, 44);
  else placeholder(ctx, m, heroY, W - m * 2, heroH, 44, true);

  // Soft fade at the bottom of the hero so the thumbnails sit cleanly
  const g = ctx.createLinearGradient(0, heroY + heroH - 260, 0, heroY + heroH);
  g.addColorStop(0, 'rgba(14,31,34,0)');
  g.addColorStop(1, 'rgba(14,31,34,0.75)');
  ctx.save();
  roundRect(ctx, m, heroY, W - m * 2, heroH, 44);
  ctx.clip();
  ctx.fillStyle = g;
  ctx.fillRect(m, heroY + heroH - 260, W - m * 2, 260);
  ctx.restore();

  if (story) monoLabel(ctx, `${date} · ${input.crew} ${input.crew === 1 ? 'explorer' : 'explorers'}`, m, 80, C.peach, 26);

  // Up to 3 extra photos along the bottom edge of the hero
  const thumbs = photos.slice(1, 4);
  const tw = story ? 200 : 150;
  thumbs.forEach((p, i) => {
    const x = m + 36 + i * (tw + 20);
    const y = heroY + heroH - tw - 36;
    ctx.save();
    roundRect(ctx, x - 6, y - 6, tw + 12, tw + 12, 30);
    ctx.fillStyle = C.sand;
    ctx.fill();
    ctx.restore();
    drawCover(ctx, p.img, x, y, tw, tw, 24);
  });

  // Headline
  const hy = heroY + heroH + (story ? 60 : 40);
  const used = fitText(ctx, input.headline, m, hy, W - m * 2, {
    font: (s) => `600 ${s}px ${DISPLAY}`,
    start: story ? 92 : 68,
    min: 40,
    maxLines: 2,
    color: C.sand,
  });

  // Boarding-pass stub
  const sy = hy + used + (story ? 50 : 30);
  const sh = story ? 240 : 170;
  {
    ctx.save();
    roundRect(ctx, m, sy, W - m * 2, sh, 36);
    ctx.fillStyle = C.paper;
    ctx.fill();
    // Punched holes along the tear line
    ctx.fillStyle = C.night;
    const tearX = W - m - 250;
    for (let yy = sy + 22; yy < sy + sh - 10; yy += 34) {
      ctx.beginPath();
      ctx.arc(tearX, yy, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // The story shows the date above the photo; the post has no room there, so it goes on the stub
    const label = input.stops.length > 1 ? 'Route' : 'Destination';
    monoLabel(ctx, story ? label : `${label} · ${date}`, m + 40, sy + 34, C.muted, 22);
    fitText(ctx, route, m + 40, sy + 72, tearX - m - 80, {
      font: (s) => `600 ${s}px ${BODY}`,
      start: story ? 46 : 36,
      min: 26,
      maxLines: story ? 3 : 2,
      color: C.ink,
      lineHeight: 1.2,
    });
    monoLabel(ctx, 'Crew', tearX + 40, sy + 34, C.muted, 22);
    ctx.font = `600 ${story ? 84 : 60}px ${DISPLAY}`;
    ctx.fillStyle = C.accent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(input.crew), tearX + 40, sy + 70);
  }

  footer(ctx, W, H, loadedLogo, true);
};

/* Film strip: one frame per photo, sprocket holes down both sides, place names on the frames. */
const drawFilm = (ctx: CanvasRenderingContext2D, W: number, H: number, input: StoryInput, photos: { img: ImageBitmap; stop: string }[]) => {
  const story = input.format === 'story';
  const { date } = tripMeta(input);
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);

  const m = 60;
  monoLabel(ctx, date, m, story ? 90 : 60, C.peach, 26);
  const used = fitText(ctx, input.headline, m, story ? 140 : 104, W - m * 2, {
    font: (s) => `italic 500 ${s}px ${DISPLAY}`,
    start: story ? 92 : 68,
    min: 44,
    maxLines: 2,
    color: C.sand,
  });

  const stripX = m;
  const stripW = W - m * 2;
  const top = (story ? 140 : 104) + used + 40;
  const bottom = H - 150;
  ctx.fillStyle = '#050D0E';
  roundRect(ctx, stripX, top, stripW, bottom - top, 18);
  ctx.fill();

  // Sprocket holes
  ctx.fillStyle = C.ink;
  for (let y = top + 20; y < bottom - 30; y += 46) {
    roundRect(ctx, stripX + 16, y, 28, 20, 5);
    ctx.fill();
    roundRect(ctx, stripX + stripW - 44, y, 28, 20, 5);
    ctx.fill();
  }

  const frames = photos.length ? photos.slice(0, story ? 4 : 3) : [null];
  const gap = 22;
  const fx = stripX + 64;
  const fw = stripW - 128;
  const fh = (bottom - top - 40 - gap * (frames.length - 1)) / frames.length;
  frames.forEach((p, i) => {
    const fy = top + 20 + i * (fh + gap);
    if (p) drawCover(ctx, p.img, fx, fy, fw, fh, 6);
    else placeholder(ctx, fx, fy, fw, fh, 6, true);
    if (p) {
      const text = p.stop.length > 34 ? `${p.stop.slice(0, 33)}…` : p.stop;
      ctx.save();
      // Measure with the same font and letter spacing monoLabel draws with
      ctx.font = `500 22px ${MONO}`;
      ctx.letterSpacing = '4px';
      const lw = Math.min(ctx.measureText(text.toUpperCase()).width + 40, fw - 40);
      ctx.letterSpacing = '0px';
      roundRect(ctx, fx + 20, fy + fh - 64, lw, 44, 22);
      ctx.fillStyle = 'rgba(14,31,34,0.72)';
      ctx.fill();
      ctx.restore();
      monoLabel(ctx, text, fx + 38, fy + fh - 54, C.sand, 22);
    }
  });

  footer(ctx, W, H, loadedLogo, true);
};

/* Collage: a light page, big headline, every photo in a tidy grid. */
const drawCollage = (ctx: CanvasRenderingContext2D, W: number, H: number, input: StoryInput, photos: { img: ImageBitmap; stop: string }[]) => {
  const story = input.format === 'story';
  const { date, route } = tripMeta(input);
  ctx.fillStyle = C.sand;
  ctx.fillRect(0, 0, W, H);

  const m = 60;
  monoLabel(ctx, `${date} · ${input.crew} ${input.crew === 1 ? 'explorer' : 'explorers'}`, m, story ? 90 : 56, C.accent, 24);
  const hUsed = fitText(ctx, input.headline, m, story ? 138 : 100, W - m * 2, {
    font: (s) => `600 ${s}px ${DISPLAY}`,
    start: story ? 100 : 72,
    min: 44,
    maxLines: story ? 3 : 2,
    color: C.ink,
  });
  const rUsed = fitText(ctx, route, m, (story ? 138 : 100) + hUsed + 18, W - m * 2, {
    font: (s) => `500 ${s}px ${MONO}`,
    start: 28,
    min: 20,
    maxLines: 2,
    color: C.muted,
    lineHeight: 1.3,
  });

  const top = (story ? 138 : 100) + hUsed + rUsed + 50;
  const bottom = H - 150;
  const gw = W - m * 2;
  const gh = bottom - top;
  const g = 18;
  const imgs = photos.slice(0, 6);
  const boxes: [number, number, number, number][] = [];
  const n = imgs.length || 1;
  if (n === 1) boxes.push([0, 0, gw, gh]);
  else if (n === 2) boxes.push([0, 0, gw, (gh - g) / 2], [0, (gh + g) / 2, gw, (gh - g) / 2]);
  else if (n === 3) {
    const bh = gh * 0.58;
    boxes.push([0, 0, gw, bh], [0, bh + g, (gw - g) / 2, gh - bh - g], [(gw + g) / 2, bh + g, (gw - g) / 2, gh - bh - g]);
  } else {
    const cols = 2;
    const rows = Math.ceil(n / cols);
    const cw = (gw - g) / cols;
    const ch = (gh - g * (rows - 1)) / rows;
    for (let i = 0; i < n; i++) {
      const last = i === n - 1 && n % 2 === 1;
      boxes.push([last ? 0 : (i % cols) * (cw + g), Math.floor(i / cols) * (ch + g), last ? gw : cw, ch]);
    }
  }
  boxes.forEach(([x, y, w, h], i) => {
    const p = imgs[i];
    if (p) drawCover(ctx, p.img, m + x, top + y, w, h, 28);
    else placeholder(ctx, m + x, top + y, w, h, 28, false);
  });

  footer(ctx, W, H, loadedLogo, false);
};

let loadedLogo: HTMLImageElement | null = null;

/** Renders the chosen template and returns a JPEG ready to share or download. */
export const renderStory = async (input: StoryInput): Promise<Blob> => {
  await ensureFonts();
  loadedLogo = await loadLogo();
  const { w, h } = STORY_SIZES[input.format];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser can’t draw images. Try Chrome.');
  const photos = input.stops.flatMap((s) => s.images.map((img) => ({ img, stop: s.name })));
  if (input.template === 'ticket') drawTicket(ctx, w, h, input, photos);
  else if (input.template === 'film') drawFilm(ctx, w, h, input, photos);
  else drawCollage(ctx, w, h, input, photos);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the image.'))), 'image/jpeg', 0.92)
  );
};
