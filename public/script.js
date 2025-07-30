async createHeatmap() {
    try {
        console.log('📍 Iniciando creación de heatmap...');
        
        if (!this.allMunicipalities || this.allMunicipalities.length === 0) {
            console.warn('⚠️ No hay datos para crear heatmap');
            return;
        }

        // Limpiar eventos anteriores
        this.map.off('zoomend');
        
        // Remover heatmap anterior
        if (this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
        }
        
        // SOLUCIÓN: Usar SOLO coordenadas válidas de municipios
        const puntos = [];
        
        this.allMunicipalities.forEach(m => {
            if (m.latitude && m.longitude) {
                // Validación CRÍTICA: Solo coordenadas dentro de Catalunya
                if (m.latitude >= 40.5 && m.latitude <= 42.9 && 
                    m.longitude >= 0.1 && m.longitude <= 3.4) {
                    
                    // Calcular intensidad basada en datos del municipio
                    let intensidad = 0.3; // Base
                    
                    // Intensidad por tourism_score del API
                    if (m.tourism_score) {
                        intensidad = Math.min(1.0, m.tourism_score / 100);
                    }
                    
                    // Intensidad por densidad
                    if (m.density) {
                        intensidad += Math.min(0.3, m.density / 1000);
                    }
                    
                    // FIXED: Solo 3-5 puntos cerca del centro del municipio
                    const numPuntos = 4; // Fijo para consistencia
                    
                    for (let i = 0; i < numPuntos; i++) {
                        // Micro-variación MÍNIMA (solo 0.01 grados = ~1km)
                        const latOffset = (Math.random() - 0.5) * 0.01;
                        const lngOffset = (Math.random() - 0.5) * 0.01;
                        
                        const finalLat = m.latitude + latOffset;
                        const finalLng = m.longitude + lngOffset;
                        
                        // Validación final: asegurar que sigue dentro de Catalunya
                        if (finalLat >= 40.5 && finalLat <= 42.9 && 
                            finalLng >= 0.1 && finalLng <= 3.4) {
                            
                            puntos.push([
                                finalLat, 
                                finalLng, 
                                Math.min(1.0, intensidad)
                            ]);
                        }
                    }
                }
            }
        });
        
        console.log(`🗺️ Generando heatmap con ${puntos.length} puntos VALIDADOS`);
        
        // Crear heatmap con configuración optimizada - CORREGIDO SIN DUPLICACIÓN
        this.heatmapLayer = L.heatLayer(puntos, {
            radius: 30,        // Aumentado para visibilidad óptima
            blur: 20,          // Difuminado suave y visible
            maxZoom: 18,       // Permite zoom completo
            minZoom: 5,        // Permite ver toda Catalunya
            max: 1.0,
            minOpacity: 0.3,   // Reducido para mejor transparencia
            gradient: {
                0.0: 'rgba(0,100,0,0)',      // Verde transparente
                0.2: 'rgba(0,255,0,0.4)',    // Verde
                0.4: 'rgba(255,255,0,0.6)',  // Amarillo  
                0.6: 'rgba(255,165,0,0.8)',  // Naranja
                0.8: 'rgba(255,100,0,0.9)',  // Rojo-naranja
                1.0: 'rgba(255,0,0,1.0)'     // Rojo
            }
        }).addTo(this.map);
        
        console.log('✅ Heatmap creado correctamente SIN puntos fuera de Catalunya');
        this.updateStats();
        
    } catch (error) {
        console.error('❌ Error creating heatmap:', error);
        this.showError('Error creando heatmap: ' + error.message);
    }
}