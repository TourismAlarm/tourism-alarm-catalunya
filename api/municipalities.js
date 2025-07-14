export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const mockData = [
      {
        "municipi": "Barcelona",
        "comarca": "Barcelonès",
        "poblacio": 1620343,
        "visitants_anuals": 15000000,
        "ratio_turistes": 9.25,
        "alertLevel": "high",
        "lat": 41.3851,
        "lng": 2.1734
      },
      {
        "municipi": "Girona",
        "comarca": "Gironès", 
        "poblacio": 103369,
        "visitants_anuals": 2500000,
        "ratio_turistes": 24.19,
        "alertLevel": "critical",
        "lat": 41.9794,
        "lng": 2.8214
      },
      {
        "municipi": "Tarragona",
        "comarca": "Tarragonès",
        "poblacio": 134515,
        "visitants_anuals": 1200000,
        "ratio_turistes": 8.92,
        "alertLevel": "medium", 
        "lat": 41.1189,
        "lng": 1.2445
      }
    ];

    res.status(200).json({
      success: true,
      count: mockData.length,
      data: mockData,
      timestamp: new Date().toISOString(),
      source: "mock_data"
    });

  } catch (error) {
    console.error('Error en municipalities API:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}