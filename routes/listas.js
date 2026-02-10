const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { requireAuth } = require('../utils/auth-simple');
const { obtenerTodasLasRegiones, obtenerComunasDeRegion } = require('../utils/chile-data');

// Función helper para crear condiciones de búsqueda flexibles
function createSearchConditions(field, value) {
  const conditions = [];
  const params = [];
  
  if (value && value.trim()) {
    const searchValue = value.trim();
    conditions.push(`(${field} LIKE ? OR ${field} LIKE ? OR ${field} LIKE ?)`);
    params.push(`%${searchValue}%`);
    params.push(`%${searchValue.toLowerCase()}%`);
    params.push(`%${searchValue.charAt(0).toUpperCase() + searchValue.slice(1).toLowerCase()}%`);
  }
  
  return { conditions, params };
}

// La base de datos se inicializa automáticamente en server.js

// GET /api/listas - Obtener todas las listas con filtros opcionales y paginación
router.get('/', async (req, res) => {
  let sql, params, conditions;
  try {
    const { region, comuna, colegio, nivel, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    sql = `
      SELECT l.*, 
             COALESCE(p_count.productos_count, 0) as productos_count,
             CASE 
               WHEN l.sigla_curso IS NULL OR l.sigla_curso = '' THEN l.nivel
               ELSE CONCAT(l.nivel, ' ', l.sigla_curso)
             END as nivel_completo
      FROM listas_escolares l 
      LEFT JOIN (
        SELECT lista_id, COUNT(*) as productos_count 
        FROM productos_lista 
        GROUP BY lista_id
      ) p_count ON l.id = p_count.lista_id
    `;
    params = [];
    conditions = [];

    if (region) {
      conditions.push('l.region LIKE ?');
      params.push(`%${region}%`);
    }

    if (comuna) {
      conditions.push('l.comuna LIKE ?');
      params.push(`%${comuna}%`);
    }

    if (colegio) {
      conditions.push('l.nombre_colegio LIKE ?');
      params.push(`%${colegio}%`);
    }

    if (nivel) {
      conditions.push('l.nivel LIKE ?');
      params.push(`%${nivel}%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    console.log('SQL final:', sql);
    console.log('Params final:', params);

    const listas = await db.query(sql, params);
    
    // Obtener el total de registros para la paginación
    let countSql = `
      SELECT COUNT(DISTINCT l.id) as total
      FROM listas_escolares l
    `;
    let countParams = [];
    
    if (conditions.length > 0) {
      countSql += ' WHERE ' + conditions.join(' AND ');
      countParams = params.slice(0, -2); // Excluir LIMIT y OFFSET
    }
    
    const totalResult = await db.query(countSql, countParams);
    const total = totalResult[0].total;
    const totalPages = Math.ceil(total / parseInt(limit));
    
    res.json({ 
      success: true, 
      data: listas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error obteniendo listas:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// GET /api/listas/buscar - Buscar listas con filtros para cliente
router.get('/buscar', async (req, res) => {
  try {
    const { region, comuna, nivel, colegio, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let sql = `
      SELECT 
        l.id,
        l.nombre_colegio,
        l.region,
        l.comuna,
        l.nivel,
        l.sigla_curso,
        CASE 
          WHEN l.sigla_curso IS NULL OR l.sigla_curso = '' THEN l.nivel
          ELSE CONCAT(l.nivel, ' ', l.sigla_curso)
        END as nivel_completo,
        COUNT(p.id) as total_productos
      FROM listas_escolares l 
      LEFT JOIN productos_lista p ON l.id = p.lista_id
    `;
    let params = [];
    let conditions = [];

    if (region) {
      conditions.push('l.region = ?');
      params.push(region);
    }

    if (comuna) {
      conditions.push('l.comuna = ?');
      params.push(comuna);
    }

    if (nivel) {
      conditions.push('l.nivel = ?');
      params.push(nivel);
    }

    if (colegio) {
      conditions.push('l.nombre_colegio LIKE ?');
      params.push(`%${colegio}%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' GROUP BY l.id ORDER BY l.nombre_colegio, l.nivel LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const listas = await db.query(sql, params);
    
    // Obtener el total de registros para la paginación
    let countSql = `
      SELECT COUNT(DISTINCT l.id) as total
      FROM listas_escolares l
    `;
    let countParams = [];
    
    if (conditions.length > 0) {
      countSql += ' WHERE ' + conditions.join(' AND ');
      countParams = params.slice(0, -2); // Excluir LIMIT y OFFSET
    }
    
    const totalResult = await db.query(countSql, countParams);
    const total = totalResult[0].total;
    const totalPages = Math.ceil(total / parseInt(limit));
    
    res.json({ 
      success: true, 
      data: listas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error buscando listas:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// GET /api/listas/regiones - Obtener todas las regiones únicas
router.get('/regiones', async (req, res) => {
  try {
    const sql = 'SELECT DISTINCT region FROM listas_escolares ORDER BY region';
    const regiones = await db.query(sql);
    
    res.json({ 
      success: true, 
      data: regiones.map(r => r.region) 
    });
  } catch (error) {
    console.error('Error obteniendo regiones:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// GET /api/listas/comunas - Obtener comunas por región (solo donde hay listas)
router.get('/comunas', async (req, res) => {
  try {
    const { region } = req.query;
    
    let sql = 'SELECT DISTINCT comuna FROM listas_escolares';
    let params = [];
    
    if (region) {
      sql += ' WHERE region = ?';
      params.push(region);
    }
    
    sql += ' ORDER BY comuna';
    
    const comunas = await db.query(sql, params);
    
    res.json({ 
      success: true, 
      data: comunas.map(c => c.comuna) 
    });
  } catch (error) {
    console.error('Error obteniendo comunas:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// GET /api/listas/chile-comunas - Obtener todas las comunas de Chile por región
router.get('/chile-comunas', async (req, res) => {
  try {
    const { region } = req.query;
    
    if (!region) {
      return res.json({ 
        success: true, 
        data: [] 
      });
    }
    
    console.log('🔍 Buscando comunas para región:', region);
    
    // Buscar la región por nombre
    const regiones = obtenerTodasLasRegiones();
    console.log('📋 Regiones disponibles:', regiones.map(r => r.nombre));
    
    // Búsqueda simple por nombre exacto
    let regionEncontrada = regiones.find(r => r.nombre === region);
    
    if (regionEncontrada) {
      console.log('✅ Región encontrada por nombre exacto:', regionEncontrada.nombre);
    } else {
      // Búsqueda por nombre normalizado (sin acentos)
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
        console.log(`  - ${r.nombre}`);
      });
      
      return res.json({ 
        success: true, 
        data: [] 
      });
    }
    
    // Obtener las comunas de la región encontrada
    const comunas = obtenerComunasDeRegion(regionEncontrada.id);
    console.log('📊 Comunas encontradas:', comunas.length);
    
    res.json({ 
      success: true, 
      data: comunas 
    });
  } catch (error) {
    console.error('Error obteniendo todas las comunas de Chile:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// GET /api/listas/niveles - Obtener todos los niveles únicos
router.get('/niveles', async (req, res) => {
  try {
    const sql = 'SELECT DISTINCT nivel FROM listas_escolares ORDER BY nivel';
    const niveles = await db.query(sql);
    
    res.json({ 
      success: true, 
      data: niveles.map(n => n.nivel) 
    });
  } catch (error) {
    console.error('Error obteniendo niveles:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// GET /api/listas/colegios/buscar - Buscar colegios existentes
router.get('/colegios/buscar', async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.json({ 
        success: true, 
        data: [] 
      });
    }
    
    const searchValue = `%${searchTerm.trim()}%`;
    
    const sql = `
      SELECT DISTINCT 
        nombre_colegio,
        region,
        comuna,
        COUNT(*) as total_listas
      FROM listas_escolares 
      WHERE nombre_colegio LIKE ? 
      GROUP BY nombre_colegio, region, comuna
      ORDER BY nombre_colegio, region, comuna
      LIMIT 10
    `;
    
    const colegios = await db.query(sql, [searchValue]);
    
    res.json({ 
      success: true, 
      data: colegios 
    });
  } catch (error) {
    console.error('Error buscando colegios:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// GET /api/listas/colegio/niveles-existentes - Obtener niveles ya existentes de un colegio
router.get('/colegio/niveles-existentes', async (req, res) => {
  try {
    const { nombre, region, comuna } = req.query;
    
    if (!nombre || !region || !comuna) {
      return res.json({ 
        success: true, 
        data: [] 
      });
    }
    
    const sql = `
      SELECT DISTINCT nivel
      FROM listas_escolares 
      WHERE nombre_colegio = ? AND region = ? AND comuna = ?
      ORDER BY nivel
    `;
    
    const nivelesExistentes = await db.query(sql, [nombre, region, comuna]);
    
    res.json({ 
      success: true, 
      data: nivelesExistentes.map(n => n.nivel)
    });
  } catch (error) {
    console.error('Error obteniendo niveles existentes:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// GET /api/listas/colegios-nombres - Obtener nombres únicos de colegios
router.get('/colegios-nombres', async (req, res) => {
  try {
    const { region, comuna } = req.query;
    
    let sql = 'SELECT DISTINCT nombre_colegio FROM listas_escolares';
    let params = [];
    let conditions = [];
    
    if (region) {
      conditions.push('region = ?');
      params.push(region);
    }
    
    if (comuna) {
      conditions.push('comuna = ?');
      params.push(comuna);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY nombre_colegio';
    
    const colegios = await db.query(sql, params);
    
    res.json({ 
      success: true, 
      data: colegios.map(c => c.nombre_colegio) 
    });
  } catch (error) {
    console.error('Error obteniendo colegios:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// GET /api/listas/colegios - Obtener colegios únicos con sus niveles
router.get('/colegios', async (req, res) => {
  try {
    const { region, comuna } = req.query;
    let sql = `
      SELECT DISTINCT 
        l.nombre_colegio,
        l.region,
        l.comuna,
        GROUP_CONCAT(l.nivel) as niveles,
        COUNT(DISTINCT l.id) as total_listas,
        SUM(p_count.productos_count) as total_productos
      FROM listas_escolares l
      LEFT JOIN (
        SELECT lista_id, COUNT(*) as productos_count
        FROM productos_lista
        GROUP BY lista_id
      ) p_count ON l.id = p_count.lista_id
    `;
    let params = [];
    let conditions = [];

    if (region) {
      conditions.push('l.region = ?');
      params.push(region);
    }

    if (comuna) {
      conditions.push('l.comuna = ?');
      params.push(comuna);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' GROUP BY l.nombre_colegio, l.region, l.comuna ORDER BY l.nombre_colegio';

    const colegios = await db.query(sql, params);
    
    // Procesar los niveles para convertirlos en array
    const colegiosProcesados = colegios.map(colegio => ({
      ...colegio,
      niveles: colegio.niveles ? colegio.niveles.split(',') : []
    }));

    res.json({ success: true, data: colegiosProcesados });
  } catch (error) {
    console.error('Error obteniendo colegios:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// GET /api/listas/todas-comunas - Obtener todas las comunas de Chile por región
router.get('/todas-comunas', async (req, res) => {
  try {
    console.log('🔍 API /todas-comunas - req.query:', req.query);
    const { region } = req.query;
    console.log('🔍 API /todas-comunas - región:', region);
    
    if (!region) {
      console.log('🔍 API /todas-comunas - No hay región');
      return res.json({ 
        success: true, 
        data: [] 
      });
    }
    
    // Buscar la región por nombre
    const regiones = obtenerTodasLasRegiones();
    
    // Búsqueda simple por nombre exacto
    let regionEncontrada = regiones.find(r => r.nombre === region);
    
    if (!regionEncontrada) {
      // Búsqueda por nombre normalizado (sin acentos)
      const regionNormalizada = region.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      regionEncontrada = regiones.find(r => {
        const nombreNormalizado = r.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nombreNormalizado === regionNormalizada;
      });
    }
    
    if (!regionEncontrada) {
      console.log('🔍 API /todas-comunas - Región no encontrada');
      return res.json({ 
        success: true, 
        data: [] 
      });
    }
    
    // Obtener las comunas de la región encontrada
    const comunas = obtenerComunasDeRegion(regionEncontrada.id);
    console.log('🔍 API /todas-comunas - comunas encontradas:', comunas.length);
    
    res.json({ 
      success: true, 
      data: comunas 
    });
  } catch (error) {
    console.error('Error obteniendo todas las comunas:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// GET /api/listas/colegio/:colegio/niveles - Obtener niveles de un colegio específico
router.get('/colegio/:colegio/niveles', async (req, res) => {
  try {
    const { colegio } = req.params;
    const { region, comuna } = req.query;
    
    let sql = `
      SELECT l.id, l.nivel, COUNT(p.id) as productos_count
      FROM listas_escolares l
      LEFT JOIN productos_lista p ON l.id = p.lista_id
      WHERE l.nombre_colegio = ?
    `;
    let params = [colegio];

    if (region) {
      sql += ' AND l.region LIKE ?';
      params.push(`%${region}%`);
    }

    if (comuna) {
      sql += ' AND l.comuna LIKE ?';
      params.push(`%${comuna}%`);
    }

    sql += ' GROUP BY l.id, l.nivel ORDER BY l.nivel';

    const niveles = await db.query(sql, params);
    
    res.json({ success: true, data: niveles });
  } catch (error) {
    console.error('Error obteniendo niveles del colegio:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// GET /api/listas/niveles-siglas/:colegio - Obtener combinaciones nivel-sigla existentes
router.get('/niveles-siglas/:colegio', async (req, res) => {
  try {
    const { colegio } = req.params;
    const { region, comuna } = req.query;
    
    let sql = `
      SELECT nivel, sigla_curso, 
             CASE 
               WHEN sigla_curso IS NULL OR sigla_curso = '' THEN nivel
               ELSE CONCAT(nivel, ' ', sigla_curso)
             END as nivel_completo
      FROM listas_escolares 
      WHERE nombre_colegio = ?
    `;
    let params = [colegio];
    
    if (region) {
      sql += ' AND region = ?';
      params.push(region);
    }
    
    if (comuna) {
      sql += ' AND comuna = ?';
      params.push(comuna);
    }
    
    sql += ' ORDER BY nivel, sigla_curso';
    
    const combinaciones = await db.query(sql, params);
    
    res.json({
      success: true,
      data: combinaciones
    });
  } catch (error) {
    console.error('Error obteniendo combinaciones nivel-sigla:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// GET /api/listas/:id - Obtener una lista específica con sus productos
router.get('/:id', async (req, res) => {
  try {
    console.log('🔍 API /:id - req.params:', req.params);
    const { id } = req.params;
    
    // Obtener la lista
    const listas = await db.query('SELECT * FROM listas_escolares WHERE id = ?', [id]);
    
    if (listas.length === 0) {
      return res.status(404).json({ success: false, error: 'Lista no encontrada' });
    }

    const lista = listas[0];

    // Obtener productos de la lista con todas las columnas
    const productos = await db.query(
      'SELECT id, lista_id, producto_shopify_id, variant_id, nombre_producto, precio, cantidad, orden, imagen, codigo_producto, created_at FROM productos_lista WHERE lista_id = ? ORDER BY orden ASC',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...lista,
        productos: productos
      }
    });
  } catch (error) {
    console.error('Error obteniendo lista:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// POST /api/listas - Crear una nueva lista (requiere autenticación)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { nombre_colegio, region, comuna, nivel, sigla_curso } = req.body;

    if (!nombre_colegio || !region || !comuna || !nivel) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: nombre_colegio, region, comuna, nivel'
      });
    }

    const result = await db.query(
      'INSERT INTO listas_escolares (nombre_colegio, region, comuna, nivel, sigla_curso) VALUES (?, ?, ?, ?, ?)',
      [nombre_colegio, region, comuna, nivel, sigla_curso || null]
    );

    const nuevaLista = await db.query('SELECT * FROM listas_escolares WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      data: nuevaLista[0],
      message: 'Lista creada exitosamente'
    });
  } catch (error) {
    console.error('Error creando lista:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// PUT /api/listas/:id - Actualizar una lista (requiere autenticación)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_colegio, region, comuna, nivel, sigla_curso } = req.body;

    const result = await db.query(
      'UPDATE listas_escolares SET nombre_colegio = ?, region = ?, comuna = ?, nivel = ?, sigla_curso = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [nombre_colegio, region, comuna, nivel, sigla_curso || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Lista no encontrada' });
    }

    const listaActualizada = await db.query('SELECT * FROM listas_escolares WHERE id = ?', [id]);

    res.json({
      success: true,
      data: listaActualizada[0],
      message: 'Lista actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error actualizando lista:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// DELETE /api/listas/colegio - Eliminar un colegio completo con todas sus listas y productos (requiere autenticación)
router.delete('/colegio', requireAuth, async (req, res) => {
  try {
    const { nombre, region, comuna } = req.query;

    if (!nombre || !region || !comuna) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren nombre, región y comuna del colegio'
      });
    }

    console.log(`🗑️ Eliminando colegio: ${nombre} (${region}, ${comuna})`);

    // Obtener todas las listas del colegio
    const listas = await db.query(
      'SELECT id FROM listas_escolares WHERE nombre_colegio = ? AND region = ? AND comuna = ?',
      [nombre, region, comuna]
    );

    const listaIds = listas.map(l => l.id);
    const totalListas = listaIds.length;

    console.log(`📋 Encontradas ${totalListas} listas para eliminar`);

    if (totalListas === 0) {
      return res.status(404).json({
        success: false,
        error: 'No se encontraron listas para este colegio'
      });
    }

    // Obtener total de productos que se eliminarán
    let totalProductos = 0;
    if (listaIds.length > 0) {
      const placeholders = listaIds.map(() => '?').join(',');
      const productosCount = await db.query(
        `SELECT COUNT(*) as total FROM productos_lista WHERE lista_id IN (${placeholders})`,
        listaIds
      );
      totalProductos = productosCount[0]?.total || 0;

      // Eliminar productos de listas personalizadas temporales asociadas
      await db.query(
        `DELETE FROM listas_personalizadas_temp WHERE lista_base_id IN (${placeholders})`,
        listaIds
      );

      // Eliminar productos de las listas (se eliminan automáticamente por CASCADE, pero lo hacemos explícitamente)
      await db.query(
        `DELETE FROM productos_lista WHERE lista_id IN (${placeholders})`,
        listaIds
      );
    }

    // Eliminar las listas
    const result = await db.query(
      'DELETE FROM listas_escolares WHERE nombre_colegio = ? AND region = ? AND comuna = ?',
      [nombre, region, comuna]
    );

    console.log(`✅ Colegio eliminado: ${result.affectedRows} listas, ${totalProductos} productos`);

    res.json({
      success: true,
      message: `Colegio "${nombre}" eliminado exitosamente`,
      data: {
        listas_eliminadas: result.affectedRows,
        productos_eliminados: totalProductos
      }
    });
  } catch (error) {
    console.error('Error eliminando colegio:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// DELETE /api/listas/:id - Eliminar una lista (requiere autenticación)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Primero eliminar productos asociados
    await db.query('DELETE FROM productos_lista WHERE lista_id = ?', [id]);

    // Luego eliminar la lista
    const result = await db.query('DELETE FROM listas_escolares WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Lista no encontrada' });
    }

    res.json({
      success: true,
      message: 'Lista eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando lista:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// POST /api/listas/:id/productos - Agregar productos a una lista (requiere autenticación)
router.post('/:id/productos', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { productos } = req.body;

    if (!productos || !Array.isArray(productos)) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de productos'
      });
    }

    // Verificar que la lista existe
    const listas = await db.query('SELECT * FROM listas_escolares WHERE id = ?', [id]);
    if (listas.length === 0) {
      return res.status(404).json({ success: false, error: 'Lista no encontrada' });
    }

    const productosAgregados = [];
    const shopifyAPI = require('../utils/shopify');

    for (const producto of productos) {
      console.log('📥 Recibiendo producto para guardar:', {
        producto_shopify_id: producto.producto_shopify_id,
        variant_id: producto.variant_id,
        nombre_producto: producto.nombre_producto
      });
      
      // Si no hay imagen, intentar obtenerla de Shopify
      let imagenProducto = producto.imagen || null;
      
      if (!imagenProducto && producto.producto_shopify_id && shopifyAPI.isConfigured()) {
        try {
          console.log(`🖼️ Obteniendo imagen de Shopify para producto ${producto.producto_shopify_id}`);
          const shopifyProduct = await shopifyAPI.getProduct(producto.producto_shopify_id);
          imagenProducto = shopifyAPI.getProductImage(shopifyProduct);
          console.log(`✅ Imagen obtenida: ${imagenProducto ? 'Sí' : 'No'}`);
        } catch (error) {
          console.warn(`⚠️ No se pudo obtener imagen de Shopify para producto ${producto.producto_shopify_id}:`, error.message);
        }
      }

      const result = await db.query(
        'INSERT INTO productos_lista (lista_id, producto_shopify_id, variant_id, nombre_producto, precio, cantidad, orden, imagen, codigo_producto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          id, 
          producto.producto_shopify_id,
          producto.variant_id || null,
          producto.nombre_producto, 
          producto.precio, 
          producto.cantidad, 
          producto.orden || 1,
          imagenProducto,
          producto.codigo_producto || null
        ]
      );

      productosAgregados.push({
        id: result.insertId,
        producto_shopify_id: producto.producto_shopify_id,
        variant_id: producto.variant_id || null,
        nombre_producto: producto.nombre_producto,
        precio: producto.precio,
        cantidad: producto.cantidad,
        imagen: imagenProducto,
        codigo_producto: producto.codigo_producto,
        orden: producto.orden || 1
      });
    }

    res.status(201).json({
      success: true,
      data: productosAgregados,
      message: `${productosAgregados.length} productos agregados exitosamente`
    });
  } catch (error) {
    console.error('Error agregando productos:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// PUT /api/listas/producto/:productoId - Actualizar cantidad de un producto (requiere autenticación)
router.put('/producto/:productoId', requireAuth, async (req, res) => {
  try {
    const { productoId } = req.params;
    const { cantidad } = req.body;

    if (!cantidad || cantidad < 1 || cantidad > 99) {
      return res.status(400).json({
        success: false,
        error: 'La cantidad debe estar entre 1 y 99'
      });
    }

    // Verificar que el producto existe
    const productos = await db.query('SELECT * FROM productos_lista WHERE id = ?', [productoId]);
    if (productos.length === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    const productoOriginal = productos[0];

    // Actualizar la cantidad
    const result = await db.query(
      'UPDATE productos_lista SET cantidad = ? WHERE id = ?',
      [cantidad, productoId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    res.json({
      success: true,
      message: 'Cantidad actualizada exitosamente',
      data: {
        id: productoId,
        cantidad: cantidad
      }
    });
  } catch (error) {
    console.error('Error actualizando cantidad del producto:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// DELETE /api/listas/producto/:productoId - Eliminar un producto de cualquier lista (requiere autenticación)
router.delete('/producto/:productoId', requireAuth, async (req, res) => {
  try {
    const { productoId } = req.params;

    // Verificar que el producto existe
    const productos = await db.query('SELECT * FROM productos_lista WHERE id = ?', [productoId]);
    if (productos.length === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    // Eliminar el producto
    const result = await db.query('DELETE FROM productos_lista WHERE id = ?', [productoId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    res.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// DELETE /api/listas/:listaId/productos/:productoId - Eliminar un producto de una lista (requiere autenticación)
router.delete('/:listaId/productos/:productoId', requireAuth, async (req, res) => {
  try {
    const { listaId, productoId } = req.params;

    const result = await db.query(
      'DELETE FROM productos_lista WHERE lista_id = ? AND id = ?',
      [listaId, productoId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado en la lista' });
    }

    res.json({
      success: true,
      message: 'Producto eliminado de la lista exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando producto de la lista:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// ===== RUTAS PARA LISTAS PERSONALIZADAS TEMPORALES =====

// GET /api/listas/personalizada/:listaId - Obtener lista personalizada por IP
router.get('/personalizada/:listaId', async (req, res) => {
  try {
    const { listaId } = req.params;
    const ipUsuario = req.ip || req.connection.remoteAddress;
    
    console.log(`🔍 Obteniendo lista personalizada para IP: ${ipUsuario}, Lista: ${listaId}`);
    
    // Obtener la lista base
    const listas = await db.query('SELECT * FROM listas_escolares WHERE id = ?', [listaId]);
    
    if (listas.length === 0) {
      return res.status(404).json({ success: false, error: 'Lista base no encontrada' });
    }

    const listaBase = listas[0];

    // Obtener productos de la lista base
    const productosBase = await db.query(
      'SELECT id, lista_id, producto_shopify_id, variant_id, nombre_producto, precio, cantidad, orden, imagen, codigo_producto FROM productos_lista WHERE lista_id = ? ORDER BY orden ASC',
      [listaId]
    );

    // Verificar si ya existe una lista personalizada para este usuario
    const listaExistente = await db.query(
      'SELECT COUNT(*) as count FROM listas_personalizadas_temp WHERE ip_usuario = ? AND lista_base_id = ?',
      [ipUsuario, listaId]
    );

    // Si no existe lista personalizada, crear una copia de todos los productos base
    if (listaExistente[0].count === 0) {
      console.log(`🆕 Creando lista personalizada inicial para IP: ${ipUsuario}`);
      
      // Crear copias de todos los productos base como productos agregados
      for (const producto of productosBase) {
        await db.query(
          'INSERT INTO listas_personalizadas_temp (ip_usuario, lista_base_id, producto_shopify_id, variant_id, nombre_producto, precio, cantidad, imagen, codigo_producto, accion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [ipUsuario, listaId, producto.producto_shopify_id, producto.variant_id || null, producto.nombre_producto, producto.precio, producto.cantidad, producto.imagen, producto.codigo_producto, 'agregado']
        );
      }
      
      console.log(`✅ Lista personalizada inicial creada con ${productosBase.length} productos`);
    }

    // Obtener productos agregados temporalmente (incluyendo los copiados de la base)
    const productosAgregados = await db.query(
      'SELECT * FROM listas_personalizadas_temp WHERE ip_usuario = ? AND lista_base_id = ? AND accion IN (?, ?) ORDER BY created_at ASC',
      [ipUsuario, listaId, 'agregado', 'modificado']
    );

    // Obtener productos eliminados temporalmente
    const productosEliminados = await db.query(
      'SELECT producto_shopify_id FROM listas_personalizadas_temp WHERE ip_usuario = ? AND lista_base_id = ? AND accion = ?',
      [ipUsuario, listaId, 'eliminado']
    );

    const idsEliminados = new Set(productosEliminados.map(p => p.producto_shopify_id));

    // Combinar productos agregados (excluyendo eliminados)
    const productosPersonalizados = productosAgregados
      .filter(p => !idsEliminados.has(p.producto_shopify_id))
      .map(mod => ({
        id: `temp_${mod.id}`,
        lista_id: listaId,
        producto_shopify_id: mod.producto_shopify_id,
        variant_id: mod.variant_id || null, // ✅ Incluir variant_id
        nombre_producto: mod.nombre_producto,
        precio: mod.precio,
        cantidad: mod.cantidad,
        imagen: mod.imagen,
        codigo_producto: mod.codigo_producto,
        es_agregado: true,
        es_original: mod.accion === 'agregado' // Marcar si es producto original (agregado inicialmente)
      }));

    console.log(`✅ Lista personalizada generada: ${productosPersonalizados.length} productos (${productosBase.length} base copiados + ${productosAgregados.length - productosBase.length} agregados extra)`);

    res.json({
      success: true,
      data: {
        ...listaBase,
        productos: productosPersonalizados,
        productos_agregados: productosAgregados.length,
        productos_eliminados: productosEliminados.length,
        es_lista_personalizada: true
      }
    });
  } catch (error) {
    console.error('Error obteniendo lista personalizada:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// POST /api/listas/personalizada/:listaId/producto - Agregar producto a lista personalizada
router.post('/personalizada/:listaId/producto', async (req, res) => {
  try {
    const { listaId } = req.params;
    const ipUsuario = req.ip || req.connection.remoteAddress;
    const { producto_shopify_id, variant_id, nombre_producto, precio, cantidad, imagen, codigo_producto } = req.body;

    console.log(`➕ Agregando producto a lista personalizada: IP ${ipUsuario}, Lista ${listaId}, Producto ${producto_shopify_id}, Variant ${variant_id || 'N/A'}`);

    // Si no hay imagen, intentar obtenerla de Shopify
    let imagenProducto = imagen || null;
    const shopifyAPI = require('../utils/shopify');
    
    if (!imagenProducto && producto_shopify_id && shopifyAPI.isConfigured()) {
      try {
        console.log(`🖼️ Obteniendo imagen de Shopify para producto ${producto_shopify_id}`);
        const shopifyProduct = await shopifyAPI.getProduct(producto_shopify_id);
        imagenProducto = shopifyAPI.getProductImage(shopifyProduct);
        console.log(`✅ Imagen obtenida: ${imagenProducto ? 'Sí' : 'No'}`);
      } catch (error) {
        console.warn(`⚠️ No se pudo obtener imagen de Shopify para producto ${producto_shopify_id}:`, error.message);
      }
    }

    const result = await db.query(
      'INSERT INTO listas_personalizadas_temp (ip_usuario, lista_base_id, producto_shopify_id, variant_id, nombre_producto, precio, cantidad, imagen, codigo_producto, accion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [ipUsuario, listaId, producto_shopify_id, variant_id || null, nombre_producto, precio, cantidad || 1, imagenProducto, codigo_producto, 'agregado']
    );

    res.json({
      success: true,
      data: {
        id: result.insertId,
        producto_shopify_id,
        nombre_producto,
        precio,
        cantidad: cantidad || 1,
        imagen: imagenProducto
      },
      message: 'Producto agregado a la lista personalizada'
    });
  } catch (error) {
    console.error('Error agregando producto a lista personalizada:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// PUT /api/listas/personalizada/:listaId/producto/:productoId - Modificar cantidad de producto
router.put('/personalizada/:listaId/producto/:productoId', async (req, res) => {
  try {
    const { listaId, productoId } = req.params;
    const ipUsuario = req.ip || req.connection.remoteAddress;
    const { cantidad, variant_id } = req.body;

    console.log(`✏️ Modificando cantidad: IP ${ipUsuario}, Lista ${listaId}, Producto ${productoId}, Variant ${variant_id || 'N/A'}, Cantidad ${cantidad}`);

    // Buscar por producto_shopify_id Y variant_id (si se proporciona)
    let existente;
    if (variant_id) {
      existente = await db.query(
        'SELECT * FROM listas_personalizadas_temp WHERE ip_usuario = ? AND lista_base_id = ? AND producto_shopify_id = ? AND variant_id = ?',
        [ipUsuario, listaId, productoId, variant_id]
      );
    } else {
      existente = await db.query(
        'SELECT * FROM listas_personalizadas_temp WHERE ip_usuario = ? AND lista_base_id = ? AND producto_shopify_id = ? AND (variant_id IS NULL OR variant_id = ?)',
        [ipUsuario, listaId, productoId, null]
    );
    }
    
    if (existente.length > 0) {
      if (variant_id) {
    await db.query(
          'UPDATE listas_personalizadas_temp SET cantidad = ?, accion = ? WHERE ip_usuario = ? AND lista_base_id = ? AND producto_shopify_id = ? AND variant_id = ?',
          [cantidad, 'modificado', ipUsuario, listaId, productoId, variant_id]
    );
      } else {
        await db.query(
          'UPDATE listas_personalizadas_temp SET cantidad = ?, accion = ? WHERE ip_usuario = ? AND lista_base_id = ? AND producto_shopify_id = ? AND (variant_id IS NULL OR variant_id = ?)',
          [cantidad, 'modificado', ipUsuario, listaId, productoId, null]
        );
      }
    } else {
      // Si no existe, crear nuevo registro (esto no debería pasar normalmente)
      await db.query(
        'INSERT INTO listas_personalizadas_temp (ip_usuario, lista_base_id, producto_shopify_id, variant_id, nombre_producto, precio, cantidad, accion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [ipUsuario, listaId, productoId, variant_id || null, 'Producto', 0, cantidad, 'modificado']
      );
    }

    res.json({
      success: true,
      data: {
        producto_shopify_id: productoId,
        cantidad
      },
      message: 'Cantidad modificada en la lista personalizada'
    });
  } catch (error) {
    console.error('Error modificando cantidad en lista personalizada:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// DELETE /api/listas/personalizada/:listaId/producto/:productoId - Eliminar producto de lista personalizada
router.delete('/personalizada/:listaId/producto/:productoId', async (req, res) => {
  try {
    const { listaId, productoId } = req.params;
    const { variant_id } = req.query; // variant_id viene como query parameter
    const ipUsuario = req.ip || req.connection.remoteAddress;

    console.log(`🗑️ Eliminando producto: IP ${ipUsuario}, Lista ${listaId}, Producto ${productoId}, Variant ${variant_id || 'N/A'}`);

    // Marcar producto como eliminado en la tabla temporal, considerando variant_id si se proporciona
    if (variant_id) {
    await db.query(
        'UPDATE listas_personalizadas_temp SET accion = ? WHERE ip_usuario = ? AND lista_base_id = ? AND producto_shopify_id = ? AND variant_id = ?',
        ['eliminado', ipUsuario, listaId, productoId, variant_id]
    );
    } else {
      await db.query(
        'UPDATE listas_personalizadas_temp SET accion = ? WHERE ip_usuario = ? AND lista_base_id = ? AND producto_shopify_id = ? AND (variant_id IS NULL OR variant_id = ?)',
        ['eliminado', ipUsuario, listaId, productoId, null]
      );
    }

    res.json({
      success: true,
      data: {
        producto_shopify_id: productoId
      },
      message: 'Producto eliminado de la lista personalizada'
    });
  } catch (error) {
    console.error('Error eliminando producto de lista personalizada:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// DELETE /api/listas/personalizada/:listaId/reset - Resetear lista personalizada
router.delete('/personalizada/:listaId/reset', async (req, res) => {
  try {
    const { listaId } = req.params;
    const ipUsuario = req.ip || req.connection.remoteAddress;

    console.log(`🔄 Reseteando lista personalizada: IP ${ipUsuario}, Lista ${listaId}`);

    await db.query(
      'DELETE FROM listas_personalizadas_temp WHERE ip_usuario = ? AND lista_base_id = ?',
      [ipUsuario, listaId]
    );

    res.json({
      success: true,
      message: 'Lista personalizada reseteada a la original'
    });
  } catch (error) {
    console.error('Error reseteando lista personalizada:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

module.exports = router;
