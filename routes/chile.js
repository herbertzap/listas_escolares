const express = require('express');
const router = express.Router();
const { 
  buscarRegiones, 
  buscarComunasPorRegion, 
  obtenerTodasLasRegiones, 
  obtenerComunasDeRegion,
  buscarComunasEnTodoChile 
} = require('../utils/chile-data');

const {
  buscarNiveles,
  obtenerTodosLosNiveles,
  obtenerNivelesPorCategoria,
  obtenerCategorias
} = require('../utils/niveles-educativos');

// GET /api/chile/regiones - Obtener todas las regiones
router.get('/regiones', (req, res) => {
  try {
    const regiones = obtenerTodasLasRegiones();
    res.json({
      success: true,
      data: regiones
    });
  } catch (error) {
    console.error('Error obteniendo regiones:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// GET /api/chile/regiones/buscar - Buscar regiones por término
router.get('/regiones/buscar', (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro de búsqueda "q" es requerido'
      });
    }
    
    const regiones = buscarRegiones(q);
    res.json({
      success: true,
      data: regiones,
      total: regiones.length
    });
  } catch (error) {
    console.error('Error buscando regiones:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// GET /api/chile/regiones/:id/comunas - Obtener comunas de una región
router.get('/regiones/:id/comunas', (req, res) => {
  try {
    const { id } = req.params;
    const regionId = parseInt(id);
    
    if (isNaN(regionId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de región debe ser un número válido'
      });
    }
    
    const comunas = obtenerComunasDeRegion(regionId);
    
    if (comunas.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Región no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: comunas,
      total: comunas.length
    });
  } catch (error) {
    console.error('Error obteniendo comunas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// GET /api/chile/comunas - Obtener comunas por región (para compatibilidad)
router.get('/comunas', (req, res) => {
  try {
    const { region } = req.query;
    
    if (!region) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro "region" es requerido'
      });
    }
    
    console.log('🔍 Buscando comunas para región:', region);
    
    // Buscar la región por nombre (búsqueda simple)
    const regiones = obtenerTodasLasRegiones();
    console.log('📋 Regiones disponibles:', regiones.map(r => r.nombre));
    
    // Búsqueda simple por nombre exacto
    let regionEncontrada = regiones.find(r => r.nombre === region);
    
    if (regionEncontrada) {
      console.log('✅ Región encontrada por nombre exacto:', regionEncontrada.nombre);
    } else {
      // Búsqueda por nombre normalizado
      const regionNormalizada = region.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      console.log('🔧 Búsqueda normalizada:', regionNormalizada);
      
      regionEncontrada = regiones.find(r => {
        const nombreNormalizado = r.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nombreNormalizado === regionNormalizada;
      });
      
      if (regionEncontrada) {
        console.log('✅ Región encontrada por normalización:', regionEncontrada.nombre);
      }
    }
    
    if (!regionEncontrada) {
      console.log('❌ Región no encontrada. Regiones disponibles:');
      regiones.forEach(r => {
        const nombreNormalizado = r.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        console.log(`  - ${r.nombre} -> ${nombreNormalizado}`);
      });
      
      return res.status(404).json({
        success: false,
        error: 'Región no encontrada'
      });
    }
    
    const comunas = obtenerComunasDeRegion(regionEncontrada.id);
    console.log('📊 Comunas encontradas:', comunas.length);
    
    res.json({
      success: true,
      data: comunas,
      total: comunas.length
    });
  } catch (error) {
    console.error('❌ Error obteniendo comunas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// GET /api/chile/comunas/buscar - Buscar comunas por término
router.get('/comunas/buscar', (req, res) => {
  try {
    const { q, region_id } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro de búsqueda "q" es requerido'
      });
    }
    
    let comunas;
    
    if (region_id) {
      // Buscar comunas en una región específica
      const regionId = parseInt(region_id);
      if (isNaN(regionId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de región debe ser un número válido'
        });
      }
      comunas = buscarComunasPorRegion(regionId, q);
    } else {
      // Buscar comunas en todo Chile
      const resultados = buscarComunasEnTodoChile(q);
      res.json({
        success: true,
        data: resultados,
        total: resultados.reduce((acc, r) => acc + r.comunas.length, 0)
      });
      return;
    }
    
    res.json({
      success: true,
      data: comunas,
      total: comunas.length
    });
  } catch (error) {
    console.error('Error buscando comunas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// ===== RUTAS PARA NIVELES EDUCATIVOS =====

// GET /api/chile/niveles - Obtener todos los niveles
router.get('/niveles', (req, res) => {
  try {
    const niveles = obtenerTodosLosNiveles();
    res.json({
      success: true,
      data: niveles
    });
  } catch (error) {
    console.error('Error obteniendo niveles:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// GET /api/chile/niveles/buscar - Buscar niveles por término
router.get('/niveles/buscar', (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro de búsqueda "q" es requerido'
      });
    }
    
    const niveles = buscarNiveles(q);
    res.json({
      success: true,
      data: niveles,
      total: niveles.length
    });
  } catch (error) {
    console.error('Error buscando niveles:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// GET /api/chile/niveles/categorias - Obtener categorías disponibles
router.get('/niveles/categorias', (req, res) => {
  try {
    const categorias = obtenerCategorias();
    res.json({
      success: true,
      data: categorias
    });
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// GET /api/chile/niveles/categoria/:categoria - Obtener niveles por categoría
router.get('/niveles/categoria/:categoria', (req, res) => {
  try {
    const { categoria } = req.params;
    const niveles = obtenerNivelesPorCategoria(categoria);
    
    res.json({
      success: true,
      data: niveles,
      total: niveles.length
    });
  } catch (error) {
    console.error('Error obteniendo niveles por categoría:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

module.exports = router;
