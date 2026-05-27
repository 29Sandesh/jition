import { generateAccessToken, verifyAccessToken } from './server/auth/jwt.ts';
const token = generateAccessToken('1234');
console.log('Token:', token);
const result = verifyAccessToken(token);
console.log('Verify:', result);
