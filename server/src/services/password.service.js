import bcrypt from 'bcryptjs';

// Keep password hashing parameters centralized so the same work factor is used
// consistently whenever passwords are created or changed.
const PASSWORD_HASH_ROUNDS = 12;

export function hashPassword(password) {
  return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}
