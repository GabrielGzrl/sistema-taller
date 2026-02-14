const mysql = require('mysql2/promise');

// Railway suele darte variables tipo MYSQLHOST, MYSQLUSER, etc.
// Nosotros soportamos ambas: DB_* (tuyas) y MYSQL* (Railway).
const DB_HOST = process.env.DB_HOST || process.env.MYSQLHOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306);
const DB_USER = process.env.DB_USER || process.env.MYSQLUSER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '';
const DB_NAME = process.env.DB_NAME || process.env.MYSQLDATABASE || 'taller_db';

const db = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

(async () => {
  try {
    const connection = await db.getConnection();
    console.log('✅ MySQL conectado:', { host: DB_HOST, port: DB_PORT, db: DB_NAME, user: DB_USER });
    connection.release();
  } catch (error) {
    console.error('❌ Error MySQL:', error);
  }
})();

module.exports = db;