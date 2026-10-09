import type { z } from 'zod'

/** An error the API is allowed to show to the user. Anything else is a 500. */
export class AppError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export const notFound = (what: string) => new AppError(404, 'not_found', `${what} not found`)
export const unauthorized = (message = 'Sign in to continue') => new AppError(401, 'unauthorized', message)

/** Parses with a Zod schema, turning failures into a 400 with per-field messages. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input)
  if (result.success) return result.data
  const fields: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_'
    fields[key] ??= issue.message
  }
  const first = Object.values(fields)[0] ?? 'Check the highlighted fields'
  throw new AppError(400, 'validation', first, fields)
}
