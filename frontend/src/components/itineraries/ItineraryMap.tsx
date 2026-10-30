import React, { useEffect, useRef, useState } from 'react';
import type { ItineraryStop } from '../../types';
import { MapPin, MapPinOff } from 'lucide-react';
import { coordsFromMapLink } from '../../utils/mapLink';

interface ItineraryMapProps {
  stops: ItineraryStop[];
  activeStopId?: number | null;
  onSelectStop?: (stop: ItineraryStop) => void;
  className?: string;
}

declare global {
  interface Window {
    L: any;
  }
}

// Resilient coordinate extractor: checks latitude/longitude, or extracts from Google Maps link
export const getStopCoords = (stop: ItineraryStop): [number, number] | null => {
  const dest = stop.destination;
  if (!dest) return null;

  if (
    typeof dest.latitude === 'number' &&
    typeof dest.longitude === 'number' &&
    !isNaN(dest.latitude) &&
    !isNaN(dest.longitude) &&
    (dest.latitude !== 0 || dest.longitude !== 0)
  ) {
    return [dest.latitude, dest.longitude];
  }

  // Graceful fallback: extract from map_link URL
  return coordsFromMapLink(dest.map_link);
};

// The navbar's jeep, drawn facing right with its wheels on the route line
const CAR_SVG = `
  <svg viewBox="-15 -20 30 20" width="42" height="28" style="overflow:visible">
    <ellipse cx="0" cy="-1" rx="12" ry="1.6" fill="#10272B" opacity="0.22" />
    <rect x="-13.5" y="-10.5" width="2.4" height="5" rx="1" fill="#16353A" />
    <rect x="-11.5" y="-11.5" width="23" height="6.5" rx="2" fill="#2A7C84" stroke="#fff" stroke-width="0.6" />
    <path d="M -8 -11.5 L -6 -16.5 L 3.5 -16.5 L 6 -11.5 Z" fill="#2A7C84" stroke="#fff" stroke-width="0.6" />
    <path d="M -5.2 -12.2 L -4 -15.3 L 2.6 -15.3 L 4.3 -12.2 Z" fill="#BFE6E8" opacity="0.9" />
    <rect x="-6.5" y="-18" width="9.5" height="1.2" rx="0.6" fill="#16353A" />
    <circle cx="10.6" cy="-8.6" r="1.2" fill="#F2C94C" />
    <circle cx="-6.5" cy="-4.2" r="2.9" fill="#10272B" />
    <circle cx="-6.5" cy="-4.2" r="1.1" fill="#C9D4D2" />
    <circle cx="6.5" cy="-4.2" r="2.9" fill="#10272B" />
    <circle cx="6.5" cy="-4.2" r="1.1" fill="#C9D4D2" />
  </svg>
`;

const SECONDS_PER_LEG = 2.8; // average drive time between two stops
const END_PAUSE = 1.2; // seconds parked at the last stop before looping

