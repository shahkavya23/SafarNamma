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

      // OSM tiles, softened and warmed to the sand palette via the .sn-map-tiles filter
      // (CARTO's free raster tiles now demand an API key, so they're not an option)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        className: 'sn-map-tiles',
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
      // White casing under a solid coral line so the route reads cleanly on any terrain
      const casing = L.polyline(latLngs, { color: '#fff', weight: 9, opacity: 0.9, lineCap: 'round', lineJoin: 'round' });
      const line = L.polyline(latLngs, { color: '#E05A47', weight: 4.5, opacity: 1, lineCap: 'round', lineJoin: 'round' });
      const polyline = L.featureGroup([casing, line]).addTo(map);

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
