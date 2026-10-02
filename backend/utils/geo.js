// Haversine distance in kilometers between two lat/lng points.
// Not used by any route yet (no professionals have coordinates in the sandbox seed),
// but kept ready so "nearby" / "radius" endpoints can filter by distance immediately
// once coordinates are populated, without further backend changes.
function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { distanceKm };
