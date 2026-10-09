import { z } from 'zod'

/**
 * Every rule Couch Cup enforces, shared by the Express API, the in-browser
 * demo backend and the React forms.
 */
export const FORMATS = ['league', 'knockout'] as const
export type Format = (typeof FORMATS)[number]
export const DECIDED_BY = ['normal', 'extra_time', 'penalties', 'forfeit'] as const
export type DecidedBy = (typeof DECIDED_BY)[number]
export const DECIDED_LABELS: Record<DecidedBy, string> = { normal: 'Full time', extra_time: 'After extra time', penalties: 'Penalties', forfeit: 'Forfeit / rage quit' }
export const SEEDINGS = ['rating', 'random', 'manual'] as const

/** Kit colours a player can wear on scoreboards and charts. */
export const KIT_COLORS = ['#e4572e', '#2d7ff9', '#20bf55', '#f2c14e', '#9b5de5', '#f15bb5', '#00bbf9', '#ff8c42', '#3d348b', '#06d6a0', '#ef476f', '#8d99ae'] as const

export const MAX_PLAYERS = 24
export const MAX_LEAGUE = 20
export const MAX_KNOCKOUT = 32

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'))
const password = z.string().min(8, 'Use at least 8 characters').max(128, 'Use 128 characters or fewer')
const personName = z.string().trim().min(1, 'Enter a name').max(24, 'Use 24 characters or fewer')
const id = z.number().int().positive()

export const signupSchema = z.object({ name: personName, email, password })
export const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password') })
export const profileSchema = z.object({ name: personName })
export const deleteAccountSchema = z.object({ password: z.string().min(1, 'Enter your password to confirm') })

export const crewSchema = z.object({
  name: z.string().trim().min(1, 'Name your crew').max(40, 'Use 40 characters or fewer'),
  playerNames: z.array(personName).max(MAX_PLAYERS - 1, `A crew can have up to ${MAX_PLAYERS} players`).default([]),
})
export const crewPatchSchema = z.object({ name: crewSchema.shape.name })
export const playerSchema = z.object({
  name: personName,
  color: z.number().int().min(0).max(KIT_COLORS.length - 1).optional(),
})
export const joinSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z2-9]{8}$/, 'Invite codes are 8 letters and numbers'),
  claimPlayerId: id.optional(),
})

const points = z
  .object({ win: z.number().int().min(0).max(10), draw: z.number().int().min(0).max(10), loss: z.number().int().min(0).max(10) })
  .refine((p) => p.win > p.draw && p.draw >= p.loss, 'A win must be worth more than a draw, and a draw at least as much as a loss')

export const competitionSchema = z
  .object({
    name: z.string().trim().min(1, 'Name the competition').max(50, 'Use 50 characters or fewer'),
    format: z.enum(FORMATS),
    playerIds: z.array(id).min(2, 'Pick at least two players'),
    legs: z.union([z.literal(1), z.literal(2)]).default(1),
    points: points.default({ win: 3, draw: 1, loss: 0 }),
    seeding: z.enum(SEEDINGS).default('rating'),
  })
  .superRefine((c, ctx) => {
    if (new Set(c.playerIds).size !== c.playerIds.length) ctx.addIssue({ code: 'custom', path: ['playerIds'], message: 'Pick each player once' })
    const max = c.format === 'league' ? MAX_LEAGUE : MAX_KNOCKOUT
    if (c.playerIds.length > max) ctx.addIssue({ code: 'custom', path: ['playerIds'], message: `A ${c.format} can have up to ${max} players` })
  })
export const competitionPatchSchema = z.object({ name: z.string().trim().min(1, 'Name the competition').max(50, 'Use 50 characters or fewer') })

const goals = z.number({ error: 'Enter the score' }).int('Whole goals only').min(0, "Goals can't be negative").max(99, 'That is a lot of goals')
const pens = z.number().int().min(0).max(99).nullable().default(null)

export const resultSchema = z
  .object({
    homeGoals: goals,
    awayGoals: goals,
    homeClub: z.string().trim().max(40, 'Use 40 characters or fewer').default(''),
    awayClub: z.string().trim().max(40, 'Use 40 characters or fewer').default(''),
    decidedBy: z.enum(DECIDED_BY).default('normal'),
    homePens: pens,
    awayPens: pens,
    notes: z.string().trim().max(200, 'Use 200 characters or fewer').default(''),
    playedAt: z.iso.datetime({ offset: true, error: 'Enter a valid date and time' }).optional(),
  })
  .superRefine((r, ctx) => {
    if (r.decidedBy === 'penalties') {
      if (r.homeGoals !== r.awayGoals) ctx.addIssue({ code: 'custom', path: ['decidedBy'], message: 'A shoot-out only happens when the score is level' })
      if (r.homePens === null || r.awayPens === null) ctx.addIssue({ code: 'custom', path: ['homePens'], message: 'Enter the shoot-out score' })
      else if (r.homePens === r.awayPens) ctx.addIssue({ code: 'custom', path: ['homePens'], message: 'A shoot-out needs a winner' })
    }
    if (r.decidedBy === 'forfeit' && r.homeGoals === r.awayGoals) ctx.addIssue({ code: 'custom', path: ['decidedBy'], message: 'A forfeit needs a winner — usually 3–0' })
  })
  .transform((r) => (r.decidedBy === 'penalties' ? r : { ...r, homePens: null, awayPens: null }))

export const friendlySchema = z.intersection(z.object({ homeId: id, awayId: id }), resultSchema).refine((f) => f.homeId !== f.awayId, { path: ['awayId'], message: 'Pick two different players' })

export type SignupInput = z.input<typeof signupSchema>
export type LoginInput = z.input<typeof loginSchema>
export type ProfileInput = z.input<typeof profileSchema>
export type CrewInput = z.input<typeof crewSchema>
export type PlayerInput = z.input<typeof playerSchema>
export type JoinInput = z.input<typeof joinSchema>
export type CompetitionInput = z.input<typeof competitionSchema>
export type ResultInput = z.input<typeof resultSchema>
export type FriendlyInput = z.input<typeof friendlySchema>
