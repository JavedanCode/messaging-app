import { z } from 'zod';

// Shared validation rules are kept here so the same constraints can be reused
// across multiple request schemas without duplicating validation logic.
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .max(128, 'Password must not exceed 128 characters.');
