import z from 'zod';

export const EMSApiErrorSchema = z.object({
  message: z.string(),
  code: z.number().optional()
});
