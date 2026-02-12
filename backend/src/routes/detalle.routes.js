const express = require('express');
const router = express.Router();
const controller = require('../controllers/detalle.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.post('/', verificarToken, controller.agregarDetalle);
router.get('/orden/:orden_id', verificarToken, controller.detallePorOrden);

module.exports = router;