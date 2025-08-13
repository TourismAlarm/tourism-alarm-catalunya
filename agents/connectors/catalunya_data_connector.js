class CatalunyaDataConnector {
    constructor() {
        this.cache = new Map();
        this.cacheExpiration = 24 * 60 * 60 * 1000; // 24 horas
    }

    async getMunicipalityData() {
        const cacheKey = 'municipalities_full_data';
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiration) {
            return cached.data;
        }

        try {
            // 1. Datos básicos de IDESCAT API oficial
            const response = await fetch(
                'https://api.idescat.cat/emex/v1/nodes.json?tipus=mun'
            );
            const apiData = await response.json();
            const municipalities = this.transformIdeData(apiData);
            
            // 2. Completar con municipios importantes que faltan
            this.addMissingImportantMunicipalities(municipalities);
            
            // 3. Enriquecer con datos básicos (población simulada por ahora)
            for (const muni of municipalities) {
                // Población simulada basada en código para pruebas
                muni.population = this.simulatePopulation(muni.codi_ine, muni.nom_municipi);
                muni.area_km2 = parseFloat(muni.superficie) || this.simulateArea(muni.nom_municipi);
                muni.density = muni.area_km2 > 0 ? muni.population / muni.area_km2 : 0;
                
                // 4. Calcular capacidad turística
                muni.tourist_capacity = this.calculateTouristCapacity(muni);
                muni.tourism_pressure = this.calculateTourismPressure(muni);
            }
            
            // Cachear resultados
            this.cache.set(cacheKey, {
                data: municipalities,
                timestamp: Date.now()
            });
            
            return municipalities;
        } catch (error) {
            console.error('Error fetching Catalunya municipality data:', error);
            throw error;
        }
    }

    transformIdeData(apiData) {
        // Transformar datos de IDESCAT API al formato esperado
        if (!apiData?.fitxes?.v) return [];
        
        return apiData.fitxes.v.map(node => {
            const coordinates = this.getRealCoordinates(node.id, node.content);
            return {
                codi_ine: node.id,
                nom_municipi: node.content,
                superficie: 0, // Se obtendrá posteriormente
                comarca: 'Unknown',
                provincia: this.getProvinciaFromCode(node.id),
                lat: coordinates.lat,
                lng: coordinates.lng
            };
        });
    }

    getProvinciaFromCode(codiINE) {
        if (!codiINE) return 'Unknown';
        const prefix = codiINE.substring(0, 2);
        switch(prefix) {
            case '08': return 'Barcelona';
            case '17': return 'Girona'; 
            case '25': return 'Lleida';
            case '43': return 'Tarragona';
            default: return 'Unknown';
        }
    }

    addMissingImportantMunicipalities(municipalities) {
        // Municipios importantes que siempre deben estar presentes
        const importantMunicipalities = [
            // Capitales provinciales
            { codi_ine: '170792', nom_municipi: 'Girona', provincia: 'Girona' },
            { codi_ine: '431481', nom_municipi: 'Tarragona', provincia: 'Tarragona' },
            { codi_ine: '250907', nom_municipi: 'Lleida', provincia: 'Lleida' },
            { codi_ine: '432038', nom_municipi: 'Reus', provincia: 'Tarragona' },
            
            // Costa Brava importantes
            { codi_ine: '171032', nom_municipi: 'Lloret de Mar', provincia: 'Girona' },
            { codi_ine: '170235', nom_municipi: 'Blanes', provincia: 'Girona' },
            { codi_ine: '172023', nom_municipi: 'Tossa de Mar', provincia: 'Girona' },
            { codi_ine: '171521', nom_municipi: 'Roses', provincia: 'Girona' },
            { codi_ine: '170629', nom_municipi: 'Castell-Platja d\'Aro', provincia: 'Girona' },
            
            // Costa Daurada importantes
            { codi_ine: '431713', nom_municipi: 'Salou', provincia: 'Tarragona' },
            { codi_ine: '430385', nom_municipi: 'Cambrils', provincia: 'Tarragona' },
            
            // Pirineus importantes
            { codi_ine: '252077', nom_municipi: 'Tremp', provincia: 'Lleida' },
            { codi_ine: '251902', nom_municipi: 'La Seu d\'Urgell', provincia: 'Lleida' },
        ];
        
        // Verificar qué municipios faltan y añadirlos
        importantMunicipalities.forEach(important => {
            const exists = municipalities.find(m => m.codi_ine === important.codi_ine);
            if (!exists) {
                const coordinates = this.getRealCoordinates(important.codi_ine, important.nom_municipi);
                municipalities.push({
                    codi_ine: important.codi_ine,
                    nom_municipi: important.nom_municipi,
                    superficie: 0,
                    comarca: 'Unknown',
                    provincia: important.provincia,
                    lat: coordinates.lat,
                    lng: coordinates.lng
                });
            }
        });
        
        // Generar municipios adicionales para completar las 4 provincias
        this.generateAdditionalMunicipalities(municipalities);
    }

    generateAdditionalMunicipalities(municipalities) {
        const currentCount = municipalities.length;
        const targetCount = Math.min(947, currentCount + 200); // Añadir hasta 200 más
        
        // Contadores por provincia para distribución equilibrada
        const provinceCounts = {
            'Barcelona': municipalities.filter(m => m.provincia === 'Barcelona').length,
            'Girona': municipalities.filter(m => m.provincia === 'Girona').length,
            'Tarragona': municipalities.filter(m => m.provincia === 'Tarragona').length,
            'Lleida': municipalities.filter(m => m.provincia === 'Lleida').length
        };
        
        console.log('🏛️ Distribución actual por provincia:', provinceCounts);
        
        let currentId = 900000; // IDs ficticios para municipios adicionales
        
        // Generar municipios adicionales para equilibrar provincias
        for (let i = currentCount; i < targetCount; i++) {
            const provincia = this.selectProvinceToBalance(provinceCounts);
            const coordinates = this.generateRealisticCoordinates(provincia);
            
            municipalities.push({
                codi_ine: currentId.toString(),
                nom_municipi: `${provincia} ${currentId - 900000 + 1}`,
                superficie: 0,
                comarca: `Comarca ${provincia}`,
                provincia: provincia,
                lat: coordinates.lat,
                lng: coordinates.lng
            });
            
            provinceCounts[provincia]++;
            currentId++;
        }
        
        console.log('🏛️ Distribución final por provincia:', provinceCounts);
    }

    selectProvinceToBalance(provinceCounts) {
        // Seleccionar la provincia con menos municipios para balancear
        const sorted = Object.entries(provinceCounts).sort((a, b) => a[1] - b[1]);
        
        // Dar preferencia a las provincias con menos representación
        const weights = {
            [sorted[0][0]]: 0.4, // La menos representada: 40%
            [sorted[1][0]]: 0.3, // Segunda menos: 30%
            [sorted[2][0]]: 0.2, // Tercera: 20%
            [sorted[3][0]]: 0.1  // La más representada: 10%
        };
        
        const random = Math.random();
        let cumulative = 0;
        
        for (const [provincia, weight] of Object.entries(weights)) {
            cumulative += weight;
            if (random <= cumulative) {
                return provincia;
            }
        }
        
        return 'Barcelona'; // Fallback
    }

    getRealCoordinates(codiINE, nom_municipi) {
        // Base de datos de coordenadas reales de municipios Catalunya
        const realCoordinates = {
            // Municipios principales con coordenadas exactas
            '080193': { lat: 41.3851, lng: 2.1734 }, // Barcelona
            '170792': { lat: 41.9794, lng: 2.8214 }, // Girona
            '431481': { lat: 41.1189, lng: 1.2445 }, // Tarragona
            '250907': { lat: 41.6176, lng: 0.6200 }, // Lleida
            '432038': { lat: 41.1557, lng: 1.1067 }, // Reus (ID correcto)
            '431233': { lat: 41.1557, lng: 1.1067 }, // Reus (ID IDESCAT)
            '081691': { lat: 41.5431, lng: 2.1094 }, // Sabadell
            '082009': { lat: 41.5640, lng: 2.0110 }, // Terrassa
            '080736': { lat: 41.4502, lng: 2.2470 }, // Badalona
            '081013': { lat: 41.3596, lng: 2.1000 }, // L'Hospitalet
            '081234': { lat: 41.5342, lng: 2.4458 }, // Mataró
            
            // Costa Brava
            '171032': { lat: 41.6991, lng: 2.8458 }, // Lloret de Mar
            '170235': { lat: 41.6751, lng: 2.7972 }, // Blanes  
            '172023': { lat: 41.7194, lng: 2.9311 }, // Tossa de Mar
            '171521': { lat: 42.2627, lng: 3.1766 }, // Roses
            '170629': { lat: 41.8161, lng: 3.0674 }, // Castell-Platja d'Aro
            '171394': { lat: 41.9167, lng: 3.1667 }, // Palafrugell
            '170266': { lat: 41.9553, lng: 3.2094 }, // Begur
            '170481': { lat: 42.2889, lng: 3.2794 }, // Cadaqués
            
            // Costa Daurada  
            '431713': { lat: 41.0772, lng: 1.1395 }, // Salou
            '430385': { lat: 41.0664, lng: 1.0606 }, // Cambrils
            
            // Pirineus
            '252077': { lat: 42.1667, lng: 0.8833 }, // Tremp
            '171640': { lat: 42.4297, lng: 1.7333 }, // Puigcerdà
            '251902': { lat: 42.3583, lng: 0.7000 }, // La Seu d'Urgell
        };
        
        // Si tenemos coordenadas exactas, las usamos
        if (realCoordinates[codiINE]) {
            return realCoordinates[codiINE];
        }
        
        // Si no, generar coordenadas realistas según la provincia
        const provincia = this.getProvinciaFromCode(codiINE);
        return this.generateRealisticCoordinates(provincia, nom_municipi);
    }

    generateRealisticCoordinates(provincia, municipalityName) {
        // Generar coordenadas realistas según la provincia
        let latRange, lngRange;
        
        switch(provincia) {
            case 'Barcelona':
                latRange = [41.2, 41.8]; // Área metropolitana de Barcelona
                lngRange = [1.8, 2.5];
                break;
            case 'Girona':
                latRange = [41.6, 42.5]; // Norte Catalunya, Costa Brava
                lngRange = [2.4, 3.3];
                break;
            case 'Tarragona':
                latRange = [40.5, 41.4]; // Sur Catalunya, Costa Daurada  
                lngRange = [0.8, 1.5];
                break;
            case 'Lleida':
                latRange = [41.4, 42.9]; // Interior, Pirineos
                lngRange = [0.6, 1.8];
                break;
            default:
                latRange = [41.3, 41.7]; // Centro Catalunya por defecto
                lngRange = [1.5, 2.5];
        }
        
        // Generar coordenadas dentro del rango realista
        const lat = latRange[0] + Math.random() * (latRange[1] - latRange[0]);
        const lng = lngRange[0] + Math.random() * (lngRange[1] - lngRange[0]);
        
        return { 
            lat: Math.round(lat * 10000) / 10000, 
            lng: Math.round(lng * 10000) / 10000 
        };
    }

    simulatePopulation(codiINE, nom_municipi) {
        // Simular población realista basada en el código INE y nombre
        if (!codiINE) return 1000;
        
        const name = nom_municipi?.toLowerCase() || '';
        let basePopulation = 2000;
        
        // Ciudades grandes conocidas
        if (name.includes('barcelona')) basePopulation = 1600000;
        else if (name.includes('hospitalet')) basePopulation = 260000;
        else if (name.includes('terrassa')) basePopulation = 210000;
        else if (name.includes('badalona')) basePopulation = 220000;
        else if (name.includes('sabadell')) basePopulation = 210000;
        else if (name.includes('girona')) basePopulation = 100000;
        else if (name.includes('lleida')) basePopulation = 138000;
        else if (name.includes('tarragona')) basePopulation = 135000;
        else if (name.includes('matar')) basePopulation = 125000;
        
        // Simulación por código INE (más realista)
        const lastDigits = parseInt(codiINE.slice(-2)) || 1;
        return Math.floor(basePopulation * (0.1 + (lastDigits / 100)));
    }

    simulateArea(nom_municipi) {
        // Simular área en km² basada en nombre del municipio
        const name = nom_municipi?.toLowerCase() || '';
        let baseArea = 15; // km² promedio
        
        // Ciudades grandes
        if (name.includes('barcelona')) return 101.4;
        if (name.includes('lleida')) return 212.3;
        if (name.includes('girona')) return 39.1;
        if (name.includes('tarragona')) return 62.8;
        
        // Área simulada
        return baseArea + Math.random() * 50;
    }

    async getPopulation(codiINE) {
        if (!codiINE) return 0;
        
        const cacheKey = `population_${codiINE}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiration) {
            return cached.data;
        }

        try {
            // API de población IDESCAT
            const response = await fetch(
                `https://api.idescat.cat/emex/v1/dades.json?id=${codiINE}&i=46`
            );
            const populationData = await response.json();
            
            const population = populationData?.dades?.[0]?.Valor ? 
                parseInt(populationData.dades[0].Valor) || 0 : 0;
            
            this.cache.set(cacheKey, {
                data: population,
                timestamp: Date.now()
            });
            
            return population;
        } catch (error) {
            console.warn(`Error fetching population for ${codiINE}:`, error);
            return 0;
        }
    }

    calculateTouristCapacity(muni) {
        const { population, area_km2, nom_municipi } = muni;
        
        // Factores base
        const populationFactor = Math.sqrt(population || 1);
        const areaFactor = Math.log(area_km2 + 1);
        
        // Factores específicos por tipo de municipio
        let typeMultiplier = 1.0;
        const municipalityName = (nom_municipi || '').toLowerCase();
        
        // Costa (multiplicador alto)
        if (this.isCoastalMunicipality(municipalityName)) {
            typeMultiplier = 2.5;
        }
        // Montaña/Pirineos (multiplicador medio-alto)  
        else if (this.isMountainMunicipality(municipalityName)) {
            typeMultiplier = 1.8;
        }
        // Capital provincial (multiplicador alto)
        else if (this.isCapitalMunicipality(municipalityName)) {
            typeMultiplier = 2.2;
        }
        // Rural (multiplicador bajo)
        else if (population < 2000) {
            typeMultiplier = 0.8;
        }
        
        // Cálculo final de capacidad turística
        const baseCapacity = populationFactor * areaFactor * typeMultiplier;
        
        return Math.round(Math.max(100, Math.min(50000, baseCapacity * 10)));
    }

    calculateTourismPressure(muni) {
        const { population, tourist_capacity } = muni;
        
        if (!population || population === 0) return 0;
        
        const pressure = tourist_capacity / population;
        
        // Normalizar a escala 0-10
        if (pressure > 10) return 10;
        if (pressure < 0.1) return 0;
        
        return Math.round(pressure * 10) / 10;
    }

    isCoastalMunicipality(name) {
        const coastalPatterns = [
            'lloret', 'blanes', 'tossa', 'calella', 'pineda', 'malgrat',
            'sitges', 'vilanova', 'segur', 'tarragona', 'salou', 'cambrils',
            'hospitalet de l\'infant', 'l\'ametlla', 'deltebre', 'sant carles'
        ];
        return coastalPatterns.some(pattern => name.includes(pattern));
    }

    isMountainMunicipality(name) {
        const mountainPatterns = [
            'vall', 'cerdanya', 'puigcerdà', 'la seu d\'urgell', 'tremp',
            'sort', 'vielha', 'baqueira', 'ribes', 'queralbs', 'núria'
        ];
        return mountainPatterns.some(pattern => name.includes(pattern));
    }

    isCapitalMunicipality(name) {
        const capitals = ['barcelona', 'girona', 'lleida', 'tarragona'];
        return capitals.some(capital => name.includes(capital));
    }

    async getHistoricalTourismData(codiINE, startYear = 2020) {
        const cacheKey = `tourism_historical_${codiINE}_${startYear}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiration) {
            return cached.data;
        }

        try {
            // Simular datos históricos (en futura implementación conectar con APIs reales)
            const currentYear = new Date().getFullYear();
            const years = [];
            
            for (let year = startYear; year <= currentYear; year++) {
                years.push({
                    year,
                    visitors: Math.floor(Math.random() * 100000) + 10000,
                    occupancy_rate: Math.random() * 100,
                    seasonal_peak: this.getSeasonalPeak()
                });
            }
            
            this.cache.set(cacheKey, {
                data: years,
                timestamp: Date.now()
            });
            
            return years;
        } catch (error) {
            console.warn(`Error fetching historical tourism data for ${codiINE}:`, error);
            return [];
        }
    }

    getSeasonalPeak() {
        const peaks = ['summer', 'winter', 'spring', 'autumn'];
        return peaks[Math.floor(Math.random() * peaks.length)];
    }

    clearCache() {
        this.cache.clear();
    }

    getCacheSize() {
        return this.cache.size;
    }
}

export default CatalunyaDataConnector;