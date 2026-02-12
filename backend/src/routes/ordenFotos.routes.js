const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');

const { verificarToken } = require('../middlewares/auth.middleware');
const fotos = require('../controllers/ordenFotos.controller');

// Config multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg','.jpeg','.png','.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `orden_${req.params.orden_id}_${Date.now()}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

// Taller (protegido)
router.post('/ordenes/:orden_id/fotos', verificarToken, upload.single('foto'), fotos.subirFoto);
router.get('/ordenes/:orden_id/fotos', verificarToken, fotos.listarFotos);

module.exports = router;