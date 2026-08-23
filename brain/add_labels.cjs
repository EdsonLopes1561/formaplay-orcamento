const fs = require('fs');
const data = JSON.parse(fs.readFileSync('c:/Users/FAMÍLIA-LOPES/.antigravity-ide/formaplay-orcamento/src/assets/data/brasil_estados.json', 'utf8'));

// Hardcoded safe offsets for tiny/complex states
const overrides = {
  'DF': { lng: -47.86, lat: -15.79 },
  'RJ': { lng: -42.6, lat: -22.0 },
  'ES': { lng: -40.3, lat: -19.6 },
  'AL': { lng: -36.6, lat: -9.5 },
  'SE': { lng: -37.4, lat: -10.6 },
  'PE': { lng: -37.9, lat: -8.3 },
  'PB': { lng: -36.5, lat: -7.1 },
  'RN': { lng: -36.6, lat: -5.7 }
};

function getBounds(coords, bounds = { minLng: 180, maxLng: -180, minLat: 90, maxLat: -90 }) {
  if (Array.isArray(coords)) {
    if (coords.length === 2 && typeof coords[0] === 'number') {
      const [lng, lat] = coords;
      if (lng < bounds.minLng) bounds.minLng = lng;
      if (lng > bounds.maxLng) bounds.maxLng = lng;
      if (lat < bounds.minLat) bounds.minLat = lat;
      if (lat > bounds.maxLat) bounds.maxLat = lat;
      return bounds;
    }
    coords.forEach(c => getBounds(c, bounds));
  }
  return bounds;
}

data.features.forEach(f => {
  const uf = f.properties.uf;
  if (overrides[uf]) {
    f.properties.labelLng = overrides[uf].lng;
    f.properties.labelLat = overrides[uf].lat;
  } else {
    const bounds = getBounds(f.geometry.coordinates);
    f.properties.labelLng = (bounds.minLng + bounds.maxLng) / 2;
    f.properties.labelLat = (bounds.minLat + bounds.maxLat) / 2;
  }
});

fs.writeFileSync('c:/Users/FAMÍLIA-LOPES/.antigravity-ide/formaplay-orcamento/src/assets/data/brasil_estados.json', JSON.stringify(data, null, 2));
console.log('Labels added successfully!');
