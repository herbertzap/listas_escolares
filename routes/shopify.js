const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const shopifyAPI = require('../utils/shopify');
const { requireAuth } = require('../utils/auth-simple');

// GET /api/shopify/productos - Obtener productos de Shopify (requiere autenticación)
router.get('/productos', requireAuth, async (req, res) => {
  try {
    if (!shopifyAPI.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Shopify no está configurado. Verifica las credenciales en el archivo .env'
      });
    }

    const { limit = 20, search } = req.query;
    const productos = await shopifyAPI.getProducts(parseInt(limit));

    // Filtrar por búsqueda si se proporciona
    let productosFiltrados = productos;
    if (search) {
      productosFiltrados = productos.filter(producto => 
        producto.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Formatear respuesta para el frontend
    const productosFormateados = productosFiltrados.map(producto => ({
      id: producto.id,
      title: producto.title,
      description: producto.body_html,
      image: producto.image?.src || null,
      price: producto.variants?.[0]?.price || '0',
      available: producto.status === 'active',
      variants: producto.variants?.map(variant => ({
        id: variant.id,
        title: variant.title || variant.option1 || 'Default Title',
        price: variant.price,
        inventory_quantity: variant.inventory_quantity || 0,
        available: variant.inventory_quantity > 0
      })) || []
    }));

    res.json({
      success: true,
      data: productosFormateados,
      total: productosFormateados.length
    });
  } catch (error) {
    console.error('Error obteniendo productos de Shopify:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error obteniendo productos de Shopify',
      details: error.message 
    });
  }
});

// GET /api/shopify/productos/buscar - Buscar productos por código o nombre (pública para clientes)
router.get('/productos/buscar', async (req, res) => {
  try {
    const { q: searchTerm, limit = 20 } = req.query;
    
    if (!searchTerm || searchTerm.trim().length < 1) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        search_term: searchTerm
      });
    }

    // Obtener TODOS los productos de Shopify usando paginación
    const productos = await shopifyAPI.getAllProducts();
    console.log(`🔍 Búsqueda: "${searchTerm}" - Productos obtenidos: ${productos.length}`);
    
    // Función para normalizar texto (quitar acentos, convertir a minúsculas)
    const normalizeText = (text) => {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/[ñ]/g, 'n') // Convertir ñ a n
        .replace(/[ü]/g, 'u') // Convertir ü a u
        .replace(/[ç]/g, 'c'); // Convertir ç a c
    };

    // Filtrar productos solo por nombre
    const productosFiltrados = productos.filter(producto => {
      const searchNormalized = normalizeText(searchTerm.trim());
      const titleNormalized = normalizeText(producto.title);
      
      // Búsqueda más flexible: buscar en cualquier parte del título
      const searchWords = searchNormalized.split(' ').filter(word => word.length > 0);
      
      // Si hay múltiples palabras, buscar que todas estén presentes
      if (searchWords.length > 1) {
        return searchWords.every(word => titleNormalized.includes(word));
      }
      
      // Búsqueda simple de una palabra
      return titleNormalized.includes(searchNormalized);
    });
    
    console.log(`🔍 Productos filtrados: ${productosFiltrados.length}`);
    if (productosFiltrados.length > 0) {
      console.log(`🔍 Primer producto encontrado: "${productosFiltrados[0].title}"`);
    }

    // Formatear respuesta - incluyendo imagen completa
    const productosFormateados = productosFiltrados.map(producto => {
      // Obtener imagen principal del producto
      let imagen = null;
      if (producto.image && producto.image.src) {
        imagen = producto.image.src;
      } else if (producto.images && producto.images.length > 0) {
        // Buscar la primera imagen válida
        const imagenEncontrada = producto.images.find(img => img.src);
        imagen = imagenEncontrada ? imagenEncontrada.src : (producto.images[0].src || null);
      }
      
      return {
      id: producto.id,
      title: producto.title,
      price: producto.variants?.[0]?.price || '0',
        image: imagen || null, // Devolver null en lugar de imagen por defecto para que el frontend maneje
        variants: producto.variants?.map(v => ({
          id: v.id,
          title: v.title || v.option1 || 'Default Title',
          price: v.price,
          sku: v.sku || null,
          inventory_quantity: v.inventory_quantity || 0
        })) || []
      };
    });

    res.json({
      success: true,
      data: productosFormateados,
      total: productosFormateados.length,
      search_term: searchTerm
    });
  } catch (error) {
    console.error('Error buscando productos:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error buscando productos',
      details: error.message 
    });
  }
});

