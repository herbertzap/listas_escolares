const express = require('express');
const router = express.Router();
const auth = require('../utils/auth-simple');

// GET /auth/login - Página de login
router.get('/login', (req, res) => {
    const token = req.cookies?.auth_token;
    if (token && auth.verifyToken(token).success) {
        return res.redirect('/admin');
    }
    
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Sistema de Listas Escolares</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-card {
            background: white;
            border-radius: 15px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            max-width: 400px;
            width: 100%;
        }
        .login-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        .login-body {
            padding: 2rem;
        }
        .btn-login {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            width: 100%;
            padding: 12px;
            font-weight: 600;
        }
        .btn-login:hover {
            background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
        }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="login-header">
            <i class="fas fa-graduation-cap fa-3x mb-3"></i>
            <h3>Sistema de Listas Escolares</h3>
            <p class="mb-0">Acceso de Administrador</p>
        </div>
        <div class="login-body">
            <div id="alert-container"></div>
            <form id="loginForm">
                <div class="form-floating mb-3">
                    <input type="text" class="form-control" id="username" placeholder="Usuario" required>
                    <label for="username"><i class="fas fa-user me-2"></i>Usuario</label>
                </div>
                <div class="form-floating mb-3">
                    <input type="password" class="form-control" id="password" placeholder="Contraseña" required>
                    <label for="password"><i class="fas fa-lock me-2"></i>Contraseña</label>
                </div>
                <button type="submit" class="btn btn-primary btn-login">
                    <i class="fas fa-sign-in-alt me-2"></i>Iniciar Sesión
                </button>
            </form>
        </div>
    </div>
    <script>
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const submitBtn = this.querySelector('button[type="submit"]');
            const alertContainer = document.getElementById('alert-container');
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Iniciando...';
            
            try {
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    window.location.href = '/admin';
                } else {
                    alertContainer.innerHTML = '<div class="alert alert-danger">' + (result.error || 'Error en el inicio de sesión') + '</div>';
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Iniciar Sesión';
                }
            } catch (error) {
                alertContainer.innerHTML = '<div class="alert alert-danger">Error de conexión</div>';
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Iniciar Sesión';
            }
        });
    </script>
</body>
</html>`;
    
    res.send(html);
});

// POST /auth/login - Procesar login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    console.log('📥 Intento de login recibido:', {
        username: username,
        password: password ? '***' : 'vacío',
        body_completo: req.body,
        ip: req.ip || req.connection.remoteAddress
    });
    
    if (!username || !password) {
        console.log('❌ Faltan credenciales');
        return res.status(400).json({
            success: false,
            error: 'Usuario y contraseña son requeridos'
        });
    }
    
    const result = auth.verifyCredentials(username, password);
    
    if (result.success) {
        const token = auth.generateToken();
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax',
            path: '/'
        });
        
        res.json({
            success: true,
            redirect: '/admin'
        });
    } else {
        res.status(401).json({
            success: false,
            error: result.error
        });
    }
});

// GET /auth/logout - Cerrar sesión
router.get('/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.redirect('/auth/login');
});

// GET /auth/status - Verificar estado de autenticación
router.get('/status', (req, res) => {
    const token = req.cookies?.auth_token;
    if (token) {
        const result = auth.verifyToken(token);
        if (result.success) {
            return res.json({
                success: true,
                authenticated: true,
                user: result.user
            });
        }
    }
    res.json({
        success: true,
        authenticated: false
    });
});

module.exports = router;

