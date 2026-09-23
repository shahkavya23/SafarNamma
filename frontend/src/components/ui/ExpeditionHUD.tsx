import React, { useEffect, useState } from 'react';

interface ExpeditionHUDProps {
  /** Scroll progress 0.0 to 1.0 */
  progress: number;
  /** Scroll velocity */
  velocity: number;
  /** Waypoint labels and their trigger progress values */
  waypoints?: { label: string; at: number }[];
  /** Whether headlights are on */
  headlightsOn?: boolean;
  /** Callback to toggle headlights */
  onToggleHeadlights?: () => void;
}

/**
 * Floating glassmorphic Expedition Cluster overlay.
 * Shows odometer, compass, altitude, route progress, and headlight toggle.
 * Styled like a vintage Jeep instrument cluster.
 */
export const ExpeditionHUD: React.FC<ExpeditionHUDProps> = ({
  progress,
  velocity,
  waypoints = [],
  headlightsOn = true,
  onToggleHeadlights,
}) => {
  const [displayKm, setDisplayKm] = useState('0.0');
  const [bearing, setBearing] = useState('N');
  const [altitude, setAltitude] = useState(920);

  // Animate odometer
  useEffect(() => {
    const km = (progress * 48.5).toFixed(1); // Total "trip" is 48.5 KM
    setDisplayKm(km);
  }, [progress]);

  // Compute compass bearing based on progress
  useEffect(() => {
    const bearings = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.floor(progress * 8) % 8;
    setBearing(bearings[index]);
  }, [progress]);

  // Altitude (rises in the mountain section: 75%-90%)
  useEffect(() => {
    if (progress > 0.75) {
      const mountainProgress = Math.min(1, (progress - 0.75) / 0.15);
      setAltitude(Math.round(920 + mountainProgress * 558)); // 920m → 1478m
    } else {
      setAltitude(920);
    }
  }, [progress]);

  const speed = Math.abs(velocity * 2.5);

  return (
    <div className="fixed bottom-6 right-6 z-40 pointer-events-auto">
      <div className="glass-dark rounded-2xl px-5 py-4 shadow-2xl min-w-[260px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F59E0B]">
            SafarNamma Expedition
          </span>
          {/* Headlight toggle */}
          <button
            onClick={onToggleHeadlights}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              headlightsOn 
                ? 'bg-[#F59E0B] text-[#071E22] shadow-lg shadow-[#F59E0B]/40' 
                : 'bg-white/10 text-white/40'
            }`}
            title="Toggle Headlights"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          </button>
        </div>

        {/* Instrument Row */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {/* Odometer */}
          <div className="text-center">
            <p className="text-white font-mono text-lg font-bold tabular-nums">
              {displayKm}
            </p>
            <p className="text-white/40 text-[9px] uppercase tracking-wider">KM</p>
          </div>

          {/* Speed */}
          <div className="text-center border-x border-white/10">
            <p className="text-white font-mono text-lg font-bold tabular-nums">
              {speed.toFixed(0)}
            </p>
            <p className="text-white/40 text-[9px] uppercase tracking-wider">KM/H</p>
          </div>

          {/* Compass */}
          <div className="text-center">
            <p className="text-[#F59E0B] font-mono text-lg font-bold">
              {bearing}
            </p>
            <p className="text-white/40 text-[9px] uppercase tracking-wider">DIR</p>
          </div>
        </div>

        {/* Altitude */}
        <div className="flex items-center justify-between text-[10px] mb-3 px-1">
          <span className="text-white/50">
            🏔 Alt: <span className="text-white font-mono">{altitude}m</span>
          </span>
          <span className="text-white/50">
            📍 Bengaluru
          </span>
        </div>

        {/* Route Progress Bar */}
        <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#F59E0B] to-[#EA580C] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
          {/* Waypoint dots */}
          {waypoints.map((wp, i) => (
            <div
              key={i}
              className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 transition-all ${
                progress >= wp.at
                  ? 'bg-[#F59E0B] border-[#F59E0B] scale-110'
                  : 'bg-transparent border-white/30'
              }`}
              style={{ left: `${wp.at * 100}%`, transform: 'translate(-50%, -50%)' }}
              title={wp.label}
            />
          ))}
        </div>

        {/* Waypoint Labels */}
        <div className="flex justify-between mt-1.5 text-[8px] text-white/30 font-medium">
          {waypoints.map((wp, i) => (
            <span
              key={i}
              className={`transition-colors ${progress >= wp.at ? 'text-[#F59E0B]' : ''}`}
            >
              {wp.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
