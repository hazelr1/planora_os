/**
 * Minimal routing helper using OSRM public endpoint.
 * Input: array of [lat, lon] pairs
 */
export async function getRoute(coords: [number, number][]) {
  if (!coords || coords.length < 2) return null;
  // OSRM expects lon,lat pairs
  const coordStr = coords.map(([lat, lon]) => `${lon},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const geom = json.routes?.[0]?.geometry;
    if (!geom) return null;
    // Return array of [lat, lon]
    return geom.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
  } catch (e) {
    return null;
  }
}
