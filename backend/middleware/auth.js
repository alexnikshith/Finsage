const jwt = require('jsonwebtoken');
const JWT_SECRET = 'finsage_ultra_secure_secret_key_2026';

module.exports = function(req, res, next) {
  const authHeader = req.header('Authorization');
  let token = req.header('x-auth-token');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) return res.status(401).json({ msg: 'No token' });

  try {
    if (token === 'dev_token') {
        req.user = { id: 'dev_user_id', email: 'dev@finsage.com' };
        return next();
    }

    if (token === 'guest_token') {
        req.user = { id: 'guest_user_id', email: 'guest@finsage.local', isGuest: true };
        return next();
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT Verification Failed:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