export const ItineraryMap: React.FC<ItineraryMapProps> = ({
  stops,
  activeStopId,
  onSelectStop,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Dynamic injection of Leaflet CSS & JS
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    const scriptId = 'leaflet-js';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.onload = () => setLeafletLoaded(true);
      document.head.appendChild(script);
    } else {
      const existingScript = document.getElementById(scriptId) as HTMLScriptElement;
      existingScript.addEventListener('load', () => setLeafletLoaded(true));
    }
  }, []);

  // Initialize and update Map when Leaflet is ready or stops change
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || !window.L) return;

    const L = window.L;

    // Filter and resolve coordinates for every stop
    const stopsWithCoords = stops
      .map((s, idx) => ({ stop: s, coords: getStopCoords(s), originalIndex: idx }))
      .filter((item): item is { stop: ItineraryStop; coords: [number, number]; originalIndex: number } => item.coords !== null);

    // Initial center
    const defaultCenter: [number, number] = [12.9716, 77.5946]; // Bengaluru default
    const initialCenter = stopsWithCoords.length > 0 ? stopsWithCoords[0].coords : defaultCenter;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 13,
        zoomControl: false,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear old markers and polyline
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (stopsWithCoords.length === 0) return;

    const latLngs: [number, number][] = [];

    stopsWithCoords.forEach(({ stop, coords, originalIndex }) => {
      const [lat, lng] = coords;
      latLngs.push([lat, lng]);

      const isCurrentActive = activeStopId === stop.id;

      // Custom styled HTML marker badge
      const markerHtml = `
        <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-110">
          <div class="w-8 h-8 rounded-full ${
            isCurrentActive ? 'bg-[#E05A47] text-white ring-4 ring-[#E05A47]/30' : 'bg-[#102A2E] text-[#F3EFE6]'
          } font-bold text-xs flex items-center justify-center shadow-lg border-2 border-white">
            ${originalIndex + 1}
          </div>
          <div class="absolute -bottom-1.5 w-2 h-2 rotate-45 ${
            isCurrentActive ? 'bg-[#E05A47]' : 'bg-[#102A2E]'
          }"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-itinerary-pin',
        iconSize: [32, 38],
        iconAnchor: [16, 38],
        popupAnchor: [0, -36],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      const dest = stop.destination;

      // Popup with destination info, note, and directions
      const popupContent = `
        <div class="p-1 max-w-[220px] font-sans">
          ${
            dest?.image_url
              ? `<img src="${dest.image_url}" alt="${dest.name}" class="w-full h-24 object-cover rounded-xl mb-2" />`
              : ''
          }
          <div class="font-bold text-sm text-[#102A2E]">${dest?.name || 'Waypoint'}</div>
          <div class="text-[11px] text-[#6E7B78] uppercase tracking-wider mb-1">${dest?.category || 'Stop'}</div>
          ${
            stop.note
              ? `<div class="text-xs bg-[#F5ECE0] text-[#733E2B] p-1.5 rounded-lg my-1 font-medium">💡 ${stop.note}</div>`
              : ''
          }
          ${
            stop.transport_mode
              ? `<div class="text-[11px] text-[#2C5D63] font-medium mt-1">🚗 Next: ${stop.transport_mode}</div>`
              : ''
          }
          <div class="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" rel="noopener noreferrer" class="text-[#E05A47] hover:underline font-semibold flex items-center gap-1">
              Directions ↗
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { closeButton: false });

      marker.on('click', () => {
        if (onSelectStop) onSelectStop(stop);
      });

      markersRef.current.push(marker);
    });

    // Draw route connecting polyline
    if (latLngs.length > 1) {
      const polyline = L.polyline(latLngs, {
        color: '#E05A47',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8',
        lineCap: 'round',
      }).addTo(map);

      polylineRef.current = polyline;
    }

    // Auto-fit bounds smoothly so all pins are centered in view!
    if (latLngs.length > 0) {
      if (latLngs.length === 1) {
        map.setView(latLngs[0], 14, { animate: true });
      } else {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 15,
          animate: true,
        });
      }
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 250);
  }, [leafletLoaded, stops, activeStopId]);

  // Jeep that drives the route 1 → 2 → … → last on a loop. Kept separate from the
  // marker effect so selecting a stop doesn't restart the drive.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!leafletLoaded || !map || !window.L) return;
    const L = window.L;

    const route = stops.map(getStopCoords).filter((c): c is [number, number] => c !== null);
    if (route.length < 2) return;

    // Interpolate in projected (Web Mercator) space so the jeep stays exactly on the drawn line
    const crs = map.options.crs;
    const points = route.map((c) => crs.project(L.latLng(c)));
    const legLengths = points.slice(1).map((p: any, i: number) => p.distanceTo(points[i]));
    const total = legLengths.reduce((a: number, b: number) => a + b, 0);
    if (total === 0) return;
    const driveTime = SECONDS_PER_LEG * legLengths.length;

    const car = L.marker(route[0], {
      icon: L.divIcon({
        html: `<div class="route-car" style="transform-origin:50% 92%;pointer-events:none">${CAR_SVG}</div>`,
        className: 'route-car-icon',
        iconSize: [42, 28],
        iconAnchor: [21, 26],
      }),
      interactive: false,
      keyboard: false,
      zIndexOffset: 500,
    }).addTo(map);

    const placeCar = (distance: number) => {
      let leg = 0;
      while (leg < legLengths.length - 1 && distance > legLengths[leg]) {
        distance -= legLengths[leg];
        leg++;
      }
      const a = points[leg];
      const b = points[leg + 1];
      const t = legLengths[leg] ? Math.min(distance / legLengths[leg], 1) : 1;
      car.setLatLng(crs.unproject(L.point(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)));

      // Face the direction of travel: mirror when heading west, tilt with the slope
      const dx = b.x - a.x;
      const screenDy = -(b.y - a.y); // projected y points north, screen y points down
      const tilt = (Math.atan2(screenDy, Math.abs(dx)) * 180) / Math.PI;
      const el = car.getElement()?.querySelector('.route-car') as HTMLElement | null;
      if (el) el.style.transform = dx < 0 ? `rotate(${-tilt}deg) scaleX(-1)` : `rotate(${tilt}deg)`;
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      placeCar(0);
      return () => car.remove();
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = ((now - start) / 1000) % (driveTime + END_PAUSE);
      const progress = Math.min(elapsed / driveTime, 1);
      placeCar(progress * total);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      car.remove();
    };
  }, [leafletLoaded, stops]);

  const unmapped = stops
    .map((stop, i) => ({ stop, number: i + 1, name: stop.destination?.name ?? 'Unnamed stop' }))
    .filter(({ stop }) => !getStopCoords(stop));

  return (
    <div className={`relative rounded-3xl overflow-hidden border border-line shadow-sm ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px] bg-[#E7E2D8]" />

      {!leafletLoaded && (
        <div className="absolute inset-0 bg-sand/70 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex items-center gap-2 text-ink font-semibold text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            Loading route map…
          </div>
        </div>
      )}

      {unmapped.length > 0 && leafletLoaded && (
        <div className="absolute top-4 left-4 right-4 z-[500] w-fit max-w-[calc(100%-2rem)] bg-paper/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-line text-xs text-muted flex items-start gap-2 shadow-sm">
          <MapPinOff className="w-4 h-4 text-accent shrink-0" />
          <span>
            {unmapped.length === 1
              ? `Stop ${unmapped[0].number} · ${unmapped[0].name} isn't on the map yet: no location saved.`
              : `Stops ${unmapped.map((u) => u.number).join(', ')} aren't on the map yet: no location saved.`}
          </span>
        </div>
      )}

      {stops.length === 0 && leafletLoaded && (
        <div className="absolute top-4 left-4 z-20 bg-paper/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-line text-xs text-muted flex items-center gap-2 shadow-sm">
          <MapPin className="w-4 h-4 text-accent" />
          No stops added yet. Admins can add places to chart the route!
        </div>
      )}
    </div>
  );
};
