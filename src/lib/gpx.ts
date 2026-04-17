import { GpxPoint, GpxRoute } from '../types';

/**
 * Parse a GPX file (XML string) into a route with points.
 * Supports trkpt and rtept tags.
 */
export function parseGpx(xmlString: string): GpxRoute | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) return null;

    // Extract name
    const nameEl = doc.querySelector('trk > name, rte > name, metadata > name');
    const name = nameEl?.textContent?.trim() || undefined;

    // Get all track points or route points
    let pointEls = Array.from(doc.querySelectorAll('trkpt'));
    if (pointEls.length === 0) {
      pointEls = Array.from(doc.querySelectorAll('rtept'));
    }
    if (pointEls.length === 0) {
      pointEls = Array.from(doc.querySelectorAll('wpt'));
    }
    if (pointEls.length === 0) return null;

    const points: GpxPoint[] = pointEls.map((el) => {
      const lat = parseFloat(el.getAttribute('lat') || '0');
      const lng = parseFloat(el.getAttribute('lon') || '0');
      const eleEl = el.querySelector('ele');
      const timeEl = el.querySelector('time');
      const point: GpxPoint = { lat, lng };
      if (eleEl?.textContent) point.ele = parseFloat(eleEl.textContent);
      if (timeEl?.textContent) point.time = timeEl.textContent;
      return point;
    });

    // Optional: simplify if too many points (>2000 to keep things fast)
    let finalPoints = points;
    if (points.length > 2000) {
      const step = Math.ceil(points.length / 2000);
      finalPoints = points.filter((_, i) => i % step === 0);
    }

    // Calculate distance and elevation gain
    let distanceKm = 0;
    let elevationGain = 0;
    for (let i = 1; i < finalPoints.length; i++) {
      distanceKm += haversine(finalPoints[i - 1], finalPoints[i]);
      if (
        finalPoints[i].ele !== undefined &&
        finalPoints[i - 1].ele !== undefined
      ) {
        const diff = (finalPoints[i].ele as number) - (finalPoints[i - 1].ele as number);
        if (diff > 0) elevationGain += diff;
      }
    }

    return {
      name,
      points: finalPoints,
      distanceKm: Math.round(distanceKm * 100) / 100,
      elevationGain: Math.round(elevationGain),
    };
  } catch {
    return null;
  }
}

function haversine(a: GpxPoint, b: GpxPoint): number {
  const R = 6371; // km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}
