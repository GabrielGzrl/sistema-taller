const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

(async () => {
  try {
    const connection = await db.getConnection();
    console.log('✅ MySQL conectado (pool)');
    connection.release();
  } catch (error) {
    console.error('❌ Error MySQL:', error);
  }
})();

module.exports = db;
//Este archivo se encarga de conectar con la base de datos MySQL usando mysql2 y exporta el pool de conexiones para usar en otros módulos.
//Este archivo mantiene la conexión segura con la base de datos para guardar clientes, vehículos, órdenes y servicios