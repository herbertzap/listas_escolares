const axios = require('axios');

class ShopifyAPI {
  constructor() {
    this.shopUrl = process.env.SHOPIFY_SHOP_URL;
    this.apiKey = process.env.SHOPIFY_API_KEY;
    this.apiSecret = process.env.SHOPIFY_API_SECRET;
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    
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

  // Obtener un producto específico
  async getProduct(productId) {
    try {
      // Validar que el ID sea un número válido
      const id = parseInt(productId);
      if (isNaN(id)) {
        throw new Error(`ID de producto inválido: ${productId}`);
      }
      
      const response = await axios.get(`${this.shopUrl}/admin/api/2023-10/products/${id}.json`, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.product;
    } catch (error) {
      console.error('❌ Error obteniendo producto de Shopify:', error.message);
      throw error;
    }
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
