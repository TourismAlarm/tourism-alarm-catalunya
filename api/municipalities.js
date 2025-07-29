// =================================================================
// TOURISM ALARM - API MUNICIPIOS ESCALABLE
// Versión 2.0 - Arquitectura completamente refactorizada
// Escalable a toda España (8,131 municipios)
// =================================================================

// Configuración regional escalable
const REGION_CONFIGS = {
  catalunya: {
    totalMunicipalities: 947,
    bounds: { minLat: 40.5, maxLat: 42.9, minLng: 0.1, maxLng: 3.4 },
    provinces: {
      barcelona: { code: '08', weight: 0.43, centerLat: 41.65, centerLng: 1.95 },
      girona: { code: '17', weight: 0.26, centerLat: 42.10, centerLng: 2.75 },
      lleida: { code: '25', weight: 0.19, centerLat: 41.85, centerLng: 1.15 },
      tarragona: { code: '43', weight: 0.13, centerLat: 41.35, centerLng: 1.45 }
    }
  }
};

class ScalableMunicipalitiesGenerator {
  constructor(region = 'catalunya') {
    this.region = region;
    this.config = REGION_CONFIGS[region];
    if (!this.config) {
      throw new Error(`Región ${region} no configurada`);
    }
  }

  // Método principal: generar todos los municipios de la región
  generateAllMunicipalities() {
    console.log(`🏗️ Generando ${this.config.totalMunicipalities} municipios para ${this.region}...`);
    
    const municipalities = {};
    let municipalityCounter = 1;

    // Generar municipios por provincia proporcionalmente
    Object.entries(this.config.provinces).forEach(([provinceName, provinceConfig]) => {
      const municipalitiesInProvince = Math.round(
        this.config.totalMunicipalities * provinceConfig.weight
      );
      
      console.log(`📍 Generando ${municipalitiesInProvince} municipios para ${provinceName}`);
      
      for (let i = 0; i < municipalitiesInProvince; i++) {
        const coordinates = this.generateValidCoordinates(provinceConfig);
        const municipalityId = this.generateMunicipalityId(provinceConfig.code, municipalityCounter);
        
        municipalities[municipalityId] = [
          parseFloat(coordinates.lat.toFixed(4)),
          parseFloat(coordinates.lng.toFixed(4))
        ];
        
        municipalityCounter++;
      }
    });

    // Completar hasta el total exacto si hay diferencias por redondeo
    while (Object.keys(municipalities).length < this.config.totalMunicipalities) {
      const randomProvince = this.getRandomProvince();
      const coordinates = this.generateValidCoordinates(randomProvince);
      const municipalityId = this.generateMunicipalityId(randomProvince.code, municipalityCounter);
      
      municipalities[municipalityId] = [
        parseFloat(coordinates.lat.toFixed(4)),
        parseFloat(coordinates.lng.toFixed(4))
      ];
      
      municipalityCounter++;
    }

    console.log(`✅ Generados ${Object.keys(municipalities).length} municipios`);
    return municipalities;
  }

  // Generar coordenadas válidas dentro de la provincia
  generateValidCoordinates(provinceConfig) {
    let lat, lng;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      // Generar cerca del centro de la provincia con distribución normal
      const latOffset = this.gaussianRandom() * 0.5; // ±0.5 grados
      const lngOffset = this.gaussianRandom() * 0.5;
      
      lat = provinceConfig.centerLat + latOffset;
      lng = provinceConfig.centerLng + lngOffset;
      
      attempts++;
    } while (
      !this.isWithinRegionBounds(lat, lng) && 
      attempts < maxAttempts
    );

    // Si no se encuentran coordenadas válidas, usar el centro de la provincia
    if (attempts >= maxAttempts) {
      lat = provinceConfig.centerLat;
      lng = provinceConfig.centerLng;
    }

    return { lat, lng };
  }

