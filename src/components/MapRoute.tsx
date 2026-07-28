import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GpxRoute } from '../types';

interface MapRouteProps {
  route: GpxRoute;
  height?: string | number;
  interactive?: boolean;
  emptyMessage?: string;
}

/**
 * Lightweight Leaflet map renderer for a GPX route.
 * Uses OpenStreetMap tiles (free, no API key required).
 *
 * We use vanilla Leaflet (instead of react-leaflet) to avoid
 * version coupling issues and keep the bundle small.
 */
export default function MapRoute({ route, height = 280, interactive = true, emptyMessage = 'Sin puntos GPX para mostrar' }: MapRouteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || route.points.length === 0) return;

    // Initialize map only once
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear existing layers (except tile layer)
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    // Build polyline
    const latlngs = route.points.map((p) => [p.lat, p.lng] as [number, number]);
    const polyline = L.polyline(latlngs, {
      color: '#0A84FF',
      weight: 4,
      opacity: 0.9,
    }).addTo(map);

    // Start & end markers
    const start = route.points[0];
    const end = route.points[route.points.length - 1];

    const makeIcon = (color: string, label: string) =>
      L.divIcon({
        className: '',
        html: `<div style="background:${color};color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5);">${label}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

    L.marker([start.lat, start.lng], { icon: makeIcon('#16a34a', 'A') }).addTo(map);
    L.marker([end.lat, end.lng], { icon: makeIcon('#dc2626', 'B') }).addTo(map);

    // Fit bounds
    map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

    // Make sure leaflet recomputes size after first render in container
    setTimeout(() => map.invalidateSize(), 100);
  }, [route, interactive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (route.points.length === 0) {
    return (
      <div
        className="rounded-[14px] flex items-center justify-center bg-surface-2 text-muted text-[13px] border border-app"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-lg overflow-hidden"
      style={{ height, width: '100%' }}
    />
  );
}
