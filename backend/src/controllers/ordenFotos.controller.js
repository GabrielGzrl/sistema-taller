const db = require('../db');

// POST /api/ordenes/:orden_id/fotos
exports.subirFoto = async (req, res) => {
  const { orden_id } = req.params;
  const { tipo } = req.body; // 'antes' | 'despues'
  const file = req.file;

  if (!file) return res.status(400).json({ mensaje: 'Archivo requerido' });

  const tipoSeguro = (tipo === 'despues') ? 'despues' : 'antes';

  try {
    await db.query(
      `INSERT INTO orden_fotos (orden_id, tipo, filename, original_name, mime, size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orden_id, tipoSeguro, file.filename, file.originalname, file.mimetype, file.size]
    );

    res.json({
      mensaje: 'Foto subida',
      foto: {
        orden_id: Number(orden_id),
        tipo: tipoSeguro,
        url: `/uploads/${file.filename}`,
        original_name: file.originalname
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al guardar foto' });
  }
};

// GET /api/ordenes/:orden_id/fotos
exports.listarFotos = async (req, res) => {
  const { orden_id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT id, orden_id, tipo, filename, original_name, creado_en FROM orden_fotos WHERE orden_id = ? ORDER BY id DESC',
      [orden_id]
    );

    const fotos = rows.map(r => ({
      id: r.id,
      orden_id: r.orden_id,
      tipo: r.tipo,
      original_name: r.original_name,
      creado_en: r.creado_en,
      url: `/uploads/${r.filename}`,
    }));

    res.json(fotos);
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al listar fotos' });
  }
};