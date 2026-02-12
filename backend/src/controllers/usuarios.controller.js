const db = require('../db');
const bcrypt = require('bcryptjs');

// GET /api/usuarios (solo admin)
exports.listarUsuarios = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, email, rol, creado_en FROM usuarios ORDER BY id DESC'
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al listar usuarios' });
  }
};

// POST /api/usuarios (solo admin)
exports.crearUsuario = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ mensaje: 'nombre, email y password son obligatorios' });
    }

    const finalRol = (rol === 'admin' || rol === 'empleado') ? rol : 'empleado';

    // evitar duplicado
    const [existe] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe.length > 0) {
      return res.status(409).json({ mensaje: 'Ese email ya existe' });
    }

    const hash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
      [nombre, email, hash, finalRol]
    );

    res.json({ id: result.insertId, nombre, email, rol: finalRol });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al crear usuario' });
  }
};