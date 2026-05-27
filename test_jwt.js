const { generateAccessToken, verifyAccessToken } = require('./server/auth/jwt');
const token = generateAccessToken('1234');
console.log('Token:', token);
const result = verifyAccessToken(token);
console.log('Verify:', result);
