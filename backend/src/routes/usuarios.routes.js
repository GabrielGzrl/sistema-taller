const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const usuarios = require('../controllers/usuarios.controller');

router.get('/', verificarToken, requireRole('admin'), usuarios.listarUsuarios);
router.post('/', verificarToken, requireRole('admin'), usuarios.crearUsuario);

module.exports = router;