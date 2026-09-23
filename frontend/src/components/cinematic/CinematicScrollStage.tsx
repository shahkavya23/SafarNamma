import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Compass,
  ArrowRight,
  ChevronRight,
  Gauge,
  Mountain,
  Navigation,
  MapPin,
} from 'lucide-react';

export interface CinematicChapter {
  id: string;
  number: string;
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  location: string;
  terrain: string;
  driveMode: string;
  stats: { label: string; value: string }[];
  primaryCtaText: string;
  primaryCtaLink: string;
  hotspot: {
    title: string;
    detail: string;
    coords: string;
    top: string;
    left: string;
  };
}

const CINEMATIC_CHAPTERS: CinematicChapter[] = [
  {
    id: 'offgrid',
    number: '01',
    tag: 'OVERLAND EXPEDITION',
    title: 'Break Away from the Urban Grid.',
    subtitle: 'Western Ghats Backcountry Pass',
    description:
      'High-speed gravel switchbacks, golden morning dust, and raw Karnataka backcountry. Leave the asphalt behind in a bespoke 4x4 built for uncharted trails.',
    image: '/cinematic/hero_expedition.jpg',
    location: 'Western Ghats Ridge Trail',
    terrain: 'Loose Gravel & Rock Switchbacks',
    driveMode: '4WD HIGH • TRAIL',
    stats: [
      { label: 'Elevation', value: '1120m' },
      { label: 'Trail Class', value: '4x4 Ridge' },
      { label: 'Distance', value: '142 KM' },
    ],
    primaryCtaText: 'Explore Backcountry Trails',
    primaryCtaLink: '/explore?category=Treks',
    hotspot: {
      title: 'Western Ghats Switchback 04',
      detail: 'Loose gravel trail with 18% incline. Best navigated at dawn.',
      coords: '12.9716° N, 77.5946° E',
      top: '38%',
      left: '28%',
    },
  },
  {
    id: 'urban',
    number: '02',
    tag: 'THE NIGHT ODYSSEY',
    title: 'Rain-Slicked Boulevards & Neon Shadows.',
    subtitle: 'Bengaluru Midnight Boulevard',
    description:
      'Church Street cobblestones glistening in dusk drizzle, artisan filter coffee roasts, and the purple LED pulse of the elevated Namma Metro track cutting through midnight mist.',
    image: '/cinematic/urban_neon.jpg',
    location: 'Church Street & MG Road Corridor',
    terrain: 'Wet Asphalt & Cobblestone',
    driveMode: 'SPORT AWD • RAIN',
    stats: [
      { label: 'Night Drive', value: 'Bengaluru Core' },
      { label: 'Atmosphere', value: 'Dusk Drizzle' },
      { label: 'Stops', value: 'Bookstores & Cafes' },
    ],
    primaryCtaText: 'Discover Cafes & Nightlife',
    primaryCtaLink: '/explore?category=Cafes',
    hotspot: {
      title: 'Church Street Cobblestones',
      detail: 'Fresh rain reflections with indie cafes and live acoustic buskers.',
      coords: '12.9756° N, 77.6066° E',
      top: '42%',
      left: '68%',
    },
  },
  {
    id: 'summit',
    number: '03',
    tag: 'ABOVE THE CLOUDLINE',
    title: 'Where the Clouds Meet the Granite.',
    subtitle: 'Nandi Ridge 1478m Peak',
    description:
      'Perched at 1478m on the Western Ghats granite ridge. Watch the morning cloud inversion ignite in gold and purple from the roof rack of your overland machine.',
    image: '/cinematic/ghats_summit.jpg',
    location: 'Nandi Hills & Western Ghats Summit',
    terrain: 'Granite Crag & Cloud Inversion',
    driveMode: '4WD LOW • CLIMB 1478M',
    stats: [
      { label: 'Peak Altitude', value: '1478m' },
      { label: 'Sunrise Peak', value: '05:42 AM' },
      { label: 'Inversion', value: 'Sea of Clouds' },
    ],
    primaryCtaText: 'View Summit & Viewpoints',
    primaryCtaLink: '/explore?category=Viewpoints',
    hotspot: {
      title: 'Cliff Sunrise Overlook',
      detail: 'Cloud inversion ceiling at 1200m. 360° panoramic horizon.',
      coords: '13.3702° N, 77.6835° E',
      top: '32%',
      left: '34%',
    },
  },
  {
    id: 'basecamp',
    number: '04',
    tag: 'EXPEDITION BASECAMP',
    title: 'Gather Around the Campfire.',
    subtitle: 'Wilderness Basecamp Ridge',
    description:
      'Rooftop tents pitched under the Milky Way cosmos. Crackling wood embers, shared route notes, and community group convoys formed for the next dawn ascent.',
    image: '/cinematic/basecamp_stars.jpg',
    location: 'Wilderness Basecamp Ridge',
    terrain: 'Wilderness Clearing & Camp',
    driveMode: 'PARK • BASECAMP MODE',
    stats: [
      { label: 'Night Sky', value: 'Bortle 3' },
      { label: 'Campfire', value: 'Active Convoys' },
      { label: 'Community', value: 'Travel Together' },
    ],
    primaryCtaText: 'Join Travel Groups',
    primaryCtaLink: '/groups',
    hotspot: {
      title: 'Basecamp Hearth & Rooftop Tents',
      detail: '4 active community convoys departing tomorrow at 05:00 AM.',
      coords: '12.8342° N, 77.4128° E',
      top: '46%',
      left: '62%',
    },
  },
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

export const CinematicScrollStage: React.FC = () => {
  const navigate = useNavigate();
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Scroll state & interpolation
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentVelocity, setCurrentVelocity] = useState(0);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeHotspot, setActiveHotspot] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Refs for requestAnimationFrame loop
  const progressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const velocityRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const particlesRef = useRef<Particle[]>([]);

  // ─── 1. SCROLL LISTENER & RAF LERP ENGINE ───
  useEffect(() => {
    const handleScroll = () => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const totalScrollable = trackRef.current.scrollHeight - window.innerHeight;
      if (totalScrollable <= 0) return;

      const scrolled = -rect.top;
      const raw = Math.max(0, Math.min(1, scrolled / totalScrollable));
      targetProgressRef.current = raw;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    let animId: number;
    const updateMotion = () => {
      const now = performance.now();
      const dt = Math.max(1, now - lastTimeRef.current);
      lastTimeRef.current = now;

      // Exponential damping / lerp for silky smooth 60fps/120fps motion
      const prev = progressRef.current;
      progressRef.current += (targetProgressRef.current - progressRef.current) * 0.09;

      // Instantaneous velocity (KM/H conversion simulation)
      const diff = Math.abs(progressRef.current - prev);
      const instantVelocity = (diff / dt) * 140000;
      velocityRef.current += (instantVelocity - velocityRef.current) * 0.12;

      setScrollProgress(progressRef.current);
      setCurrentVelocity(Math.min(98, Math.round(velocityRef.current)));

      // Determine active chapter (0, 1, 2, 3)
      const chIdx = Math.min(3, Math.max(0, Math.floor(progressRef.current * 4)));
      setActiveChapterIndex(chIdx);

      animId = requestAnimationFrame(updateMotion);
    };

    animId = requestAnimationFrame(updateMotion);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animId);
    };
  }, []);

  // ─── 2. MOUSE PARALLAX FOR 3D CHASSIS GYRO ───
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { width, height } = currentTarget.getBoundingClientRect();
    const x = (clientX / width - 0.5) * 2;
    const y = (clientY / height - 0.5) * 2;
    setMousePos({ x, y });
  };

  // ─── 3. HTML5 PARTICLE CANVAS (Dust, Rain, Clouds, Embers) ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const createParticle = (w: number, h: number, chapter: number): Particle => {
      if (chapter === 0) {
        return {
          x: w * (0.45 + Math.random() * 0.5),
          y: h * (0.65 + Math.random() * 0.3),
          vx: -1.8 - Math.random() * 3.5,
          vy: -0.4 + (Math.random() - 0.5) * 1.5,
          size: 1.5 + Math.random() * 3,
          alpha: 0.12 + Math.random() * 0.35,
          color: Math.random() > 0.4 ? '#F59E0B' : '#FBBF24',
        };
      } else if (chapter === 1) {
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: -2.5 - Math.random() * 4,
          vy: 14 + Math.random() * 18,
          size: 1.2,
          alpha: 0.15 + Math.random() * 0.45,
          color: Math.random() > 0.5 ? '#93C5FD' : '#C7D2FE',
        };
      } else if (chapter === 2) {
        // High altitude soft cloud mist
        return {
          x: Math.random() * w,
          y: h * (0.55 + Math.random() * 0.45),
          vx: 0.6 + Math.random() * 1.2,
          vy: -0.1 + (Math.random() - 0.5) * 0.2,
          size: 35 + Math.random() * 60,
          alpha: 0.03 + Math.random() * 0.06,
          color: '#E2E8F0',
        };
      } else {
        // Campfire embers rising
        return {
          x: w * (0.6 + (Math.random() - 0.5) * 0.5),
          y: h * (0.8 + Math.random() * 0.18),
          vx: (Math.random() - 0.5) * 1.8,
          vy: -1.2 - Math.random() * 3,
          size: 1.2 + Math.random() * 2.5,
          alpha: 0.35 + Math.random() * 0.5,
          color: Math.random() > 0.4 ? '#F97316' : '#F59E0B',
        };
      }
    };

    // Initialize particles
    const count = activeChapterIndex === 2 ? 35 : 95;
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push(createParticle(width, height, activeChapterIndex));
    }
    particlesRef.current = particles;

    let animId: number;
    const renderParticles = () => {
      ctx.clearRect(0, 0, width, height);

      const chIdx = activeChapterIndex;
      const speedMult = 1 + (velocityRef.current / 35);

      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx * speedMult;
        p.y += p.vy * speedMult;

        ctx.save();

        if (chIdx === 0) {
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + velocityRef.current * 0.02), 0, Math.PI * 2);
          ctx.fill();
        } else if (chIdx === 1) {
          ctx.globalAlpha = p.alpha;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 3.5, p.y + p.vy * 4);
          ctx.stroke();
        } else if (chIdx === 2) {
          // Soft radial gradient for ethereal mountain cloud mist
          ctx.globalAlpha = p.alpha;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          grad.addColorStop(0, 'rgba(241, 245, 249, 0.4)');
          grad.addColorStop(0.5, 'rgba(226, 232, 240, 0.15)');
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#F59E0B';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        if (p.x < -80 || p.x > width + 80 || p.y < -80 || p.y > height + 80) {
          particlesRef.current[idx] = createParticle(width, height, chIdx);
        }
      });

      animId = requestAnimationFrame(renderParticles);
    };

    animId = requestAnimationFrame(renderParticles);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [activeChapterIndex]);

  // ─── 4. VEHICLE PHYSICAL MOTION INTERPOLATION ───
  const p = scrollProgress;

  // Vehicle Scale: Starts at 0.86, surges forward to 1.04 in ch 1, settles, climbs to 1.08, settles at 1.0
  let vehicleScale = 0.86;
  if (p < 0.25) {
    vehicleScale = 0.86 + (p / 0.25) * 0.18;
  } else if (p < 0.5) {
    const t = (p - 0.25) / 0.25;
    vehicleScale = 1.04 - t * 0.04;
  } else if (p < 0.75) {
    const t = (p - 0.5) / 0.25;
    vehicleScale = 1.0 + t * 0.08;
  } else {
    const t = (p - 0.75) / 0.25;
    vehicleScale = 1.08 - t * 0.08;
  }

  // Vehicle X Translation:
  // Starts right (+14%), accelerates forward (+2%), banks into urban turn (-6%), climbs mountain (+2%), settles at basecamp (+5%)
  let vehicleX = 14;
  if (p < 0.25) {
    vehicleX = 14 - (p / 0.25) * 12; // 14% -> 2%
  } else if (p < 0.5) {
    const t = (p - 0.25) / 0.25;
    vehicleX = 2 - t * 8; // 2% -> -6% (left bank)
  } else if (p < 0.75) {
    const t = (p - 0.5) / 0.25;
    vehicleX = -6 + t * 8; // -6% -> +2% (mountain ascent)
  } else {
    const t = (p - 0.75) / 0.25;
    vehicleX = 2 + t * 3; // +2% -> +5% (settles at camp)
  }

  // Vehicle Y Translation & Climbing Pitch:
  let vehicleY = 24;
  let vehicleRotateZ = 0;
  if (p < 0.25) {
    vehicleY = 24 - (p / 0.25) * 10;
    vehicleRotateZ = -0.5 + (p / 0.25) * 0.8;
  } else if (p < 0.5) {
    const t = (p - 0.25) / 0.25;
    vehicleY = 14 + t * 10;
    vehicleRotateZ = 0.3 - t * 3.2; // Banking curve (-2.9 deg)
  } else if (p < 0.75) {
    const t = (p - 0.5) / 0.25;
    vehicleY = 24 - t * 40; // Climbs uphill (-16px)
    vehicleRotateZ = -2.9 + t * 6.5; // Pitches uphill (+3.6 deg)
  } else {
    const t = (p - 0.75) / 0.25;
    vehicleY = -16 + t * 34; // Settles onto basecamp
    vehicleRotateZ = 3.6 - t * 3.6; // Level
  }

  // High-frequency suspension micro-jitter
  const vibration =
    currentVelocity > 5
      ? Math.sin(Date.now() * 0.02) * (currentVelocity * 0.04)
      : 0;

  // 3D Mouse gyro rotation for tangible feel
  const gyroX = -mousePos.y * 5;
  const gyroY = mousePos.x * 7;

  // Telemetry
  const currentAltitude = Math.round(920 + p * (1478 - 920));
  const compassDegrees = Math.round((338 + p * 194) % 360);
  const currentChapter = CINEMATIC_CHAPTERS[activeChapterIndex];

  // Smooth scroll to chapter
  const scrollToChapter = (idx: number) => {
    if (!trackRef.current) return;
    const totalScrollable = trackRef.current.scrollHeight - window.innerHeight;
    const targetScrollY = trackRef.current.offsetTop + (idx * 0.25 + 0.02) * totalScrollable;
    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth',
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/explore');
    }
  };

  return (
    <div
      ref={trackRef}
      className="relative w-full h-[440vh] bg-[#070A0D]"
      onMouseMove={handleMouseMove}
    >
      {/* ══════════════════════════════════════════════════════════════
          STICKY VIEWPORT STAGE (Locked during 440vh expedition scroll)
          ══════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between select-none">
        {/* ─── 1. BACKGROUND SCENIC PLATES WITH SMOOTH CROSSFADE ─── */}
        {CINEMATIC_CHAPTERS.map((ch, idx) => {
          const center = idx * 0.25 + 0.125;
          const dist = Math.abs(p - center);
          let opacity = Math.max(0, Math.min(1, 1 - (dist - 0.06) / 0.14));
          if (idx === 0 && p < 0.125) opacity = 1;
          if (idx === 3 && p > 0.875) opacity = 1;

          return (
            <div
              key={ch.id}
              className="absolute inset-0 pointer-events-none transition-transform duration-700 ease-out"
              style={{
                opacity,
                transform: `scale(${1.03 + (p - idx * 0.25) * 0.06}) translate(${
                  mousePos.x * 6
                }px, ${mousePos.y * 6}px)`,
              }}
            >
              <img
                src={ch.image}
                alt={ch.title}
                className="w-full h-full object-cover object-center filter brightness-[0.82] contrast-[1.06]"
              />
            </div>
          );
        })}

        {/* ─── 2. CINEMATIC COLOR GRADIENTS & VIGNETTES ─── */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070A0D] via-[#070A0D]/30 to-black/40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070A0D]/90 via-[#070A0D]/30 to-black/50 pointer-events-none" />
        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 pointer-events-none" />

        {/* ─── 3. DUAL-LAYER HTML5 PARTICLE CANVAS ─── */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-10 pointer-events-none"
        />

        {/* ─── 4. VEHICLE SHADOW & VOLUMETRIC HEADLIGHT BEAMS ─── */}
        <div
          className="absolute z-20 pointer-events-none transition-all duration-75"
          style={{
            left: '50%',
            bottom: '22%',
            transform: `translate(calc(-50% + ${vehicleX}%), calc(10% + ${
              vehicleY + vibration
            }px)) scale(${vehicleScale}) rotateZ(${vehicleRotateZ}deg) rotateX(${gyroX}deg) rotateY(${gyroY}deg)`,
            transformOrigin: '50% 85%',
          }}
        >
          {/* Ground Contact Shadow */}
          <div
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[780px] h-[75px] rounded-[100%] bg-black/85 filter blur-xl transition-all duration-200"
            style={{
              opacity: 0.85 + (p > 0.75 ? 0.1 : 0),
              transform: `translateX(-50%) scaleX(${1.1 - vehicleRotateZ * 0.02})`,
            }}
          />

          {/* Volumetric Dual Headlight Light Shafts */}
          <div
            className="absolute top-[52%] left-[12%] w-[680px] h-[220px] pointer-events-none transition-opacity duration-300 origin-left"
            style={{
              opacity:
                activeChapterIndex === 3
                  ? 0.35
                  : 0.7 + (currentVelocity / 100) * 0.3,
              transform: `rotate(${vehicleRotateZ - 4}deg) translate(-100px, 10px)`,
              background:
                activeChapterIndex === 1
                  ? 'radial-gradient(ellipse at 15% 50%, rgba(147, 197, 253, 0.45) 0%, rgba(59, 130, 246, 0.15) 45%, transparent 75%)'
                  : 'radial-gradient(ellipse at 15% 50%, rgba(253, 224, 71, 0.5) 0%, rgba(245, 158, 11, 0.2) 50%, transparent 75%)',
              filter: 'blur(16px)',
            }}
          />

          {/* ─── THE PHOTOREALISTIC OVERLAND 4X4 VEHICLE CUTOUT ─── */}
          <img
            src="/cinematic/vehicle_cutout.png"
            alt="SafarNamma Overland 4x4 Machine"
            className="relative z-20 w-[580px] sm:w-[680px] md:w-[780px] max-w-none filter drop-shadow-[0_25px_35px_rgba(0,0,0,0.85)] brightness-[0.96] contrast-[1.04]"
          />

          {/* Headlight Flare Hotspots */}
          <div
            className="absolute top-[48%] left-[26%] w-10 h-10 rounded-full bg-amber-200/90 filter blur-sm pointer-events-none animate-pulse"
            style={{
              opacity: activeChapterIndex === 3 ? 0.3 : 0.85,
            }}
          />
          <div
            className="absolute top-[58%] left-[24%] w-6 h-6 rounded-full bg-amber-100/90 filter blur-[2px] pointer-events-none"
            style={{
              opacity: activeChapterIndex === 3 ? 0.25 : 0.8,
            }}
          />
        </div>

        {/* ─── 5. TOP BAR TELEMETRY & EXPEDITION BREADCRUMB ─── */}
        <header className="relative z-30 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 pt-28 flex justify-between items-center text-xs uppercase font-mono tracking-widest text-gray-300">
          {/* Status & Real-Time Drive Mode */}
          <div className="flex items-center gap-3 bg-black/50 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full shadow-2xl">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                currentVelocity > 5
                  ? 'bg-emerald-400 animate-ping'
                  : 'bg-[#F59E0B] animate-pulse'
              }`}
            />
            <span className="text-white font-bold tracking-wider">
              {currentChapter.driveMode}
            </span>
            <span className="text-white/30 hidden sm:inline">•</span>
            <span className="text-gray-400 hidden sm:inline">
              {currentChapter.location}
            </span>
          </div>

          {/* Telemetry Cluster Top Right (Speed, Odo, Altitude) */}
          <div className="flex items-center gap-4 sm:gap-6 bg-black/50 backdrop-blur-xl border border-white/10 px-5 py-2 rounded-full shadow-2xl">
            <div className="flex items-center gap-2">
              <Gauge className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span className="text-gray-400 hidden md:inline">SPEED:</span>
              <span className="text-white font-bold font-mono text-sm">
                {currentVelocity} <span className="text-[10px] text-gray-400">KM/H</span>
              </span>
            </div>

            <div className="w-px h-3.5 bg-white/20" />

            <div className="flex items-center gap-2">
              <Mountain className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span className="text-gray-400 hidden md:inline">ALT:</span>
              <span className="text-white font-bold font-mono text-sm">
                {currentAltitude}m
              </span>
            </div>

            <div className="w-px h-3.5 bg-white/20" />

            <div className="flex items-center gap-2">
              <Navigation
                className="w-3.5 h-3.5 text-[#F59E0B] transition-transform duration-300"
                style={{ transform: `rotate(${compassDegrees}deg)` }}
              />
              <span className="text-white font-bold font-mono text-sm">
                {compassDegrees}°
              </span>
            </div>
          </div>
        </header>

        {/* ─── 6. INTERACTIVE FLOATING WAYPOINT HOTSPOTS ─── */}
        {CINEMATIC_CHAPTERS.map((ch, idx) => {
          const isCurrent = idx === activeChapterIndex;
          if (!isCurrent) return null;
          return (
            <div
              key={ch.id}
              className="absolute z-25 transition-all duration-700 animate-fade-in-up"
              style={{
                top: ch.hotspot.top,
                left: ch.hotspot.left,
              }}
            >
              <div className="relative group">
                <button
                  onClick={() => setActiveHotspot(activeHotspot === idx ? null : idx)}
                  className="flex items-center gap-2 bg-black/75 backdrop-blur-md border border-[#F59E0B]/60 text-white px-3.5 py-1.5 rounded-full text-xs font-mono shadow-2xl hover:border-[#F59E0B] hover:scale-105 transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-ping" />
                  <MapPin className="w-3 h-3 text-[#F59E0B]" />
                  <span className="font-semibold">{ch.hotspot.title}</span>
                </button>

                {/* Expanded Hotspot Card */}
                {activeHotspot === idx && (
                  <div className="absolute top-10 left-0 w-72 bg-black/90 backdrop-blur-2xl border border-white/20 p-4 rounded-2xl shadow-2xl z-30">
                    <div className="text-[10px] font-mono text-[#F59E0B] uppercase tracking-wider mb-1">
                      {ch.hotspot.coords}
                    </div>
                    <div className="text-xs font-bold text-white mb-1">
                      {ch.hotspot.title}
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed mb-3">
                      {ch.hotspot.detail}
                    </p>
                    <Link
                      to={ch.primaryCtaLink}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F59E0B] hover:underline"
                    >
                      <span>Explore this waypoint</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* ─── 7. EDITORIAL CONTENT OVERLAY (MARLIN DESIGN ARCHITECTURE) ─── */}
        <div className="relative z-30 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 pb-14 flex flex-col justify-end">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            {/* Left Column: Massive Editorial Headlines & Search */}
            <div className="lg:col-span-8">
              {/* Animated Accent Line & Tag */}
              <div className="flex items-center gap-3 mb-3">
                <span className="w-10 h-[2px] bg-[#F59E0B]" />
                <span className="text-xs uppercase tracking-[0.28em] font-bold text-[#F59E0B]">
                  {currentChapter.tag}
                </span>
                <span className="text-white/20">•</span>
                <span className="text-xs font-mono text-gray-400">
                  {currentChapter.terrain}
                </span>
              </div>

              {/* Huge Bold Display Typography */}
              <h1 className="font-sans text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.04] drop-shadow-2xl transition-all duration-500 max-w-2xl">
                {currentChapter.title}
              </h1>

              {/* Expedition Search Bar */}
              <form
                onSubmit={handleSearch}
                className="mt-7 relative max-w-xl flex items-center bg-black/70 backdrop-blur-2xl border border-white/20 rounded-2xl p-2 shadow-2xl focus-within:border-[#F59E0B] transition-all"
              >
                <div className="pl-4 pr-3 text-[#F59E0B]">
                  <Compass className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Search 50+ trails, summits, cafes, or hidden waterfalls..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-white placeholder-gray-400 text-sm focus:outline-none pr-3"
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shrink-0"
                >
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Quick Tags */}
              <div className="flex flex-wrap gap-2 mt-3.5 text-xs text-gray-400">
                <span className="text-gray-500">Trending Routes:</span>
                {['Western Ghats', 'Skandagiri Sunrise', 'Muthyala Maduvu', 'Savandurga 4x4'].map(
                  (tag) => (
                    <button
                      key={tag}
                      onClick={() => navigate(`/explore?q=${encodeURIComponent(tag)}`)}
                      className="hover:text-[#F59E0B] transition-colors underline-offset-4 hover:underline"
                    >
                      #{tag.replace(/\s+/g, '')}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Right Column: Narrative, CTA & Scroll Scrub Prompt */}
            <div className="lg:col-span-4 flex flex-col justify-end">
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6 font-normal drop-shadow-md">
                {currentChapter.description}
              </p>

              <div className="flex items-center gap-4">
                <Link
                  to={currentChapter.primaryCtaLink}
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-white border-b-2 border-[#F59E0B] pb-1 hover:text-[#F59E0B] transition-colors"
                >
                  <span>{currentChapter.primaryCtaText}</span>
                  <ChevronRight className="w-4 h-4 text-[#F59E0B]" />
                </Link>

                <button
                  onClick={() => scrollToChapter((activeChapterIndex + 1) % 4)}
                  className="p-2.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/15 text-white transition-colors"
                  title="Next Chapter Waypoint"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Scroll To Drive Dynamic Indicator */}
              <div className="mt-8 flex items-center gap-3 text-[11px] font-mono uppercase tracking-widest text-gray-400">
                <div className="w-5 h-8 rounded-full border-2 border-white/30 flex items-start justify-center p-1">
                  <div className="w-1.5 h-2 bg-[#F59E0B] rounded-full animate-bounce" />
                </div>
                <span>
                  {p > 0.92 ? 'Expedition Complete • Scroll for Waypoints' : 'Scroll Wheel to Drive 4x4'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 8. MARLIN VERTICAL CHAPTER SCRUBBER (RIGHT EDGE) ─── */}
        <div className="absolute right-6 sm:right-10 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-6">
          {CINEMATIC_CHAPTERS.map((ch, idx) => {
            const isActive = idx === activeChapterIndex;
            const chapterStart = idx * 0.25;
            const chapterEnd = (idx + 1) * 0.25;
            let fillPct = 0;
            if (p >= chapterEnd) fillPct = 100;
            else if (p > chapterStart) {
              fillPct = Math.round(((p - chapterStart) / 0.25) * 100);
            }

            return (
              <button
                key={ch.id}
                onClick={() => scrollToChapter(idx)}
                className="group flex items-center gap-3 text-right focus:outline-none"
              >
                {/* Chapter name tooltip */}
                <span
                  className={`text-[10px] uppercase tracking-widest transition-all duration-300 hidden md:inline-block ${
                    isActive
                      ? 'text-[#F59E0B] font-bold opacity-100 translate-x-0'
                      : 'text-gray-400 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0'
                  }`}
                >
                  {ch.tag}
                </span>

                {/* Chapter Number & Progress Fill */}
                <div className="flex items-center gap-2">
                  <div
                    className={`font-mono text-sm sm:text-base font-bold transition-all duration-300 ${
                      isActive
                        ? 'text-[#F59E0B] scale-125'
                        : 'text-gray-500 hover:text-gray-300 scale-100'
                    }`}
                  >
                    {ch.number}
                  </div>

                  {/* Vertical Progress Pip with Exact Fill */}
                  <div className="w-1.5 h-6 rounded-full bg-white/10 overflow-hidden relative">
                    <div
                      className="w-full bg-[#F59E0B] transition-all duration-150"
                      style={{ height: `${fillPct}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ─── 9. EXPEDITION JOURNEY PROGRESS HAIRLINE (BOTTOM EDGE) ─── */}
        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/10 z-40">
          <div
            className="h-full bg-gradient-to-r from-[#F59E0B] via-amber-400 to-[#F97316] transition-all duration-100 shadow-[0_0_10px_#F59E0B]"
            style={{ width: `${Math.round(p * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
