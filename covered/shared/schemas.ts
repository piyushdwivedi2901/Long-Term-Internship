import { z } from 'zod'

/**
 * Every rule Covered enforces, shared by the Express API, the in-browser demo
 * backend and the React forms — so a form can't accept what the server rejects.
 */
export const CATEGORIES = ['kitchen', 'appliances', 'tv', 'phones', 'computers', 'furniture', 'vehicles', 'other'] as const
export type Category = (typeof CATEGORIES)[number]
export const CATEGORY_LABELS: Record<Category, string> = {
  kitchen: 'Kitchen',
  appliances: 'Home appliances',
  tv: 'TV & audio',
  phones: 'Phones & tablets',
  computers: 'Computers',
  furniture: 'Furniture',
  vehicles: 'Vehicles',
  other: 'Other',
}

/**
 * - standard:  the manufacturer's warranty, from the purchase date
 * - extended:  a paid extension (store or brand plan) that starts the day after the standard one ends
 * - component: a part with its own, longer cover from the purchase date (AC compressor, TV panel, motor…)
 */
export const COVERAGE_KINDS = ['standard', 'extended', 'component'] as const
export type CoverageKind = (typeof COVERAGE_KINDS)[number]

export const CLAIM_STATUSES = ['open', 'in_progress', 'resolved', 'rejected'] as const
export type ClaimStatus = (typeof CLAIM_STATUSES)[number]
export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  open: 'Reported',
  in_progress: 'Being repaired',
  resolved: 'Fixed',
  rejected: 'Claim rejected',
}

export const REMIND_OPTIONS = [7, 15, 30, 60] as const

export const FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
export type FileType = (typeof FILE_TYPES)[number]
/** 4 MB per file once decoded. */
export const MAX_FILE_BYTES = 4 * 1024 * 1024
export const MAX_FILES_PER_ITEM = 10

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'))
const password = z.string().min(8, 'Use at least 8 characters').max(128, 'Use 128 characters or fewer')
const personName = z.string().trim().min(1, 'Enter your name').max(40, 'Use 40 characters or fewer')
const text = (max: number) => z.string().trim().max(max, `Use ${max} characters or fewer`).default('')

export const signupSchema = z.object({ name: personName, email, password })
export const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password') })
export const profileSchema = z.object({
  name: personName.optional(),
  remindDays: z
    .number()
    .int()
    .refine((n) => (REMIND_OPTIONS as readonly number[]).includes(n), 'Choose 7, 15, 30 or 60 days')
    .optional(),
})
export const deleteAccountSchema = z.object({ password: z.string().min(1, 'Enter your password to confirm') })

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), 'Enter a real date')
  .refine((s) => s >= '1990-01-01', 'Enter a date after 1990')

export const coverageSchema = z.object({
  kind: z.enum(COVERAGE_KINDS),
  label: z.string().trim().min(1, 'Name this cover, e.g. “Compressor”').max(40, 'Use 40 characters or fewer'),
  months: z.number({ error: 'Enter how many months' }).int('Use whole months').min(1, 'At least 1 month').max(240, 'Up to 20 years'),
  provider: text(60),
})
export type CoverageInput = z.input<typeof coverageSchema>
export type Coverage = z.output<typeof coverageSchema>

const optionalUrl = z
  .string()
  .trim()
  .max(200, 'Use 200 characters or fewer')
  .refine((s) => s === '' || /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(s), 'Start the address with https://')
  .default('')

export const itemSchema = z
  .object({
    name: z.string().trim().min(1, 'What is it? e.g. “Living room AC”').max(80, 'Use 80 characters or fewer'),
    brand: text(40),
    model: text(60),
    category: z.enum(CATEGORIES).default('other'),
    purchaseDate: isoDate,
    /** paise; null when unknown */
    price: z.number().int('Amounts are in whole paise').min(0, "Price can't be negative").max(1e10, 'That price is too large').nullable().default(null),
    store: text(60),
    invoiceNo: text(40),
    serialNo: text(60),
    room: text(40),
    notes: text(1000),
    support: z
      .object({
        phone: z.string().trim().max(30, 'Use 30 characters or fewer').regex(/^[\d\s+()-]*$/, 'Use digits, spaces, + ( ) and - only').default(''),
        email: z.union([z.literal(''), z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'))]).default(''),
        website: optionalUrl,
      })
      .default({ phone: '', email: '', website: '' }),
    coverages: z.array(coverageSchema).max(6, 'Up to 6 covers per item').default([]),
  })
  .superRefine((item, ctx) => {
    if (item.coverages.filter((c) => c.kind === 'standard').length > 1) {
      ctx.addIssue({ code: 'custom', path: ['coverages'], message: 'Add only one standard warranty — use “Part” for components' })
    }
    if (item.coverages.filter((c) => c.kind === 'extended').length > 1) {
      ctx.addIssue({ code: 'custom', path: ['coverages'], message: 'Add only one extended warranty — combine the years into one' })
    }
  })
export type ItemInput = z.input<typeof itemSchema>
export type ItemData = z.output<typeof itemSchema>

export const claimSchema = z.object({
  date: isoDate,
  issue: z.string().trim().min(1, 'Describe the problem').max(200, 'Use 200 characters or fewer'),
  status: z.enum(CLAIM_STATUSES).default('open'),
  underWarranty: z.boolean().default(true),
  /** paise you paid; 0 when free */
  cost: z.number().int().min(0, "Cost can't be negative").max(1e10, 'That amount is too large').default(0),
  ticketNo: text(40),
  notes: text(500),
})
export type ClaimInput = z.input<typeof claimSchema>

export const fileSchema = z.object({
  name: z.string().trim().min(1, 'Name the file').max(120, 'Use a shorter file name'),
  mime: z.enum(FILE_TYPES, { error: 'Upload a photo (JPG, PNG, WebP) or a PDF' }),
  /** base64, no data: prefix */
  data: z.string().min(4, 'The file is empty').max(Math.ceil((MAX_FILE_BYTES * 4) / 3) + 4, 'Files can be up to 4 MB').regex(/^[A-Za-z0-9+/]+={0,2}$/, 'The file could not be read'),
})
export type FileInput = z.input<typeof fileSchema>

export type SignupInput = z.input<typeof signupSchema>
export type LoginInput = z.input<typeof loginSchema>
export type ProfileInput = z.input<typeof profileSchema>