// GET /api/shopify/productos/:id - Obtener un producto específico por ID (requiere autenticación)
router.get('/productos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    

    
    // Si no es ficticio, intentar con Shopify
    if (!shopifyAPI.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Shopify no está configurado. Verifica las credenciales en el archivo .env'
      });
    }

    const producto = await shopifyAPI.getProduct(parseInt(id));
    
    if (!producto) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    // Obtener imagen principal del producto
    let imagen = null;
    if (producto.image && producto.image.src) {
      imagen = producto.image.src;
    } else if (producto.images && producto.images.length > 0) {
      // Buscar la primera imagen válida
      const imagenEncontrada = producto.images.find(img => img.src);
      imagen = imagenEncontrada ? imagenEncontrada.src : (producto.images[0].src || null);
    }

    // Formatear respuesta para el frontend
    const productoFormateado = {
      id: producto.id,
      title: producto.title,
      description: producto.body_html,
      image: imagen,
      price: producto.variants?.[0]?.price || '0',
      available: producto.status === 'active',
      variants: producto.variants?.map(variant => ({
        id: variant.id,
        title: variant.title || variant.option1 || 'Default Title',
        price: variant.price,
        sku: variant.sku || null,
        inventory_quantity: variant.inventory_quantity || 0,
        available: variant.inventory_quantity > 0
      })) || []
    };

    res.json({
      success: true,
      data: productoFormateado
    });
  } catch (error) {
    console.error('Error obteniendo producto de Shopify:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error obteniendo producto de Shopify',
      details: error.message 
    });
  }
});

// ===== FUNCIONES HELPER PARA MANEJO DE VARIANT_ID =====

/**
 * Normaliza el variant_id desde la base de datos
 * Convierte a string para manejar correctamente BIGINT
 */
function normalizarVariantId(variantId) {
  if (variantId === null || variantId === undefined || variantId === '') {
    return null;
  }
  // Convertir a string para evitar problemas con números grandes
  return String(variantId);
}

/**
 * Busca la variante correcta en el producto de Shopify
 * @param {Object} shopifyProduct - Producto de Shopify
 * @param {string|null} variantIdGuardado - ID de variante guardado en BD
 * @returns {Object|null} - Variante encontrada o null
 */
function buscarVariante(shopifyProduct, variantIdGuardado) {
  if (!shopifyProduct || !shopifyProduct.variants || shopifyProduct.variants.length === 0) {
    return null;
  }

  // Si no hay variant_id guardado, retornar null (se usará la primera por defecto)
  if (!variantIdGuardado) {
    return null;
  }

  const variantIdStr = String(variantIdGuardado);
  
  // Buscar por comparación de string (más seguro para BIGINT)
  let variant = shopifyProduct.variants.find(v => String(v.id) === variantIdStr);
  
  if (variant) {
    console.log(`✅ Variante encontrada por string: ${variantIdStr} -> ${variant.title || variant.option1 || 'Sin título'}`);
    return variant;
  }

  // Si no se encuentra, intentar como número (fallback)
  const variantIdNum = parseInt(variantIdStr);
  if (!isNaN(variantIdNum)) {
    variant = shopifyProduct.variants.find(v => parseInt(v.id) === variantIdNum);
    if (variant) {
      console.log(`✅ Variante encontrada por número: ${variantIdNum} -> ${variant.title || variant.option1 || 'Sin título'}`);
      return variant;
    }
  }

  console.log(`❌ Variante NO encontrada: ${variantIdStr}`);
  return null;
}

/**
 * Recupera productos de la lista desde la base de datos
 */
