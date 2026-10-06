import { NextResponse } from 'next/server';

// In-memory cache to prevent redundant lookups for nearby coordinates
// Key is lat,lon rounded to ~11 meters (4 decimal places)
const geoCache = new Map<string, { address: string; timestamp: number }>();

function buildCleanAddress(parts: (string | undefined | null)[]): string {
  const result: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    const trimmed = part.trim();
    if (!trimmed) continue;
    // Prevent duplicate adjacent or redundant substrings
    const isDuplicate = result.some(
      (existing) =>
        existing.toLowerCase() === trimmed.toLowerCase() ||
        existing.toLowerCase().includes(trimmed.toLowerCase()) ||
        trimmed.toLowerCase().includes(existing.toLowerCase())
    );
    if (!isDuplicate) {
      result.push(trimmed);
    }
  }
  return result.join(', ');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon') || searchParams.get('lng');

  if (!latStr || !lonStr) {
    return NextResponse.json(
      { error: 'Thiếu tham số tọa độ lat và lon' },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: 'Tọa độ không hợp lệ' },
      { status: 400 }
    );
  }

  // Cache key rounded to ~11 meters (4 decimal places)
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = geoCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 1000 * 60 * 60) {
    return NextResponse.json({ address: cached.address, source: 'cache' });
  }

  // 1. Primary: Photon (OSM search engine - high precision Vietnamese street and house numbers)
  try {
    const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`;
    const photonRes = await fetch(photonUrl, {
      headers: { 'Accept-Language': 'vi,en;q=0.9' },
      signal: AbortSignal.timeout(3500),
    });

    if (photonRes.ok) {
      const data = await photonRes.json();
      const props = data?.features?.[0]?.properties;
      if (props) {
        let streetPart = props.street;
        if (props.housenumber && streetPart) {
          streetPart = `${props.housenumber} ${streetPart}`;
        } else if (!streetPart && props.name) {
          streetPart = props.name;
        }

        const districtPart = props.district || props.locality;
        const cityPart = props.city || props.state;

        const address = buildCleanAddress([streetPart, districtPart, cityPart]);
        if (address.length > 3) {
          geoCache.set(cacheKey, { address, timestamp: Date.now() });
          return NextResponse.json({
            address,
            source: 'photon',
            street: streetPart,
            district: districtPart,
            city: cityPart,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[Geo Reverse] Photon lookup error:', err);
  }

  // 2. Secondary: BigDataCloud Client Reverse Geocode API (fast, reliable administrative boundary lookup)
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=vi`;
    const bdcRes = await fetch(bdcUrl, {
      headers: { 'Accept-Language': 'vi,en;q=0.9' },
      signal: AbortSignal.timeout(3500),
    });

    if (bdcRes.ok) {
      const data = await bdcRes.json();
      const address = buildCleanAddress([
        data.locality,
        data.city !== data.locality ? data.city : null,
        data.principalSubdivision !== data.city ? data.principalSubdivision : null,
      ]);

      if (address.length > 3) {
        geoCache.set(cacheKey, { address, timestamp: Date.now() });
        return NextResponse.json({
          address,
          source: 'bigdatacloud',
          district: data.locality,
          city: data.principalSubdivision || data.city,
        });
      }
    }
  } catch (bdcErr) {
    console.warn('[Geo Reverse] BigDataCloud error:', bdcErr);
  }

  // 3. Tertiary: OpenStreetMap Nominatim API
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=vi`;
    const osmRes = await fetch(osmUrl, {
      headers: {
        'User-Agent': 'ChiLeOrderApp/1.0 (contact@chile.vn)',
        'Accept-Language': 'vi,en;q=0.9',
      },
      signal: AbortSignal.timeout(3500),
    });

    if (osmRes.ok) {
      const data = await osmRes.json();
      const addr = data.address || {};
      const street = addr.road || addr.street || addr.pedestrian || addr.amenity;
      const ward = addr.suburb || addr.quarter || addr.neighbourhood;
      const district = addr.city_district || addr.district || addr.county || addr.town;
      const city = addr.city || addr.state || addr.province;

      const address = buildCleanAddress([street, ward, district, city]);
      if (address.length > 3) {
        geoCache.set(cacheKey, { address, timestamp: Date.now() });
        return NextResponse.json({
          address,
          source: 'nominatim',
          street,
          ward,
          district,
          city,
        });
      }
    }
  } catch (osmErr) {
    console.warn('[Geo Reverse] Nominatim error:', osmErr);
  }

  // 4. Clean Fallback Coordinates
  const fallbackAddress = `Vị trí tọa độ: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  return NextResponse.json({
    address: fallbackAddress,
    source: 'coordinates_fallback',
  });
}
