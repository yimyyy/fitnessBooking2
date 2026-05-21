import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client';
import { ConflictError, UnauthorizedError } from '../errors/AppError';
import { Role } from '@prisma/client';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: Role;
  language?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

/**
 * Registers a new user with hashed password.
 * @param input - Registration data
 * @returns Created user without passwordHash
 * @throws {ConflictError} If email already exists
 * @example
 * const user = await authService.register({ name: 'Alice', email: 'alice@example.com', password: 'secret' });
 */
export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError('Email already in use');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role || 'student',
      language: input.language || 'en',
    },
    select: { id: true, name: true, email: true, role: true, language: true, createdAt: true },
  });
  return user;
}

/**
 * Authenticates a user and returns a JWT token.
 * @param input - Login credentials
 * @returns JWT token string
 * @throws {UnauthorizedError} If email not found or password incorrect
 * @example
 * const token = await authService.login({ email: 'alice@example.com', password: 'secret' });
 */
export async function login(input: LoginInput): Promise<{ token: string; user: object }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw new UnauthorizedError('Invalid credentials');

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid credentials');

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, language: user.language },
  };
}
