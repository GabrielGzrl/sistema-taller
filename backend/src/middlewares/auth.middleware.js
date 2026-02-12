const jwt = require('jsonwebtoken');

exports.verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({
      mensaje: 'Token requerido'
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      mensaje: 'Token inválido'
    });
  }

  try {
    const decoded = jwt.verify(token, 'SECRETO_SUPER_TALLER');
    req.usuario = decoded; // guardamos usuario
    next();
  } catch (error) {
    return res.status(401).json({
      mensaje: 'Token expirado o inválido'
    });
  }
};
//AQUI VALIDAMOS EL TOKEN JWT