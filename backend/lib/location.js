const CITY_KEYS = ['city', 'town', 'village', 'municipality', 'county']
const STATE_KEYS = ['state', 'region', 'province', 'state_district']

function firstValue(source, keys) {
  for (const key of keys) {
    const value = source?.[key]
    if (value) return String(value)
  }
  return ''
}

export function validateCoordinates(latitude, longitude) {
  const lat = Number(latitude)
  const lon = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw Object.assign(new Error('Las coordenadas no son válidas.'), { status: 400 })
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw Object.assign(new Error('Las coordenadas están fuera del rango permitido.'), { status: 400 })
  }
  return { latitude: lat, longitude: lon }
}

export function coarseLocationFromNominatim(payload) {
  const address = payload?.address || {}
  return {
    city: firstValue(address, CITY_KEYS),
    state: firstValue(address, STATE_KEYS),
    country: address.country ? String(address.country) : '',
    countryCode: address.country_code ? String(address.country_code).toUpperCase() : '',
    displayName: [
      firstValue(address, CITY_KEYS),
      firstValue(address, STATE_KEYS),
      address.country ? String(address.country) : '',
    ].filter(Boolean).join(', '),
    precision: 'city-region-country',
    source: 'OpenStreetMap Nominatim',
  }
}