async function obtenerProductosLista(listaId, ipUsuario, usarListaPersonalizada = true) {
  // Intentar obtener lista personalizada si está habilitada
  if (usarListaPersonalizada) {
    try {
      const productosAgregados = await db.query(
        'SELECT producto_shopify_id, variant_id, cantidad, nombre_producto FROM listas_personalizadas_temp WHERE ip_usuario = ? AND lista_base_id = ? AND accion IN (?, ?) ORDER BY created_at ASC',
        [ipUsuario, listaId, 'agregado', 'modificado']
      );

      const productosEliminados = await db.query(
        'SELECT producto_shopify_id FROM listas_personalizadas_temp WHERE ip_usuario = ? AND lista_base_id = ? AND accion = ?',
        [ipUsuario, listaId, 'eliminado']
      );

      const idsEliminados = new Set(productosEliminados.map(p => p.producto_shopify_id));

      const productos = productosAgregados
        .filter(p => !idsEliminados.has(p.producto_shopify_id))
        .map(p => ({
          producto_shopify_id: p.producto_shopify_id,
          variant_id: normalizarVariantId(p.variant_id),
          cantidad: p.cantidad,
          nombre_producto: p.nombre_producto
        }));

      if (productos.length > 0) {
        console.log(`📋 Lista personalizada encontrada: ${productos.length} productos`);
        return productos;
      }
    } catch (error) {
      console.warn('⚠️ Error obteniendo lista personalizada:', error.message);
    }
  }

  // Si no hay lista personalizada, usar lista base
  const productosBD = await db.query(
    'SELECT producto_shopify_id, variant_id, cantidad, nombre_producto FROM productos_lista WHERE lista_id = ? ORDER BY orden ASC',
    [listaId]
  );

  const productos = productosBD.map(p => ({
    producto_shopify_id: p.producto_shopify_id,
    variant_id: normalizarVariantId(p.variant_id),
    cantidad: p.cantidad,
    nombre_producto: p.nombre_producto
  }));

  console.log(`📋 Lista base encontrada: ${productos.length} productos`);
  return productos;
}

