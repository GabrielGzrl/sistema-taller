const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth.middleware');
const controller = require('../controllers/totales.controller');

router.put('/orden/:orden_id', verificarToken, controller.recalcularTotales);

module.exports = router;