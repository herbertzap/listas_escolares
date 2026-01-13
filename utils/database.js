const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración de la base de datos MySQL
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'listas_escolares',
    port: process.env.DB_PORT || 3306,
    charset: 'utf8mb4',
    timezone: '-03:00' // Zona horaria de Chile
};

// Pool de conexiones
let pool;

// Inicializar pool de conexiones
function initializePool() {
    if (!pool) {
        pool = mysql.createPool({
            ...dbConfig,
            connectionLimit: 10,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true
        });
    }
    return pool;
}

// Obtener conexión
async function getConnection() {
    const pool = initializePool();
    return await pool.getConnection();
}

// Ejecutar consulta
async function query(sql, params = []) {
    const pool = initializePool();
    try {
        const [rows] = await pool.query(sql, params);
        return rows;
    } catch (error) {
        console.error('Error en consulta MySQL:', error);
        throw error;
    }
}

// Inicializar base de datos
async function initializeDatabase() {
    try {
        const pool = initializePool();
        
        // Crear tablas si no existen
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS listas_escolares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre_colegio VARCHAR(255) NOT NULL,
                region VARCHAR(100) NOT NULL,
                comuna VARCHAR(100) NOT NULL,
                nivel VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_region (region),
                INDEX idx_comuna (comuna),
                INDEX idx_nivel (nivel),
                INDEX idx_colegio (nombre_colegio)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS productos_lista (
                id INT AUTO_INCREMENT PRIMARY KEY,
                lista_id INT NOT NULL,
                producto_shopify_id VARCHAR(50) NOT NULL,
                nombre_producto VARCHAR(255) NOT NULL,
                precio DECIMAL(10,2) NOT NULL,
                cantidad INT NOT NULL DEFAULT 1,
                orden INT DEFAULT 0,
                imagen TEXT,
                codigo_producto VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (lista_id) REFERENCES listas_escolares(id) ON DELETE CASCADE,
                INDEX idx_lista_id (lista_id),
                INDEX idx_producto_id (producto_shopify_id),
                INDEX idx_codigo (codigo_producto)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Agregar columna orden si no existe
        try {
            await pool.execute(`
                ALTER TABLE productos_lista 
                ADD COLUMN orden INT DEFAULT 0 AFTER cantidad
            `);
            console.log('✅ Columna orden agregada a productos_lista');
        } catch (error) {
            if (error.code !== 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ Columna orden ya existe o error:', error.message);
            }
        }

        // Agregar columna variant_id a productos_lista si no existe
        try {
            await pool.execute(`
                ALTER TABLE productos_lista 
                ADD COLUMN variant_id BIGINT DEFAULT NULL AFTER producto_shopify_id
            `);
            console.log('✅ Columna variant_id agregada a productos_lista');
        } catch (error) {
            if (error.code !== 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ Columna variant_id ya existe o error:', error.message);
            }
        }

        // Crear tabla listas_personalizadas_temp si no existe
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS listas_personalizadas_temp (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    ip_usuario VARCHAR(45) NOT NULL,
                    lista_base_id INT NOT NULL,
                    producto_shopify_id VARCHAR(255) NOT NULL,
                    variant_id BIGINT DEFAULT NULL,
                    nombre_producto VARCHAR(500) NOT NULL,
                    precio DECIMAL(10,2) NOT NULL,
                    cantidad INT NOT NULL DEFAULT 1,
                    imagen VARCHAR(500),
                    codigo_producto VARCHAR(100),
                    accion ENUM('agregado', 'eliminado', 'modificado') NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_ip_lista (ip_usuario, lista_base_id),
                    INDEX idx_created_at (created_at),
                    FOREIGN KEY (lista_base_id) REFERENCES listas_escolares(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('✅ Tabla listas_personalizadas_temp creada/verificada');
        } catch (error) {
            console.log('ℹ️ Tabla listas_personalizadas_temp ya existe o error:', error.message);
        }

        // Agregar columna variant_id a listas_personalizadas_temp si no existe
        try {
            await pool.execute(`
                ALTER TABLE listas_personalizadas_temp 
                ADD COLUMN variant_id BIGINT DEFAULT NULL AFTER producto_shopify_id
            `);
            console.log('✅ Columna variant_id agregada a listas_personalizadas_temp');
        } catch (error) {
            if (error.code !== 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ Columna variant_id ya existe o error:', error.message);
            }
        }

        console.log('✅ Base de datos MySQL inicializada correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error inicializando base de datos MySQL:', error);
        throw error;
    }
}

// Verificar conexión
async function testConnection() {
    try {
        const pool = initializePool();
        await pool.execute('SELECT 1');
        console.log('✅ Conexión a MySQL exitosa');
        return true;
    } catch (error) {
        console.error('❌ Error conectando a MySQL:', error);
        return false;
    }
}

module.exports = {
    query,
    getConnection,
    initializeDatabase,
    testConnection,
    pool: () => initializePool()
};
