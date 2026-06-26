const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Accès refusé. Token manquant.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'tct_secret_2024');
    next();
  } catch {
    res.status(401).json({ message: 'Token invalide.' });
  }
};
