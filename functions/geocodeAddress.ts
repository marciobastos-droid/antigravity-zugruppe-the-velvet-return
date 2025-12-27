import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { address, city, state, country, postalCode } = await req.json();

    if (!address && !city) {
      return Response.json({ 
        error: 'At least address or city is required' 
      }, { status: 400 });
    }

    // Build search query
    const parts = [];
    if (address) parts.push(address);
    if (postalCode) parts.push(postalCode);
    if (city) parts.push(city);
    if (state) parts.push(state);
    if (country) parts.push(country);
    
    const searchQuery = parts.join(', ');

    // Use Nominatim (OpenStreetMap) for geocoding - free and no API key required
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`;

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'ZugrupeApp/1.0' // Required by Nominatim
      }
    });

    if (!response.ok) {
      return Response.json({ 
        error: 'Geocoding service unavailable' 
      }, { status: 503 });
    }

    const results = await response.json();

    if (!results || results.length === 0) {
      return Response.json({ 
        success: false,
        message: 'Address not found',
        suggestions: []
      });
    }

    const result = results[0];

    return Response.json({
      success: true,
      coordinates: {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon)
      },
      formattedAddress: result.display_name,
      details: {
        address: result.address?.road || address,
        city: result.address?.city || result.address?.town || result.address?.village || city,
        state: result.address?.state || state,
        country: result.address?.country || country,
        postalCode: result.address?.postcode || postalCode
      },
      confidence: result.importance || 0
    });

  } catch (error) {
    console.error('Error geocoding address:', error);
    return Response.json({ 
      error: error.message || 'Failed to geocode address' 
    }, { status: 500 });
  }
});