// POST /api/shopify/carrito/lista/:listaId - Agregar lista completa al carrito (pública para clientes)
router.post('/carrito/lista/:listaId', async (req, res) => {
  try {
    const { listaId } = req.params;
    const { productos = [], es_lista_personalizada = false, usar_lista_personalizada = true } = req.body;
    const ipUsuario = req.ip || req.connection.remoteAddress;

    if (!shopifyAPI.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Shopify no está configurado'
      });
    }

    // Obtener productos de la lista
    let productosLista = [];

    if (es_lista_personalizada && productos.length > 0) {
      // Si viene desde el cliente con productos explícitos
      productosLista = productos.map(p => ({
        producto_shopify_id: p.producto_shopify_id,
        variant_id: normalizarVariantId(p.variant_id),
        cantidad: p.cantidad,
        nombre_producto: p.nombre || p.nombre_producto
      }));
      console.log(`📋 Productos recibidos desde cliente: ${productosLista.length}`);
    } else {
      // Obtener desde la base de datos
      productosLista = await obtenerProductosLista(listaId, ipUsuario, usar_lista_personalizada);
    }

    if (productosLista.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No se encontraron productos en esta lista'
      });
    }

    // Log de productos recuperados
    console.log('📦 Productos a procesar:', productosLista.map(p => ({
      producto_id: p.producto_shopify_id,
      variant_id: p.variant_id,
      cantidad: p.cantidad,
      nombre: p.nombre_producto
    })));

    // Procesar cada producto y agregar al carrito
    const itemsCarrito = [];
    const productosSinStock = [];

    for (const productoLista of productosLista) {
      try {
        // Validar ID del producto
        const productId = parseInt(productoLista.producto_shopify_id);
        if (isNaN(productId)) {
          console.warn(`⚠️ ID de producto inválido: ${productoLista.producto_shopify_id}`);
          productosSinStock.push({
            id: productoLista.producto_shopify_id,
            title: 'Producto con ID inválido',
            cantidad_solicitada: productoLista.cantidad,
            stock_disponible: 0
          });
          continue;
        }

        // Obtener producto de Shopify
        const shopifyProduct = await shopifyAPI.getProduct(productId);

        if (shopifyProduct.status !== 'active') {
          productosSinStock.push({
            id: productId,
            title: shopifyProduct.title || 'Producto inactivo',
            cantidad_solicitada: productoLista.cantidad,
            stock_disponible: 0
          });
          continue;
        }

        if (!shopifyProduct.variants || shopifyProduct.variants.length === 0) {
          productosSinStock.push({
            id: productId,
            title: shopifyProduct.title || 'Producto sin variantes',
            cantidad_solicitada: productoLista.cantidad,
            stock_disponible: 0
          });
          continue;
        }

        // Buscar la variante correcta
        let variant = buscarVariante(shopifyProduct, productoLista.variant_id);

        // Si no se encuentra la variante guardada, usar la primera
        if (!variant) {
          variant = shopifyProduct.variants[0];
          console.log(`⚠️ Usando primera variante por defecto para producto ${productId}: ${variant.title || variant.option1 || 'Sin título'} (ID: ${variant.id})`);
        } else {
          console.log(`✅ Usando variante guardada para producto ${productId}: ${variant.title || variant.option1 || 'Sin título'} (ID: ${variant.id})`);
        }

        // Verificar stock y agregar al carrito
        // Manejar casos donde inventory_quantity puede ser null (sin seguimiento de inventario)
        const inventoryQty = variant.inventory_quantity;
        const hasInventoryTracking = variant.inventory_management !== null && variant.inventory_management !== undefined;
        const canAddToCart = !hasInventoryTracking || inventoryQty === null || inventoryQty === undefined || inventoryQty >= productoLista.cantidad;
        
        if (canAddToCart) {
          itemsCarrito.push({
            variant_id: variant.id,
            quantity: productoLista.cantidad
          });
          const stockInfo = hasInventoryTracking && inventoryQty !== null ? ` (Stock: ${inventoryQty})` : ' (Sin seguimiento de inventario)';
          console.log(`✅ Agregado al carrito: ${shopifyProduct.title} - Variante ${variant.id} x${productoLista.cantidad}${stockInfo}`);
        } else {
          productosSinStock.push({
            id: productId,
            title: shopifyProduct.title,
            cantidad_solicitada: productoLista.cantidad,
            stock_disponible: inventoryQty || 0
          });
          console.log(`❌ Sin stock suficiente: ${shopifyProduct.title} - Disponible: ${inventoryQty || 0}, Solicitado: ${productoLista.cantidad}`);
        }

      } catch (error) {
        console.error(`❌ Error procesando producto ${productoLista.producto_shopify_id}:`, error.message);
        console.error(`❌ Stack trace:`, error.stack);
        
        let errorType = 'Error al procesar producto';
        if (error.response?.status === 404) {
          errorType = 'Producto no existe en Shopify';
        } else if (error.response?.status === 403) {
          errorType = 'Sin permisos para acceder al producto';
        } else if (error.response?.status === 429) {
          errorType = 'Límite de solicitudes excedido (rate limit)';
        } else if (error.response?.status >= 500) {
          errorType = 'Error del servidor de Shopify';
        }
        
        productosSinStock.push({
          id: productoLista.producto_shopify_id,
          title: errorType,
          cantidad_solicitada: productoLista.cantidad,
          stock_disponible: 0,
          error: error.message
        });
      }
    }

    // Generar URL del carrito
    let carritoUrl = null;
    if (itemsCarrito.length > 0) {
      try {
        const baseUrl = process.env.SHOPIFY_SHOP_URL.replace('https://', '').replace('.myshopify.com', '');
        const cartItems = itemsCarrito.map(item => `${item.variant_id}:${item.quantity}`).join(',');
        carritoUrl = `https://${baseUrl}.myshopify.com/cart/${cartItems}`;
        console.log(`🛒 URL de carrito generada: ${carritoUrl}`);
      } catch (error) {
        console.error('❌ Error generando URL de carrito:', error);
        return res.status(500).json({
          success: false,
          error: 'Error generando URL de carrito',
          details: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        carrito_url: carritoUrl,
        productos_agregados: itemsCarrito.length,
        productos_sin_stock: productosSinStock,
        total_productos_lista: productosLista.length
      },
      message: `Se prepararon ${itemsCarrito.length} productos para el carrito. ${productosSinStock.length} productos sin stock.`
    });

  } catch (error) {
    console.error('❌ Error agregando lista al carrito:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// GET /api/shopify/status - Verificar estado de conexión con Shopify
router.get('/status', async (req, res) => {
  try {
    const configurado = shopifyAPI.isConfigured();
    
    if (!configurado) {
      return res.json({
        success: false,
        connected: false,
        message: 'Shopify no está configurado',
        required_vars: [
          'SHOPIFY_SHOP_URL',
          'SHOPIFY_ACCESS_TOKEN'
        ]
      });
    }

    // Intentar obtener productos para verificar conexión
    try {
      const productos = await shopifyAPI.getProducts(1);
      res.json({
        success: true,
        connected: true,
        message: 'Conexión exitosa con Shopify',
        shop_url: process.env.SHOPIFY_SHOP_URL,
        productos_disponibles: productos.length > 0
      });
    } catch (error) {
      res.json({
        success: false,
        connected: false,
        message: 'Error conectando con Shopify',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Error verificando estado de Shopify:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// POST /api/shopify/carrito/personalizado - Crear carrito con productos personalizados
router.post('/carrito/personalizado', async (req, res) => {
  try {
    const { productos } = req.body;
    
    console.log('🛒 Recibiendo productos para carrito personalizado:', productos);

    if (!productos || !Array.isArray(productos)) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de productos'
      });
    }

    if (!shopifyAPI.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Shopify no está configurado'
      });
    }

    // Normalizar productos recibidos
    const productosNormalizados = productos.map(p => ({
      producto_shopify_id: p.producto_shopify_id,
      variant_id: normalizarVariantId(p.variant_id),
      cantidad: p.cantidad || 1,
      nombre_producto: p.nombre_producto || p.nombre || 'Producto'
    }));

    console.log('📦 Productos normalizados:', productosNormalizados.map(p => ({
      producto_id: p.producto_shopify_id,
      variant_id: p.variant_id,
      cantidad: p.cantidad
    })));

    // Procesar cada producto
    const itemsCarrito = [];
    const productosSinStock = [];

    for (const producto of productosNormalizados) {
      try {
        // Validar y limpiar ID del producto
        let productId = producto.producto_shopify_id;
        if (typeof productId === 'string' && productId.includes('.')) {
          productId = productId.split('.')[0];
        }
        productId = parseInt(productId, 10);

        if (isNaN(productId)) {
          throw new Error('ID de producto inválido');
        }

        // Obtener producto de Shopify
        const shopifyProduct = await shopifyAPI.getProduct(productId);

        if (shopifyProduct.status !== 'active') {
          productosSinStock.push({
            id: productId,
            title: shopifyProduct.title || 'Producto inactivo',
            cantidad_solicitada: producto.cantidad,
            stock_disponible: 0
          });
          continue;
        }

        if (!shopifyProduct.variants || shopifyProduct.variants.length === 0) {
          productosSinStock.push({
            id: productId,
            title: shopifyProduct.title || 'Producto sin variantes',
            cantidad_solicitada: producto.cantidad,
            stock_disponible: 0
          });
          continue;
        }

        // Buscar la variante correcta
        let variant = buscarVariante(shopifyProduct, producto.variant_id);

        // Si no se encuentra, usar la primera
        if (!variant) {
          variant = shopifyProduct.variants[0];
          console.log(`⚠️ Usando primera variante por defecto para producto ${productId}: ${variant.title || variant.option1 || 'Sin título'} (ID: ${variant.id})`);
        } else {
          console.log(`✅ Usando variante guardada para producto ${productId}: ${variant.title || variant.option1 || 'Sin título'} (ID: ${variant.id})`);
        }

        // Verificar stock y agregar al carrito
        // Manejar casos donde inventory_quantity puede ser null (sin seguimiento de inventario)
        const inventoryQty = variant.inventory_quantity;
        const hasInventoryTracking = variant.inventory_management !== null && variant.inventory_management !== undefined;
        const canAddToCart = !hasInventoryTracking || inventoryQty === null || inventoryQty === undefined || inventoryQty >= producto.cantidad;
        
        if (canAddToCart) {
          itemsCarrito.push({
            variant_id: variant.id,
            quantity: producto.cantidad
          });
          const stockInfo = hasInventoryTracking && inventoryQty !== null ? ` (Stock: ${inventoryQty})` : ' (Sin seguimiento de inventario)';
          console.log(`✅ Agregado al carrito: ${shopifyProduct.title} - Variante ${variant.id} x${producto.cantidad}${stockInfo}`);
        } else {
          productosSinStock.push({
            id: productId,
            title: shopifyProduct.title,
            cantidad_solicitada: producto.cantidad,
            stock_disponible: inventoryQty || 0
          });
          console.log(`❌ Sin stock suficiente: ${shopifyProduct.title} - Disponible: ${inventoryQty || 0}, Solicitado: ${producto.cantidad}`);
        }

      } catch (error) {
        console.error(`❌ Error procesando producto ${producto.producto_shopify_id}:`, error.message);
        console.error(`❌ Stack trace:`, error.stack);
        
        let errorType = 'Error al procesar producto';
        if (error.response?.status === 404) {
          errorType = 'Producto no existe en Shopify';
        } else if (error.response?.status === 403) {
          errorType = 'Sin permisos para acceder al producto';
        } else if (error.response?.status === 429) {
          errorType = 'Límite de solicitudes excedido (rate limit)';
        } else if (error.response?.status >= 500) {
          errorType = 'Error del servidor de Shopify';
        }
        
        productosSinStock.push({
          id: producto.producto_shopify_id,
          title: errorType,
          cantidad_solicitada: producto.cantidad,
          stock_disponible: 0,
          error: error.message
        });
      }
    }

    // Generar URL del carrito
    let carritoUrl = null;
    if (itemsCarrito.length > 0) {
      try {
        const baseUrl = process.env.SHOPIFY_SHOP_URL.replace('https://', '').replace('.myshopify.com', '');
        const cartItems = itemsCarrito.map(item => `${item.variant_id}:${item.quantity}`).join(',');
        carritoUrl = `https://${baseUrl}.myshopify.com/cart/${cartItems}`;
        console.log(`🛒 URL de carrito generada: ${carritoUrl}`);
      } catch (error) {
        console.error('❌ Error generando URL de carrito:', error);
        return res.status(500).json({
          success: false,
          error: 'Error generando URL de carrito',
          details: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        carrito_url: carritoUrl,
        productos_agregados: itemsCarrito.length,
        productos_sin_stock: productosSinStock,
        total_productos_solicitados: productos.length
      },
      message: `Se prepararon ${itemsCarrito.length} productos para el carrito. ${productosSinStock.length} productos sin stock.`
    });

  } catch (error) {
    console.error('❌ Error creando carrito personalizado:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// GET /api/shopify/test - Ruta de prueba para verificar conexión
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Probando conexión con Shopify...');
    
    if (!shopifyAPI.isConfigured()) {
      return res.json({
        success: false,
        error: 'Shopify no está configurado'
      });
    }

    // Intentar obtener un producto de prueba
    const testProductId = 15139292742003; // ID de un producto que sabemos que existe
    console.log('🔍 Probando obtener producto con ID:', testProductId);
    
    const product = await shopifyAPI.getProduct(testProductId);
    
    console.log('📦 Producto de prueba obtenido:', {
      id: product.id,
      title: product.title,
      status: product.status,
      variants_count: product.variants?.length || 0
    });

    res.json({
      success: true,
      message: 'Conexión con Shopify exitosa',
      product: {
        id: product.id,
        title: product.title,
        status: product.status,
        variants: product.variants?.map(v => ({
          id: v.id,
          inventory_quantity: v.inventory_quantity
        })) || []
      }
    });
  } catch (error) {
    console.error('❌ Error en prueba de Shopify:', error);
    res.status(500).json({
      success: false,
      error: 'Error conectando con Shopify',
      details: error.message
    });
  }
});

module.exports = router;
