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
            
            // 2. Enriquecer con datos básicos (población simulada por ahora)
            for (const muni of municipalities) {
                // Población simulada basada en código para pruebas
                muni.population = this.simulatePopulation(muni.codi_ine, muni.nom_municipi);
                muni.area_km2 = parseFloat(muni.superficie) || this.simulateArea(muni.nom_municipi);
                muni.density = muni.area_km2 > 0 ? muni.population / muni.area_km2 : 0;
                
                // 3. Calcular capacidad turística
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
        
        return apiData.fitxes.v.map(node => ({
            codi_ine: node.id,
            nom_municipi: node.content,
            superficie: 0, // Se obtendrá posteriormente
            comarca: 'Unknown',
            provincia: this.getProvinciaFromCode(node.id),
            lat: 0,
            lon: 0
        }));
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