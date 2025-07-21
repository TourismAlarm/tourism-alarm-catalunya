// api/municipios.js
// Endpoint para obtener municipios turísticos con datos reales de IDESCAT
// Updated: 21-07-2025
export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('📍 Cargando municipios turísticos principales...');
    
    // Lista de municipios turísticos clave con sus códigos INE
    const MUNICIPIOS_TURISTICOS = [
      { id: '080193', name: 'Barcelona', tourism_score: 9.8, coastal: false, mountain: false },
      { id: '082704', name: 'Sitges', tourism_score: 8.5, coastal: true, mountain: false },
      { id: '170792', name: 'Girona', tourism_score: 7.2, coastal: false, mountain: false },
      { id: '431482', name: 'Tarragona', tourism_score: 7.5, coastal: true, mountain: false },
      { id: '251207', name: 'Lleida', tourism_score: 5.5, coastal: false, mountain: false },
      { id: '439057', name: 'Salou', tourism_score: 9.0, coastal: true, mountain: false },
      { id: '172023', name: 'Tossa de Mar', tourism_score: 8.0, coastal: true, mountain: false },
      { id: '170340', name: 'Calonge i Sant Antoni', tourism_score: 7.8, coastal: true, mountain: false },
      { id: '171523', name: 'Roses', tourism_score: 8.2, coastal: true, mountain: false },
      { id: '171479', name: 'Ripoll', tourism_score: 6.5, coastal: false, mountain: true },
      { id: '080155', name: 'Badalona', tourism_score: 6.0, coastal: true, mountain: false },
      { id: '171411', name: 'Puigcerdà', tourism_score: 7.0, coastal: false, mountain: true },
      { id: '082649', name: 'Sant Vicenç de Montalt', tourism_score: 6.8, coastal: true, mountain: false },
      { id: '430141', name: 'Amposta', tourism_score: 5.5, coastal: false, mountain: false },
      { id: '171655', name: 'Sant Joan de les Abadesses', tourism_score: 6.2, coastal: false, mountain: true },
      { id: '170499', name: 'Celrà', tourism_score: 5.0, coastal: false, mountain: false },
      { id: '082606', name: 'Santa Perpètua de Mogoda', tourism_score: 4.5, coastal: false, mountain: false },
      { id: '081022', name: 'Igualada', tourism_score: 5.2, coastal: false, mountain: false },
      { id: '080630', name: 'Esplugues de Llobregat', tourism_score: 5.8, coastal: false, mountain: false },
      { id: '081213', name: 'Mataró', tourism_score: 6.5, coastal: true, mountain: false }
    ];
    
    // Obtener datos de población de IDESCAT
    const url = `https://api.idescat.cat/emex/v1/dades.json?i=f171&lang=ca`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`IDESCAT API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Procesar datos para cada municipio
    const municipalitiesWithData = MUNICIPIOS_TURISTICOS.map(mun => {
      // Buscar el municipio en los datos de IDESCAT
      const municipalities = data.fitxes.cols.col;
      const municipalityIndex = municipalities.findIndex(
        m => m.id === mun.id && m.scheme === 'mun'
      );
      
      if (municipalityIndex === -1) {
        console.warn(`⚠️ Municipio ${mun.name} (${mun.id}) no encontrado`);
        return {
          ...mun,
          population: 0,
          density: 0,
          area_km2: 0,
          latitude: 41.3851, // Coordenadas por defecto (Barcelona)
          longitude: 2.1734
        };
      }
      
      // Obtener datos del municipio
      const municipalityData = municipalities[municipalityIndex];
      const values = data.fitxes.indicadors.i.v.split(',');
      const population = parseInt(values[municipalityIndex]) || 0;
      
      // Coordenadas aproximadas
      const coords = getCoordinatesForMunicipality(mun.id);
      
      return {
        id: mun.id,
        name: municipalityData.content,
        population: population,
        area_km2: getAreaForMunicipality(mun.id),
        density: Math.round(population / getAreaForMunicipality(mun.id)),
        latitude: coords.lat,
        longitude: coords.lng,
        tourism_score: mun.tourism_score,
        coastal: mun.coastal,
        mountain: mun.mountain,
        comarca: getComarcaForMunicipality(mun.id),
        province: getProvinceForMunicipality(mun.id)
      };
    });
    
    console.log(`✅ Cargados ${municipalitiesWithData.length} municipios`);
    
    return res.status(200).json({
      success: true,
      data: municipalitiesWithData,
      total: municipalitiesWithData.length,
      source: 'IDESCAT',
      lastUpdate: data.fitxes.indicadors.i.updated
    });
    
  } catch (error) {
    console.error('❌ Error en /api/municipios:', error);
    
    // En caso de error, devolver datos de respaldo
    return res.status(200).json({
      success: true,
      data: getFallbackData(),
      total: 20,
      source: 'fallback',
      error: error.message
    });
  }
}

// FUNCIONES HELPER
function getCoordinatesForMunicipality(id) {
  const coords = {
    '080193': { lat: 41.3851, lng: 2.1734 },    // Barcelona
    '082704': { lat: 41.2372, lng: 1.8059 },    // Sitges
    '170792': { lat: 41.9794, lng: 2.8214 },    // Girona
    '431482': { lat: 41.1189, lng: 1.2445 },    // Tarragona
    '251207': { lat: 41.6148, lng: 0.6218 },    // Lleida
    '439057': { lat: 41.0763, lng: 1.1419 },    // Salou
    '172023': { lat: 41.7218, lng: 2.9307 },    // Tossa de Mar
    '170340': { lat: 41.8931, lng: 3.1639 },    // Calonge
    '171523': { lat: 42.2639, lng: 3.1770 },    // Roses
    '171479': { lat: 42.3139, lng: 2.3655 },    // Ripoll
    '080155': { lat: 41.4470, lng: 2.2450 },    // Badalona
    '171411': { lat: 42.4474, lng: 1.9286 },    // Puigcerdà
    '082649': { lat: 41.5881, lng: 2.5153 },    // Sant Vicenç de Montalt
    '430141': { lat: 40.7125, lng: 0.5816 },    // Amposta
    '171655': { lat: 42.2129, lng: 2.2909 },    // Sant Joan de les Abadesses
    '170499': { lat: 42.0131, lng: 2.7898 },    // Celrà
    '082606': { lat: 41.4874, lng: 2.1060 },    // Santa Perpètua
    '081022': { lat: 41.5789, lng: 1.6175 },    // Igualada
    '080630': { lat: 41.3745, lng: 2.0920 },    // Esplugues
    '081213': { lat: 41.5362, lng: 2.4445 }     // Mataró
  };
  return coords[id] || { lat: 41.3851, lng: 2.1734 };
}

function getAreaForMunicipality(id) {
  const areas = {
    '080193': 101.4,  // Barcelona
    '082704': 43.8,   // Sitges
    '170792': 39.1,   // Girona
    '431482': 55.0,   // Tarragona
    '251207': 211.7,  // Lleida
    '439057': 15.1,   // Salou
    '172023': 5.9,    // Tossa de Mar
    '170340': 33.4,   // Calonge
    '171523': 45.9,   // Roses
    '171479': 36.3,   // Ripoll
    '080155': 21.2,   // Badalona
    '171411': 19.9,   // Puigcerdà
    '082649': 8.0,    // Sant Vicenç
    '430141': 137.3,  // Amposta
    '171655': 53.2,   // Sant Joan
    '170499': 19.5,   // Celrà
    '082606': 15.8,   // Santa Perpètua
    '081022': 8.1,    // Igualada
    '080630': 4.6,    // Esplugues
    '081213': 22.5    // Mataró
  };
  return areas[id] || 50;
}

function getComarcaForMunicipality(id) {
  const comarcas = {
    '080193': 'Barcelonès',
    '082704': 'Garraf',
    '170792': 'Gironès',
    '431482': 'Tarragonès',
    '251207': 'Segrià',
    '439057': 'Tarragonès',
    '172023': 'Selva',
    '170340': 'Baix Empordà',
    '171523': 'Alt Empordà',
    '171479': 'Ripollès',
    '080155': 'Barcelonès',
    '171411': 'Cerdanya',
    '082649': 'Maresme',
    '430141': 'Montsià',
    '171655': 'Ripollès',
    '170499': 'Gironès',
    '082606': 'Vallès Occidental',
    '081022': 'Anoia',
    '080630': 'Baix Llobregat',
    '081213': 'Maresme'
  };
  return comarcas[id] || 'N/A';
}

function getProvinceForMunicipality(id) {
  const firstTwo = id.substring(0, 2);
  switch(firstTwo) {
    case '08': return 'Barcelona';
    case '17': return 'Girona';
    case '25': return 'Lleida';
    case '43': return 'Tarragona';
    default: return 'Catalunya';
  }
}

function getFallbackData() {
  return [
    { id: '080193', name: 'Barcelona', population: 1620343, area_km2: 101.4, density: 15979, latitude: 41.3851, longitude: 2.1734, tourism_score: 9.8, coastal: false, mountain: false, comarca: 'Barcelonès', province: 'Barcelona' },
    { id: '170792', name: 'Girona', population: 103369, area_km2: 39.1, density: 2644, latitude: 41.9794, longitude: 2.8214, tourism_score: 7.2, coastal: false, mountain: false, comarca: 'Gironès', province: 'Girona' }
  ];
}