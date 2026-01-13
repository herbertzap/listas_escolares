// Cargar variables de entorno
require('dotenv').config({ path: './env.local' });

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

// Importar integraciones
const ShopifyEmbeddedApp = require('./shopify-embedded');
const CheckoutIntegration = require('./checkout-integration');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de Shopify (solo desde variables de entorno)
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_SHOP_URL = process.env.SHOPIFY_SHOP_URL || 'https://bichoto.myshopify.com';

if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET || !SHOPIFY_ACCESS_TOKEN) {
  console.error('❌ Error: Faltan variables de entorno de Shopify. Verifica tu archivo .env o env.local');
  process.exit(1);
}

// Configuración para cPanel
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'public'));

// Rutas principales
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta de instalación de Shopify
app.get('/auth', (req, res) => {
    const shop = req.query.shop;
    if (!shop) {
        return res.status(400).send('Parámetro shop requerido');
    }
    
    const nonce = crypto.randomBytes(16).toString('hex');
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/callback`;
    
    const authUrl = `https://${shop}/admin/oauth/authorize?` +
        `client_id=${SHOPIFY_API_KEY}&` +
        `scope=write_orders,read_orders,write_metafields,read_metafields&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${nonce}`;
    
    res.redirect(authUrl);
});

// Callback de autenticación
app.get('/auth/callback', async (req, res) => {
    const { shop, code, state } = req.query;
    
    if (!shop || !code) {
        return res.status(400).send('Parámetros requeridos faltantes');
    }
    
    try {
        // Intercambiar código por access token
        const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: SHOPIFY_API_KEY,
                client_secret: SHOPIFY_API_SECRET,
                code: code
            })
        });
        
        const tokenData = await tokenResponse.json();
        
        if (tokenData.access_token) {
            // Guardar el access token (en producción usar base de datos)
            console.log('Access token obtenido:', tokenData.access_token);
            
            // Redirigir a la aplicación
            res.redirect(`/?shop=${shop}&installed=true`);
        } else {
            res.status(400).send('Error obteniendo access token');
        }
    } catch (error) {
        console.error('Error en callback:', error);
        res.status(500).send('Error en autenticación');
    }
});

// API para validar RUT chileno
app.post('/api/validate-rut', (req, res) => {
    const { rut } = req.body;
    
    if (!rut) {
        return res.status(400).json({ valid: false, message: 'RUT es requerido' });
    }

    const isValid = validateRut(rut);
    res.json({ valid: isValid, message: isValid ? 'RUT válido' : 'RUT inválido' });
});

// API para guardar datos de facturación
app.post('/api/save-billing-data', async (req, res) => {
    try {
        const { orderId, billingData } = req.body;
        
        // Usar las credenciales existentes para guardar en Shopify
        await saveToShopify(SHOPIFY_SHOP_URL.replace('https://', ''), SHOPIFY_ACCESS_TOKEN, orderId, billingData);
        
        res.json({ success: true, message: 'Datos guardados correctamente en Shopify' });
    } catch (error) {
        console.error('Error al guardar datos:', error);
        res.status(500).json({ success: false, message: 'Error al guardar datos' });
    }
});

// Función para guardar en Shopify
async function saveToShopify(shop, accessToken, orderId, billingData) {
    const metafields = [
        {
            namespace: 'bigbuda',
            key: 'document_type',
            value: billingData.documentType,
            type: 'single_line_text_field'
        }
    ];

    if (billingData.documentType === 'boleta' && billingData.customerRut) {
        metafields.push({
            namespace: 'bigbuda',
            key: 'customer_rut',
            value: billingData.customerRut,
            type: 'single_line_text_field'
        });
    } else if (billingData.documentType === 'factura') {
        if (billingData.companyRut) {
            metafields.push({
                namespace: 'bigbuda',
                key: 'company_rut',
                value: billingData.companyRut,
                type: 'single_line_text_field'
            });
        }
        if (billingData.companyName) {
            metafields.push({
                namespace: 'bigbuda',
                key: 'company_name',
                value: billingData.companyName,
                type: 'single_line_text_field'
            });
        }
        if (billingData.companyActivity) {
            metafields.push({
                namespace: 'bigbuda',
                key: 'company_activity',
                value: billingData.companyActivity,
                type: 'single_line_text_field'
            });
        }
    }

    // Guardar metafields en Shopify
    for (const metafield of metafields) {
        await fetch(`https://${shop}/admin/api/2023-10/orders/${orderId}/metafields.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': accessToken
            },
            body: JSON.stringify({ metafield })
        });
    }
}

// Función para validar RUT chileno
function validateRut(rut) {
    // Limpiar el RUT
    rut = rut.replace(/[^0-9kK]/gi, '');
    
    if (rut.length < 2) return false;
    
    const dv = rut.slice(-1).toUpperCase();
    const numero = rut.slice(0, -1);
    
    if (numero.length < 1) return false;
    
    let suma = 0;
    let multiplicador = 2;
    
    // Calcular dígito verificador
    for (let i = numero.length - 1; i >= 0; i--) {
        suma += parseInt(numero[i]) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    
    const dvCalculado = 11 - (suma % 11);
    let dvEsperado;
    
    if (dvCalculado === 11) {
        dvEsperado = '0';
    } else if (dvCalculado === 10) {
        dvEsperado = 'K';
    } else {
        dvEsperado = dvCalculado.toString();
    }
    
    return dv === dvEsperado;
}

// Ruta de prueba para verificar que el servidor funciona
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'BigBuda Boleta Factura funcionando correctamente',
        timestamp: new Date().toISOString(),
        shop: SHOPIFY_SHOP_URL
    });
});

// Ruta para probar conexión con Shopify
app.get('/api/test-shopify', async (req, res) => {
    try {
        const response = await fetch(`${SHOPIFY_SHOP_URL}/admin/api/2023-10/shop.json`, {
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
            }
        });
        
        if (response.ok) {
            const shopData = await response.json();
            res.json({
                success: true,
                message: 'Conexión con Shopify exitosa',
                shop: shopData.shop
            });
        } else {
            res.status(response.status).json({
                success: false,
                message: 'Error conectando con Shopify',
                status: response.status
            });
        }
    } catch (error) {
        console.error('Error testing Shopify connection:', error);
        res.status(500).json({
            success: false,
            message: 'Error conectando con Shopify',
            error: error.message
        });
    }
});

// Manejar rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Inicializar integraciones
new ShopifyEmbeddedApp(app);
new CheckoutIntegration(app);

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Aplicación BigBuda Boleta Factura iniciada`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Tienda: ${SHOPIFY_SHOP_URL}`);
    console.log(`Checkout script: http://localhost:${PORT}/checkout-script.js`);
    console.log(`Embedded app: http://localhost:${PORT}/embedded`);
});

module.exports = app;
