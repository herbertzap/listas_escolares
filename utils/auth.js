const bcrypt = require('bcryptjs');

class SimpleAuth {
  constructor() {
    // Credenciales del administrador (se configuran en .env)
    this.adminUsername = process.env.ADMIN_USERNAME || 'admin';
    this.adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    this.adminPasswordHash = null;
    this.passwordInitialized = false;
    
    // Generar hash de la contraseña al inicializar (síncrono)
    this.initializePasswordSync();
  }

  // Inicializar hash de contraseña de forma síncrona
  initializePasswordSync() {
    try {
      // Generar hash de forma síncrona para asegurar que esté listo
      this.adminPasswordHash = bcrypt.hashSync(this.adminPassword, 10);
      this.passwordInitialized = true;
      console.log('🔐 Contraseña de administrador configurada');
    } catch (error) {
      console.error('Error generando hash de contraseña:', error);
      // Fallback: usar contraseña sin hash (no recomendado pero funcional)
      this.adminPasswordHash = null;
    }
  }

  // Verificar credenciales
  async verifyCredentials(username, password) {
    try {
      // Verificar username
      if (username !== this.adminUsername) {
        console.log('❌ Usuario incorrecto:', username, 'esperado:', this.adminUsername);
        return { success: false, error: 'Credenciales inválidas' };
      }

      // Si el hash no está inicializado, inicializarlo ahora
      if (!this.passwordInitialized || !this.adminPasswordHash) {
        this.initializePasswordSync();
      }

      // Verificar contraseña
      const isValid = bcrypt.compareSync(password, this.adminPasswordHash);
      
      if (isValid) {
        console.log('✅ Credenciales válidas para usuario:', username);
        return { 
          success: true, 
          user: { 
            username: this.adminUsername,
            role: 'admin'
          }
        };
      } else {
        console.log('❌ Contraseña incorrecta para usuario:', username);
        return { success: false, error: 'Credenciales inválidas' };
      }
    } catch (error) {
      console.error('Error verificando credenciales:', error);
      return { success: false, error: 'Error interno' };
    }
  }

  // Verificar si el usuario está autenticado
  isAuthenticated(session) {
    return session && session.user && session.user.username === this.adminUsername;
  }

  // Obtener información del usuario autenticado
  getUserInfo(session) {
    if (this.isAuthenticated(session)) {
      return {
        username: session.user.username,
        role: session.user.role,
        authenticatedAt: session.user.authenticatedAt
      };
    }
    return null;
  }
}

module.exports = new SimpleAuth();
