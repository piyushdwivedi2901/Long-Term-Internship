import { z } from 'zod'

/**
 * One schema = the validation rules AND the TypeScript type of the form.
 * The manual version (Task 18) has to keep a hand-written `validate()` and an
 * implicit values shape in sync; here `SignupValues` is derived, so a rule or
 * field change can't drift from the type.
 */
export const signupSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .pipe(z.email('Enter a valid email address')),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export type SignupValues = z.infer<typeof signupSchema>
