const express = require('express');
const router = express.Router();

const controller = require('../controllers/pdfPro.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.get('/orden/:orden_id', verificarToken, controller.pdfOrdenPro);

module.exports = router;