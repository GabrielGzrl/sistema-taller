const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'taller_db'
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