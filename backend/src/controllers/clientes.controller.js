const db = require('../db');

// ===============================
// CREAR CLIENTE
// ===============================
exports.crearCliente = async (req, res) => {
  const { nombre, telefono, email } = req.body;

  try {
    const [result] = await db.query(
      `
      INSERT INTO clientes (nombre, telefono, email)
      VALUES (?, ?, ?)
      `,
      [nombre, telefono, email]
    );

    res.status(201).json({
      id: result.insertId,
      nombre,
      telefono,
      email
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al crear cliente' });
  }
};

// ===============================
// OBTENER CLIENTES
// ===============================
exports.obtenerClientes = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM clientes');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener clientes' });
  }
};