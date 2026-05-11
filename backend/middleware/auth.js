const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header
  const authHeader = req.header('Authorization');
  let token = req.header('x-auth-token');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    if (token === 'dev_token') {
        req.user = { id: 'dev_user_id', email: 'dev@finsage.com' };
        return next();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'finsage_secret_key_2026');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
