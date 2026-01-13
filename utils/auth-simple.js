const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET = process.env.SESSION_SECRET || 'tu-secret-key-muy-seguro';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Log de configuración al cargar el módulo
console.log('🔐 Configuración de autenticación:', {
    ADMIN_USERNAME: ADMIN_USERNAME,
    ADMIN_PASSWORD: ADMIN_PASSWORD ? '***' : 'NO CONFIGURADO',
    desde_env: {
        username: !!process.env.ADMIN_USERNAME,
        password: !!process.env.ADMIN_PASSWORD
    }
});

// Verificar credenciales
function verifyCredentials(username, password) {
    // Logs de depuración
    console.log('🔐 Intento de login:', {
        username_recibido: username,
        password_recibido: password ? '***' : 'vacío',
        username_esperado: ADMIN_USERNAME,
        password_esperado: ADMIN_PASSWORD ? '***' : 'vacío',
        username_coincide: username === ADMIN_USERNAME,
        password_coincide: password === ADMIN_PASSWORD
    });
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        console.log('✅ Credenciales válidas');
        return { success: true };
    }
    
    console.log('❌ Credenciales inválidas');
    return { success: false, error: 'Credenciales inválidas' };
}

// Generar token
function generateToken() {
    return jwt.sign(
        { username: ADMIN_USERNAME, role: 'admin' },
        SECRET,
        { expiresIn: '24h' }
    );
}

// Verificar token
function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, SECRET);
        return { success: true, user: decoded };
    } catch (error) {
        return { success: false, error: 'Token inválido' };
    }
}

// Middleware para verificar autenticación
function requireAuth(req, res, next) {
    const token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(401).json({ success: false, error: 'No autenticado' });
        }
        return res.redirect('/auth/login');
    }
    
    const result = verifyToken(token);
    if (!result.success) {
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(401).json({ success: false, error: 'Token inválido' });
        }
        return res.redirect('/auth/login');
    }
    
    req.user = result.user;
    next();
}

module.exports = {
    verifyCredentials,
    generateToken,
    verifyToken,
    requireAuth
};

