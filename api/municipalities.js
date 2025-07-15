// api/municipalities.js
// API endpoint con debugging para detectar el problema

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { debug } = req.query;
    
    // Modo debug para ver qué está pasando
    if (debug === 'true') {
      try {
        const testResponse = await fetch('https://api.idescat.cat/emex/v1/nodes.json?tipus=mun');
        const responseText = await testResponse.text();
        
        return res.status(200).json({
          debug: true,
          idescat_status: testResponse.status,
          idescat_ok: testResponse.ok,
          response_length: responseText.length,
          response_preview: responseText.substring(0, 500),
          headers: Object.fromEntries(testResponse.headers.entries())
        });
      } catch (fetchError) {
        return res.status(200).json({
          debug: true,
          error: fetchError.message,
          stack: fetchError.stack
        });
      }
    }

    // Por ahora, devolver datos hardcodeados de todos los municipios principales
    const municipiosData = [
      // Capitals de província
      { id: "080193", name: "Barcelona", comarca: "Barcelonès", poblacio: 1620343, visitants_anuals: 15000000, ratio_turistes: 9.25, alertLevel: "critical" },
      { id: "170792", name: "Girona", comarca: "Gironès", poblacio: 103369, visitants_anuals: 2500000, ratio_turistes: 24.19, alertLevel: "critical" },
      { id: "431481", name: "Tarragona", comarca: "Tarragonès", poblacio: 134515, visitants_anuals: 1200000, ratio_turistes: 8.92, alertLevel: "high" },
      { id: "250907", name: "Lleida", comarca: "Segrià", poblacio: 140403, visitants_anuals: 800000, ratio_turistes: 5.69, alertLevel: "medium" },
      
      // Ciutats importants
      { id: "081691", name: "Sabadell", comarca: "Vallès Occidental", poblacio: 216520, visitants_anuals: 650000, ratio_turistes: 3.00, alertLevel: "medium" },
      { id: "082009", name: "Terrassa", comarca: "Vallès Occidental", poblacio: 223627, visitants_anuals: 670000, ratio_turistes: 3.00, alertLevel: "medium" },
      { id: "080736", name: "Badalona", comarca: "Barcelonès", poblacio: 223166, visitants_anuals: 446332, ratio_turistes: 2.00, alertLevel: "low" },
      { id: "081013", name: "L'Hospitalet de Llobregat", comarca: "Barcelonès", poblacio: 264923, visitants_anuals: 529846, ratio_turistes: 2.00, alertLevel: "low" },
      { id: "081234", name: "Mataró", comarca: "Maresme", poblacio: 129661, visitants_anuals: 648305, ratio_turistes: 5.00, alertLevel: "medium" },
      { id: "432038", name: "Reus", comarca: "Baix Camp", poblacio: 106168, visitants_anuals: 530840, ratio_turistes: 5.00, alertLevel: "medium" },
      
      // Destinacions turístiques Costa Brava
      { id: "171521", name: "Roses", comarca: "Alt Empordà", poblacio: 20359, visitants_anuals: 1500000, ratio_turistes: 73.68, alertLevel: "critical" },
      { id: "170235", name: "Blanes", comarca: "Selva", poblacio: 40020, visitants_anuals: 2000000, ratio_turistes: 49.98, alertLevel: "critical" },
      { id: "170629", name: "Castell-Platja d'Aro", comarca: "Baix Empordà", poblacio: 11045, visitants_anuals: 800000, ratio_turistes: 72.46, alertLevel: "critical" },
      { id: "171032", name: "Lloret de Mar", comarca: "Selva", poblacio: 40942, visitants_anuals: 3500000, ratio_turistes: 85.50, alertLevel: "critical" },
      { id: "171394", name: "Palafrugell", comarca: "Baix Empordà", poblacio: 23481, visitants_anuals: 1200000, ratio_turistes: 51.10, alertLevel: "critical" },
      { id: "172023", name: "Tossa de Mar", comarca: "Selva", poblacio: 5564, visitants_anuals: 500000, ratio_turistes: 89.90, alertLevel: "critical" },
      { id: "170266", name: "Begur", comarca: "Baix Empordà", poblacio: 4008, visitants_anuals: 300000, ratio_turistes: 74.85, alertLevel: "critical" },
      { id: "170481", name: "Cadaqués", comarca: "Alt Empordà", poblacio: 2962, visitants_anuals: 250000, ratio_turistes: 84.40, alertLevel: "critical" },
      
      // Destinacions turístiques Costa Daurada
      { id: "431713", name: "Salou", comarca: "Tarragonès", poblacio: 28563, visitants_anuals: 2500000, ratio_turistes: 87.52, alertLevel: "critical" },
      { id: "430385", name: "Cambrils", comarca: "Baix Camp", poblacio: 34169, visitants_anuals: 1800000, ratio_turistes: 52.68, alertLevel: "critical" },
      { id: "432094", name: "Sitges", comarca: "Garraf", poblacio: 29577, visitants_anuals: 2000000, ratio_turistes: 67.62, alertLevel: "critical" },
      { id: "430065", name: "Calafell", comarca: "Baix Penedès", poblacio: 28055, visitants_anuals: 1400000, ratio_turistes: 49.90, alertLevel: "critical" },
      
      // Pirineus
      { id: "250209", name: "La Seu d'Urgell", comarca: "Alt Urgell", poblacio: 12252, visitants_anuals: 300000, ratio_turistes: 24.49, alertLevel: "high" },
      { id: "252230", name: "Vielha e Mijaran", comarca: "Val d'Aran", poblacio: 5477, visitants_anuals: 400000, ratio_turistes: 73.05, alertLevel: "critical" },
      { id: "170110", name: "Puigcerdà", comarca: "Cerdanya", poblacio: 9335, visitants_anuals: 280000, ratio_turistes: 30.00, alertLevel: "high" },
      
      // Pobles petits turístics
      { id: "081381", name: "Montserrat", comarca: "Bages", poblacio: 695, visitants_anuals: 3000000, ratio_turistes: 4316.55, alertLevel: "critical" },
      { id: "432051", name: "Rupit i Pruit", comarca: "Osona", poblacio: 280, visitants_anuals: 150000, ratio_turistes: 535.71, alertLevel: "critical" },
      { id: "170433", name: "Besalú", comarca: "Garrotxa", poblacio: 2472, visitants_anuals: 200000, ratio_turistes: 80.91, alertLevel: "critical" },
      { id: "171282", name: "Peratallada", comarca: "Baix Empordà", poblacio: 368, visitants_anuals: 100000, ratio_turistes: 271.74, alertLevel: "critical" },
      
      // Altres municipis
      { id: "080569", name: "Cornellà de Llobregat", comarca: "Baix Llobregat", poblacio: 89936, visitants_anuals: 179872, ratio_turistes: 2.00, alertLevel: "low" },
      { id: "082136", name: "Sant Cugat del Vallès", comarca: "Vallès Occidental", poblacio: 92977, visitants_anuals: 185954, ratio_turistes: 2.00, alertLevel: "low" },
      { id: "081819", name: "Sant Boi de Llobregat", comarca: "Baix Llobregat", poblacio: 84500, visitants_anuals: 169000, ratio_turistes: 2.00, alertLevel: "low" },
      { id: "081691", name: "Rubí", comarca: "Vallès Occidental", poblacio: 78591, visitants_anuals: 157182, ratio_turistes: 2.00, alertLevel: "low" },
      { id: "083078", name: "Viladecans", comarca: "Baix Llobregat", poblacio: 67197, visitants_anuals: 134394, ratio_turistes: 2.00, alertLevel: "low" },
      { id: "080892", name: "El Prat de Llobregat", comarca: "Baix Llobregat", poblacio: 65385, visitants_anuals: 130770, ratio_turistes: 2.00, alertLevel: "low" },
      { id: "080774", name: "Castelldefels", comarca: "Baix Llobregat", poblacio: 67460, visitants_anuals: 337300, ratio_turistes: 5.00, alertLevel: "medium" },
      { id: "081138", name: "Manresa", comarca: "Bages", poblacio: 78245, visitants_anuals: 234735, ratio_turistes: 3.00, alertLevel: "medium" },
      { id: "083076", name: "Vilanova i la Geltrú", comarca: "Garraf", poblacio: 67733, visitants_anuals: 338665, ratio_turistes: 5.00, alertLevel: "medium" },
      { id: "080735", name: "Granollers", comarca: "Vallès Oriental", poblacio: 62419, visitants_anuals: 124838, ratio_turistes: 2.00, alertLevel: "low" }
    ];

    const { limit = 20, offset = 0, search, comarca } = req.query;
    
    let filteredMunicipios = [...municipiosData];
    
    // Filtrar por búsqueda
    if (search) {
      const searchLower = search.toLowerCase();
      filteredMunicipios = filteredMunicipios.filter(m => 
        m.name.toLowerCase().includes(searchLower) ||
        m.comarca.toLowerCase().includes(searchLower)
      );
    }
    
    // Filtrar por comarca
    if (comarca) {
      filteredMunicipios = filteredMunicipios.filter(m => 
        m.comarca.toLowerCase() === comarca.toLowerCase()
      );
    }
    
    // Aplicar paginación
    const total = filteredMunicipios.length;
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedMunicipios = filteredMunicipios.slice(startIndex, endIndex);
    
    return res.status(200).json({
      success: true,
      count: paginatedMunicipios.length,
      total: total,
      data: paginatedMunicipios,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: endIndex < total
      },
      timestamp: new Date().toISOString(),
      source: "hardcoded_data"
    });

  } catch (error) {
    console.error('Error en municipalities API:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}