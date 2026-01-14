const axios = require('axios');

class ShopifyAPI {
  constructor() {
    this.shopUrl = process.env.SHOPIFY_SHOP_URL;
    this.apiKey = process.env.SHOPIFY_API_KEY;
    this.apiSecret = process.env.SHOPIFY_API_SECRET;
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    
    // Rate limiting: Shopify permite ~2 solicitudes por segundo
    // Usaremos 500ms entre solicitudes para estar seguros
    this.requestDelay = 500; // milisegundos entre solicitudes
    this.lastRequestTime = 0;
    
    // Cache de productos para evitar solicitudes repetidas
    this.productCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    
    console.log('🔧 Configuración de Shopify:', {
      shopUrl: this.shopUrl,
      hasApiKey: !!this.apiKey,
      hasApiSecret: !!this.apiSecret,
      hasAccessToken: !!this.accessToken
    });
    
    if (!this.shopUrl || !this.accessToken) {
      console.warn('⚠️ Credenciales de Shopify no configuradas completamente');
    }
  }

  /**
   * Espera el tiempo necesario para respetar el rate limit
   */
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      const waitTime = this.requestDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Retry con exponential backoff para errores de rate limit
   */
  async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.waitForRateLimit();
        return await fn();
      } catch (error) {
        const isRateLimit = error.response?.status === 429;
        const isServerError = error.response?.status >= 500;
        
        if ((isRateLimit || isServerError) && attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(`⏳ Rate limit detectado. Esperando ${delay}ms antes de reintentar (intento ${attempt + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  }

  // Obtener productos de Shopify con paginación
  async getProducts(limit = 50) {
    try {
      console.log(`🔧 Llamando a Shopify API: ${this.shopUrl}/admin/api/2023-10/products.json`);
      console.log(`🔧 Parámetros: limit=${limit} (todos los productos)`);
      console.log(`🔧 URL completa: ${this.shopUrl}/admin/api/2023-10/products.json?limit=${limit}`);
      
      const response = await axios.get(`${this.shopUrl}/admin/api/2023-10/products.json`, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        params: {
          limit: limit
          // Removido status: 'active' para obtener todos los productos
        }
      });
      
      console.log(`✅ Respuesta exitosa de Shopify: ${response.data.products?.length || 0} productos`);
      return response.data.products;
    } catch (error) {
      console.error('❌ Error obteniendo productos de Shopify:', error.message);
      console.error('❌ URL llamada:', `${this.shopUrl}/admin/api/2023-10/products.json`);
      console.error('❌ Headers:', {
        'X-Shopify-Access-Token': this.accessToken ? '***' : 'NO TOKEN',
        'Content-Type': 'application/json'
      });
      console.error('❌ Error completo:', error);
      throw error;
    }
  }

  // Obtener TODOS los productos de Shopify usando paginación
  async getAllProducts() {
    try {
      console.log(`🔧 Obteniendo TODOS los productos de Shopify con paginación...`);
      
      let allProducts = [];
      let hasNextPage = true;
      let nextPageInfo = null;
      let pageCount = 0;
      
      while (hasNextPage) {
        pageCount++;
        console.log(`🔧 Página ${pageCount} - Productos obtenidos hasta ahora: ${allProducts.length}`);
        
        const params = {
          limit: 250 // Máximo permitido por Shopify
        };
        
        if (nextPageInfo) {
          params.page_info = nextPageInfo;
        }
        
        const response = await axios.get(`${this.shopUrl}/admin/api/2023-10/products.json`, {
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          },
          params: params
        });
        
        const products = response.data.products || [];
        allProducts = allProducts.concat(products);
        
        console.log(`✅ Página ${pageCount}: ${products.length} productos`);
        
        // Verificar si hay siguiente página
        const linkHeader = response.headers.link;
        if (linkHeader && linkHeader.includes('rel="next"')) {
          const nextMatch = linkHeader.match(/<[^>]*page_info=([^&>]+)[^>]*>;\s*rel="next"/);
          if (nextMatch) {
            nextPageInfo = nextMatch[1];
          } else {
            hasNextPage = false;
          }
        } else {
          hasNextPage = false;
        }
        
        // Evitar bucle infinito (máximo 10 páginas)
        if (pageCount >= 10) {
          console.log(`⚠️ Límite de páginas alcanzado (${pageCount})`);
          hasNextPage = false;
        }
      }
      
      console.log(`✅ Total de productos obtenidos: ${allProducts.length}`);
      return allProducts;
    } catch (error) {
      console.error('❌ Error obteniendo todos los productos de Shopify:', error.message);
      throw error;
    }
  }

  // Obtener un producto específico con cache y rate limiting
  async getProduct(productId, useCache = true) {
    try {
      // Validar que el ID sea un número válido
      const id = parseInt(productId);
      if (isNaN(id)) {
        throw new Error(`ID de producto inválido: ${productId}`);
      }

      // Verificar cache
      if (useCache && this.productCache.has(id)) {
        const cached = this.productCache.get(id);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          console.log(`📦 Producto ${id} obtenido del cache`);
          return cached.product;
        } else {
          this.productCache.delete(id);
        }
      }

      // Obtener producto con retry y rate limiting
      const product = await this.retryWithBackoff(async () => {
        const response = await axios.get(`${this.shopUrl}/admin/api/2023-10/products/${id}.json`, {
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        });
        return response.data.product;
      });

      // Guardar en cache
      if (useCache) {
        this.productCache.set(id, {
          product: product,
          timestamp: Date.now()
        });
      }

      return product;
    } catch (error) {
      console.error(`❌ Error obteniendo producto ${productId} de Shopify:`, error.message);
      if (error.response?.status === 429) {
        console.error('⚠️ Rate limit excedido. Considera reducir la cantidad de productos o esperar unos momentos.');
      }
      throw error;
    }
  }

  /**
   * Obtener múltiples productos de forma eficiente (agrupa IDs únicos)
   */
  async getProductsBatch(productIds, useCache = true) {
    // Filtrar IDs únicos
    const uniqueIds = [...new Set(productIds.map(id => parseInt(id)).filter(id => !isNaN(id)))];
    
    console.log(`📦 Obteniendo ${uniqueIds.length} productos únicos de ${productIds.length} solicitados`);

    const products = [];
    const errors = [];

    for (let i = 0; i < uniqueIds.length; i++) {
      const productId = uniqueIds[i];
      try {
        const product = await this.getProduct(productId, useCache);
        products.push(product);
        
        // Log de progreso cada 10 productos
        if ((i + 1) % 10 === 0) {
          console.log(`📊 Progreso: ${i + 1}/${uniqueIds.length} productos obtenidos`);
        }
      } catch (error) {
        errors.push({ id: productId, error: error.message });
        console.error(`❌ Error obteniendo producto ${productId}:`, error.message);
      }
    }

    console.log(`✅ Obtenidos ${products.length} productos exitosamente. ${errors.length} errores.`);

    return { products, errors };
  }

  // Obtener inventario de un producto
  async getInventoryLevel(productId) {
    try {
      const response = await axios.get(`${this.shopUrl}/admin/api/2023-10/inventory_levels.json`, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        params: {
          inventory_item_ids: productId
        }
      });
      
      return response.data.inventory_levels;
    } catch (error) {
      console.error('❌ Error obteniendo inventario de Shopify:', error.message);
      throw error;
    }
  }

  // Crear carrito con productos
  async createCart(items) {
    try {
      const cartData = {
        line_items: items.map(item => ({
          variant_id: item.variant_id,
          quantity: item.quantity
        }))
      };

      const response = await axios.post(`${this.shopUrl}/admin/api/2023-10/draft_orders.json`, {
        draft_order: cartData
      }, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.draft_order;
    } catch (error) {
      console.error('❌ Error creando carrito en Shopify:', error.message);
      throw error;
    }
  }

  // Obtener imagen principal de un producto
  getProductImage(producto) {
    // Intentar obtener la imagen principal
    if (producto.image && producto.image.src) {
      return producto.image.src;
    }
    // Si no hay imagen principal, intentar con el array de imágenes
    if (producto.images && producto.images.length > 0) {
      // Buscar la primera imagen que tenga src
      const imagen = producto.images.find(img => img.src);
      if (imagen) {
        return imagen.src;
      }
      // Si no, usar la primera del array
      return producto.images[0].src || null;
    }
    return null;
  }

  // Verificar si las credenciales están configuradas
  isConfigured() {
    return !!(this.shopUrl && this.accessToken);
  }
}

module.exports = new ShopifyAPI();
