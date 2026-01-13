const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const shopifyAPI = require('../utils/shopify');

// GET /api/productos/lista/:listaId - Obtener productos de una lista específica
router.get('/lista/:listaId', async (req, res) => {
  try {
    const { listaId } = req.params;
    
    const productos = await db.query(
      'SELECT * FROM productos_lista WHERE lista_id = ? ORDER BY orden ASC',
      [listaId]
    );

    // Si Shopify está configurado, obtener información adicional de los productos
    if (shopifyAPI.isConfigured()) {
      const productosConInfo = await Promise.all(
        productos.map(async (producto) => {
          try {
            const shopifyProduct = await shopifyAPI.getProduct(producto.producto_shopify_id);
            return {
              ...producto,
              shopify_info: {
                title: shopifyProduct.title,
                image: shopifyProduct.image?.src,
                price: shopifyProduct.variants?.[0]?.price,
                available: shopifyProduct.status === 'active'
              }
            };
          } catch (error) {
            console.error(`Error obteniendo info de producto ${producto.producto_shopify_id}:`, error);
            return producto;
          }
        })
      );
      
      res.json({ success: true, data: productosConInfo });
    } else {
      res.json({ success: true, data: productos });
    }
  } catch (error) {
    console.error('Error obteniendo productos de lista:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// POST /api/productos/lista/:listaId - Agregar productos a una lista
router.post('/lista/:listaId', async (req, res) => {
  try {
    const { listaId } = req.params;
    const { productos } = req.body;

    if (!productos || !Array.isArray(productos)) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de productos'
      });
    }

    // Verificar que la lista existe
    const listas = await db.query('SELECT id FROM listas_escolares WHERE id = ?', [listaId]);
    if (listas.length === 0) {
      return res.status(404).json({ success: false, error: 'Lista no encontrada' });
    }

    // Insertar productos
    const resultados = [];
    for (const producto of productos) {
      const { producto_shopify_id, cantidad = 1, orden = 0 } = producto;
      
      const result = await db.query(
        'INSERT INTO productos_lista (lista_id, producto_shopify_id, cantidad, orden) VALUES (?, ?, ?, ?)',
        [listaId, producto_shopify_id, cantidad, orden]
      );
      
      resultados.push({
        id: result.insertId,
        producto_shopify_id,
        cantidad,
        orden
      });
    }

    res.status(201).json({
      success: true,
      data: resultados,
      message: `${resultados.length} productos agregados a la lista`
    });
  } catch (error) {
    console.error('Error agregando productos a lista:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// PUT /api/productos/:id - Actualizar un producto de la lista
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, orden } = req.body;

    const result = await db.query(
      'UPDATE productos_lista SET cantidad = ?, orden = ? WHERE id = ?',
      [cantidad, orden, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    const productoActualizado = await db.query('SELECT * FROM productos_lista WHERE id = ?', [id]);

    res.json({
      success: true,
      data: productoActualizado[0],
      message: 'Producto actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error actualizando producto:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// DELETE /api/productos/:id - Eliminar un producto de la lista
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM productos_lista WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    res.json({
      success: true,
      message: 'Producto eliminado de la lista exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando producto:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// GET /api/productos/shopify - Obtener productos de Shopify (para el selector)
router.get('/shopify', async (req, res) => {
  try {
    if (!shopifyAPI.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Shopify no está configurado'
      });
    }

    const { limit = 50, search } = req.query;
    const productos = await shopifyAPI.getProducts(parseInt(limit));

    // Filtrar por búsqueda si se proporciona
    let productosFiltrados = productos;
    if (search) {
      productosFiltrados = productos.filter(producto => 
        producto.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Formatear respuesta
    const productosFormateados = productosFiltrados.map(producto => ({
      id: producto.id,
      title: producto.title,
      image: producto.image?.src,
      price: producto.variants?.[0]?.price,
      available: producto.status === 'active',
      variants: producto.variants?.map(variant => ({
        id: variant.id,
        title: variant.title,
        price: variant.price,
        inventory_quantity: variant.inventory_quantity
      }))
    }));

    res.json({
      success: true,
      data: productosFormateados,
      total: productosFormateados.length
    });
  } catch (error) {
    console.error('Error obteniendo productos de Shopify:', error);
    res.status(500).json({ success: false, error: 'Error obteniendo productos de Shopify' });
  }
});

module.exports = router;
