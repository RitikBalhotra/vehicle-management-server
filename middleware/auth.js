import jwt from 'jsonwebtoken';

const auth = (req, res, next) => {
  console.log(req.header);
  
  const token = req.header('Authorization')?.replace('Bearer ', '');
  console.log(token);
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export default auth;