import { z } from 'zod'
import { CURRENCIES } from './money.ts'

/**
 * Every rule Fairshare enforces, shared by the Express API, the in-browser
 * demo backend and the React forms.
 */
export const CATEGORIES = ['food', 'groceries', 'travel', 'stay', 'rent', 'utilities', 'entertainment', 'shopping', 'health', 'other'] as const
export type Category = (typeof CATEGORIES)[number]
export const CATEGORY_LABELS: Record<Category, string> = {
  food: 'Food & drink',
  groceries: 'Groceries',
  travel: 'Travel',
  stay: 'Stay',
  rent: 'Rent',
  utilities: 'Utilities',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  health: 'Health',
  other: 'Other',
}

export const GROUP_EMOJIS = ['🏖️', '🏠', '✈️', '🍕', '🎉', '💼', '🚗', '⛺', '🎓', '💡'] as const

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'))
const password = z.string().min(8, 'Use at least 8 characters').max(128, 'Use 128 characters or fewer')
const personName = z.string().trim().min(1, 'Enter a name').max(40, 'Use 40 characters or fewer')

export const signupSchema = z.object({ name: personName, email, password })
export const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password') })
export const profileSchema = z.object({ name: personName })
export const deleteAccountSchema = z.object({ password: z.string().min(1, 'Enter your password to confirm') })

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), 'Enter a real date')

const id = z.number().int().positive()
/** Up to ₹1,00,00,00,000 (100 crore) per expense — far beyond real use, well inside safe integers. */
const amount = z.number().int('Amounts are in whole paise').positive('Enter an amount above zero').max(1e11, 'That amount is too large')

export const groupSchema = z.object({
  name: z.string().trim().min(1, 'Give the group a name').max(50, 'Use 50 characters or fewer'),
  emoji: z.enum(GROUP_EMOJIS).default('🏖️'),
  currency: z.enum(CURRENCIES).default('INR'),
  memberNames: z.array(personName).max(19, 'A group can have up to 20 people').default([]),
})
export const groupPatchSchema = z.object({
  name: groupSchema.shape.name.optional(),
  emoji: z.enum(GROUP_EMOJIS).optional(),
  currency: z.enum(CURRENCIES).optional(),
})
export const memberSchema = z.object({ name: personName })

export const splitSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('equal'), memberIds: z.array(id).min(1, 'Choose at least one person to split with').max(50) }),
  z.object({
    type: z.literal('exact'),
    amounts: z.array(z.object({ memberId: id, amount: z.number().int().min(0) })).min(1).max(50),
  }),
  z.object({
    type: z.literal('percent'),
    percents: z.array(z.object({ memberId: id, basisPoints: z.number().int().min(0).max(10_000) })).min(1).max(50),
  }),
  z.object({
    type: z.literal('shares'),
    shares: z.array(z.object({ memberId: id, shares: z.number().int().min(0).max(1000) })).min(1).max(50),
  }),
])

export const expenseSchema = z.object({
  description: z.string().trim().min(1, 'Describe the expense').max(80, 'Use 80 characters or fewer'),
  amount,
  paidBy: id,
  date: isoDate,
  category: z.enum(CATEGORIES).default('other'),
  notes: z.string().trim().max(500, 'Use 500 characters or fewer').default(''),
  split: splitSchema,
})

export const settlementSchema = z
  .object({
    fromMember: id,
    toMember: id,
    amount,
    date: isoDate,
    note: z.string().trim().max(120, 'Use 120 characters or fewer').default(''),
  })
  .refine((s) => s.fromMember !== s.toMember, { path: ['toMember'], message: 'Choose two different people' })

export const joinSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z2-9]{8}$/, 'Invite codes are 8 letters and numbers'),
  claimMemberId: id.optional(),
})

export type SignupInput = z.input<typeof signupSchema>
export type LoginInput = z.input<typeof loginSchema>
export type ProfileInput = z.input<typeof profileSchema>
export type GroupInput = z.input<typeof groupSchema>
export type GroupPatch = z.input<typeof groupPatchSchema>
export type ExpenseInput = z.input<typeof expenseSchema>
export type SettlementInput = z.input<typeof settlementSchema>
export type JoinInput = z.input<typeof joinSchema>
