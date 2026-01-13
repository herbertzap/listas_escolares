const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
// Cargar variables de entorno
require('dotenv').config();

// Importar base de datos
const db = require('./utils/database');

// Importar rutas
const chileRoutes = require('./routes/chile');
const listasRoutes = require('./routes/listas');
const shopifyRoutes = require('./routes/shopify');
const authRoutes = require('./routes/auth-simple');

// Importar middleware de autenticación simple
const { requireAuth } = require('./utils/auth-simple');

const app = express();
const PORT = process.env.PORT || 3000;

// Confiar en el proxy (necesario para que funcione correctamente con Apache)
app.set('trust proxy', 1);

// Middleware
app.use(cookieParser());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rutas públicas (no requieren autenticación)
app.use('/auth', authRoutes);
app.use('/api/chile', chileRoutes);

// Rutas públicas de listas (GET) y protegidas (POST, PUT, DELETE)
app.use('/api/listas', listasRoutes);
// Rutas de Shopify - algunas públicas (carrito) y otras protegidas
app.use('/api/shopify', shopifyRoutes);

// Ruta protegida para el panel de administración
app.get('/admin', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
    });
});

// Función para limpiar listas temporales antiguas (más de 1 hora)
async function limpiarListasTemporales() {
    try {
        const resultado = await db.query(
            'DELETE FROM listas_personalizadas_temp WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)'
        );
        if (resultado.affectedRows > 0) {
            console.log(`🧹 Limpieza automática: ${resultado.affectedRows} registros temporales eliminados`);
        }
    } catch (error) {
        console.error('❌ Error en limpieza automática:', error);
    }
}

// Función para inicializar la aplicación
async function initializeApp() {
    try {
        // Inicializar base de datos
        console.log('🗄️ Inicializando base de datos...');
        await db.initializeDatabase();
        
        // Limpiar listas temporales antiguas al iniciar
        await limpiarListasTemporales();
        
        // Configurar limpieza automática cada hora
        setInterval(limpiarListasTemporales, 60 * 60 * 1000); // Cada 1 hora
        console.log('🧹 Limpieza automática de listas temporales configurada (cada 1 hora)');
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
            console.log(`📱 Cliente: http://localhost:${PORT}`);
            console.log(`🔐 Admin: http://localhost:${PORT}/admin`);
            console.log(`🔑 Login: http://localhost:${PORT}/auth/login`);
            
            if (process.env.NODE_ENV === 'production') {
                console.log('🌐 Modo: PRODUCCIÓN');
            } else {
                console.log('🔧 Modo: DESARROLLO');
            }
        });
    } catch (error) {
        console.error('❌ Error inicializando la aplicación:', error);
        process.exit(1);
    }
}

// Iniciar aplicación
initializeApp();
