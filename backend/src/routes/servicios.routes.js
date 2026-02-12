const express = require('express');
const router = express.Router();
const controller = require('../controllers/servicios.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.post('/', verificarToken, controller.crearServicio);
router.get('/orden/:orden_id', verificarToken, controller.obtenerServiciosPorOrden);

module.exports = router;