// Validar que las coordenadas están dentro de los límites de la región
isWithinRegionBounds(lat, lng) {
  // Bounds básicos primero (optimización)
  const bounds = this.config.bounds;
  if (!(lat >= bounds.minLat && lat <= bounds.maxLat &&
        lng >= bounds.minLng && lng <= bounds.maxLng)) {
    return false;
  }
  
  // VALIDACIÓN CRÍTICA: Polígono preciso de Catalunya
  const CATALUNYA_POLYGON = [
    [42.86, 3.33], [42.79, 3.17], [42.52, 3.15], [42.47, 2.87],
    [42.31, 2.31], [42.39, 1.73], [42.52, 1.74], [42.60, 1.45],
    [42.59, 0.73], [42.52, 0.15], [41.75, 0.15], [41.59, 0.22],
    [40.98, 0.32], [40.52, 0.87], [40.52, 1.58], [40.76, 2.82],
    [41.06, 3.33], [42.86, 3.33]
  ];
  
  // Algoritmo ray-casting para validación poligonal
  let inside = false;
  for (let i = 0, j = CATALUNYA_POLYGON.length - 1; i < CATALUNYA_POLYGON.length; j = i++) {
    const [xi, yi] = CATALUNYA_POLYGON[i];
    const [xj, yj] = CATALUNYA_POLYGON[j];
    
    if (((yi > lng) !== (yj > lng)) && 
        (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  // Validación adicional: no está en zonas problemáticas
  if (inside) {
    // Evitar zona marina del Mediterráneo
    if (lng > 3.0 && lat > 40.5 && lat < 42.5) return false;
    
    // Evitar zona frontera Francia
    if (lat > 42.7 && lng > 1.5 && lng < 3.0) return false;
  }
  
  return inside;
}

  // Generar distribución normal (Gaussiana) para coordenadas más realistas
  gaussianRandom() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  // Generar ID único para municipio
  generateMunicipalityId(provinceCode, counter) {
    return provinceCode + counter.toString().padStart(5, '0');
  }

  // Seleccionar provincia aleatoria basada en pesos
  getRandomProvince() {
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (const [name, config] of Object.entries(this.config.provinces)) {
      cumulativeWeight += config.weight;
      if (random <= cumulativeWeight) {
        return config;
      }
    }
    
    return Object.values(this.config.provinces)[0];
  }

  // Generar datos turísticos algorítmicos consistentes
  generateTourismData(lat, lng, municipalityId) {
    const seed = this.hashCode(municipalityId);
    const rng = this.seededRandom(seed);
    
    const isCoastal = this.isCoastalLocation(lat, lng);
    const isMountain = this.isMountainLocation(lat);
    const distanceToBarcelona = this.calculateDistance(lat, lng, 41.3851, 2.1734);
    
    let tourismScore = 50;
    
    if (isCoastal) tourismScore += 20;
    if (isMountain) tourismScore += 15;
    if (distanceToBarcelona < 50) tourismScore += 10;
    
    tourismScore += (rng() - 0.5) * 30;
    tourismScore = Math.max(0, Math.min(100, Math.round(tourismScore)));
    
    return {
      tourism_score: tourismScore,
      coastal: isCoastal,
      mountain: isMountain,
      distance_to_capital: Math.round(distanceToBarcelona)
    };
  }

  // Obtener nombre de provincia desde ID
  getProvinceNameFromId(id) {
    const provinceCode = id.substring(0, 2);
    switch(provinceCode) {
      case '08': return 'Barcelona';
      case '17': return 'Girona';
      case '25': return 'Lleida';
      case '43': return 'Tarragona';
      default: return 'Catalunya';
    }
  }

  // Funciones auxiliares
  isCoastalLocation(lat, lng) {
    return lng > 2.0 && lat > 40.5 && lat < 42.5;
  }

  isMountainLocation(lat) {
    return lat > 42.0;
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI/180);
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  seededRandom(seed) {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
}

// =================================================================
// ENDPOINT PRINCIPAL DE LA API
// =================================================================

export default async function handler(req, res) {
  try {
    const { limit = 50, offset = 0, region = 'catalunya' } = req.query;
    
    console.log(`🔄 Generando municipios: limit=${limit}, offset=${offset}, region=${region}`);
    
    // Generar municipios con el algoritmo escalable
    const generator = new ScalableMunicipalitiesGenerator(region);
    const allCoordinates = generator.generateAllMunicipalities();
    
    // Convertir a formato de la API
    const allMunicipalities = Object.entries(allCoordinates).map(([id, coords]) => {
      const [latitude, longitude] = coords;
      const tourismData = generator.generateTourismData(latitude, longitude, id);
      
      return {
        id,
        name: `Municipio ${id}`,
        latitude,
        longitude,
        ...tourismData,
        population: Math.round(1000 + Math.random() * 50000),
        provincia: generator.getProvinceNameFromId(id),
        density: tourismData.tourism_score * 2.5 // Para compatibilidad con heatmap
      };
    });

    // Paginación
    const startIndex = parseInt(offset);
    const endIndex = Math.min(startIndex + parseInt(limit), allMunicipalities.length);
    const paginatedData = allMunicipalities.slice(startIndex, endIndex);

    console.log(`✅ API devolviendo ${paginatedData.length} municipios de ${allMunicipalities.length} totales`);

    res.status(200).json({
      success: true,
      data: paginatedData,
      pagination: {
        total: allMunicipalities.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: endIndex < allMunicipalities.length
      },
      metadata: {
        region: region,
        generated_with: 'ScalableMunicipalitiesGenerator v2.0',
        architecture: 'Algoritmo uniforme escalable',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error generando municipios:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}