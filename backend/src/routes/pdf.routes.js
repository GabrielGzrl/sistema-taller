const express = require('express');
const router = express.Router();
const controller = require('../controllers/pdf.controller');

router.get('/orden/:ordenId', controller.generarPDFOrden);

module.exports = router;