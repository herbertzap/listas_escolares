const express = require('express');
const router = express.Router();
const simpleAuth = require('../utils/auth');

// GET /auth/login - Página de login
router.get('/login', (req, res) => {
  // Si ya está autenticado, redirigir al admin
  if (simpleAuth.isAuthenticated(req.session)) {
    return res.redirect('/admin');
  }
  
  // Servir el HTML directamente
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
        .form-floating {
            margin-bottom: 1rem;
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
        .alert {
            border-radius: 10px;
            border: none;
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
                <div class="form-floating">
                    <input type="text" class="form-control" id="username" placeholder="Usuario" required>
                    <label for="username">
                        <i class="fas fa-user me-2"></i>Usuario
                    </label>
                </div>
                
                <div class="form-floating">
                    <input type="password" class="form-control" id="password" placeholder="Contraseña" required>
                    <label for="password">
                        <i class="fas fa-lock me-2"></i>Contraseña
                    </label>
                </div>
                
                <button type="submit" class="btn btn-primary btn-login">
                    <i class="fas fa-sign-in-alt me-2"></i>Iniciar Sesión
                </button>
            </form>
            
            <div class="text-center mt-3">
                <small class="text-muted">
                    <i class="fas fa-shield-alt me-1"></i>
                    Acceso seguro para administradores
                </small>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const submitBtn = this.querySelector('button[type="submit"]');
            const alertContainer = document.getElementById('alert-container');
            
            // Mostrar loading
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Iniciando...';
            
            try {
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Debug: mostrar información
                    console.log('✅ Login exitoso, redirigiendo a:', result.redirect || '/admin');
                    console.log('📍 URL actual:', window.location.href);
                    console.log('🔄 Iniciando redirección...');
                    // Esperar un momento para asegurar que la cookie se guarde
                    setTimeout(() => {
                    window.location.href = result.redirect || '/admin';
                    }, 100);
                } else {
                    // Mostrar error
                    alertContainer.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>' + (result.error || 'Error en el inicio de sesión') + '</div>';
                }
            } catch (error) {
                console.error('Error:', error);
                alertContainer.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>Error de conexión. Intenta nuevamente.</div>';
            } finally {
                // Restaurar botón
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
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Usuario y contraseña son requeridos'
      });
    }

    const result = await simpleAuth.verifyCredentials(username, password);
    
    if (result.success) {
      // Guardar en sesión
      req.session.user = {
        ...result.user,
        authenticatedAt: new Date()
      };
      
      // Guardar la sesión antes de responder
      console.log('🔐 Guardando sesión para usuario:', username);
      console.log('🍪 Session ID antes de guardar:', req.sessionID);
      
      // Forzar guardado de sesión
      req.session.save((err) => {
        if (err) {
          console.error('❌ Error guardando sesión:', err);
          return res.status(500).json({
            success: false,
            error: 'Error guardando sesión'
          });
        }
        
        console.log('✅ Sesión guardada exitosamente');
        console.log('🍪 Session ID después de guardar:', req.sessionID);
        console.log('🍪 Cookie configurada:', JSON.stringify(req.session.cookie, null, 2));
        console.log('👤 Usuario en sesión:', req.session.user);
        
        // Establecer cookie manualmente para asegurar que se envíe
        const cookieOptions = {
          maxAge: 24 * 60 * 60 * 1000,
          httpOnly: true,
          secure: true,
          path: '/',
          sameSite: 'lax'
        };
        res.cookie('listas.sid', req.sessionID, cookieOptions);
        console.log('🍪 Cookie establecida manualmente:', req.sessionID);
        
        res.json({
          success: true,
          redirect: '/admin',
          sessionId: req.sessionID
        });
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// GET /auth/logout - Cerrar sesión
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error cerrando sesión:', err);
    }
    res.redirect('/auth/login');
  });
});

// GET /auth/status - Verificar estado de autenticación
router.get('/status', (req, res) => {
  try {
    const isAuth = simpleAuth.isAuthenticated(req.session);
    
    if (isAuth) {
      const userInfo = simpleAuth.getUserInfo(req.session);
      res.json({
        success: true,
        authenticated: true,
        user: userInfo
      });
    } else {
      res.json({
        success: true,
        authenticated: false
      });
    }
  } catch (error) {
    console.error('Error verificando estado de autenticación:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando autenticación'
    });
  }
});

module.exports = router;
