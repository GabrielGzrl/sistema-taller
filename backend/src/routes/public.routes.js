const express = require('express');
const router = express.Router();
const publicCtrl = require('../controllers/public.controller');

// Cliente para entre y ver su orden al ingresar folio y su pin
router.post('/orden/:folio', publicCtrl.verOrdenPublica);

module.exports = router;