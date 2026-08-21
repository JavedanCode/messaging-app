import { ZodError } from 'zod';
import { Prisma } from '../../generated/prisma/client.ts';

import { AppError } from '../errors/AppError.js';

export function errorHandler(error, req, res, _next) {
  // Validation errors are expected client errors and are returned with the
  // individual fields that failed validation.
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  // Translate known database constraint errors into stable API errors so
  // database-specific error details are not exposed to clients.
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = error.meta?.target;

      if (Array.isArray(target) && target.includes('email')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'Email is already registered.',
          },
        });
      }

      if (Array.isArray(target) && target.includes('username')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'USERNAME_ALREADY_EXISTS',
            message: 'Username is already taken.',
          },
        });
      }

      return res.status(409).json({
        success: false,
        error: {
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: 'A resource with the provided value already exists.',
        },
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'The requested resource was not found.',
        },
      });
    }

    if (error.code === 'P2003') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'RESOURCE_CONFLICT',
          message: 'The operation conflicts with an existing resource.',
        },
      });
    }
  }

  // AppError represents expected application-level failures with an
  // intentional HTTP status and public error code.
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  // Anything that reaches this point is unexpected and should be logged
  // server-side while exposing only a generic response to the client.
  console.error(error);

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
}
