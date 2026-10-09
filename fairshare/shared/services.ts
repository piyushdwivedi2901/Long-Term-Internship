import { AppError, notFound, parse, unauthorized } from './errors.ts'
import { computeBalances, simplifyDebts, type MemberBalance } from './balances.ts'
import { CURRENCIES, formatMoney, type Currency } from './money.ts'
import type { ExpenseRow, GroupRow, MemberRow, Repository, SettlementRow, UserRow } from './repository.ts'
import {
  CATEGORIES,
  deleteAccountSchema,
  expenseSchema,
  groupPatchSchema,
  groupSchema,
  joinSchema,
  loginSchema,
  memberSchema,
  profileSchema,
  settlementSchema,
  signupSchema,
  type ExpenseInput,
} from './schemas.ts'
import { SplitError, computeShares, splitMemberIds } from './split.ts'
import type {
  Activity,
  Expense,
  GroupDetail,
  GroupSummary,
  Insights,
  JoinPreview,
  Member,
  Overview,
  Session,
  Settlement,
  User,
} from './types.ts'

export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(password: string, hash: string): Promise<boolean>
}
export interface TokenSigner {
  sign(user: { id: number; email: string }): string
  verify(token: string): number | null
}
export interface ServiceDeps {
  repo: Repository
  passwords: PasswordHasher
  tokens: TokenSigner
  now?: () => Date
  /** Source of randomness for invite codes (override in tests). */
  randomBytes?: (n: number) => Uint8Array
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O, 1/I — easy to read aloud
export const isoDay = (d: Date) => d.toISOString().slice(0, 10)
export const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return isoDay(d)
}

const toUser = (u: UserRow): User => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt })

/**
 * Every Fairshare rule. Methods take the acting user's id first; access is
 * decided here, once: you can only see and change groups you belong to.
 */
export function createServices({
  repo,
  passwords,
  tokens,
  now = () => new Date(),
  randomBytes = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n)),
}: ServiceDeps) {
  const stamp = () => now().toISOString()

  // ---------- helpers ----------
  const newInviteCode = () => {
    for (;;) {
      const code = Array.from(randomBytes(8), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
      if (!repo.groups.byInviteCode(code)) return code
    }
  }

  /** The user's member row in a group, or 404 — never reveal other groups. */
  const membership = (userId: number, groupId: number): { group: GroupRow; me: MemberRow } => {
    const group = repo.groups.byId(groupId)
    const me = group && repo.members.listByGroup(groupId).find((m) => m.userId === userId)
    if (!group || !me) throw notFound('Group')
    return { group, me }
  }

  const requireOwner = (group: GroupRow, userId: number, action: string) => {
    if (group.ownerId !== userId) throw new AppError(403, 'forbidden', `Only the person who created the group can ${action}`)
  }

  const log = (groupId: number, userId: number, actorName: string, text: string) => {
    repo.activity.insert({ groupId, userId, actorName, text, createdAt: stamp() })
    repo.groups.update(groupId, { updatedAt: stamp() })
  }

  const money = (group: GroupRow, minor: number) => formatMoney(minor, group.currency)

  const ledger = (groupId: number) => ({
    expenses: repo.expenses.listByGroup(groupId).map((e) => ({ paidBy: e.paidBy, amount: e.amount, shares: e.shares })),
    settlements: repo.settlements.listByGroup(groupId),
  })

  const balancesFor = (groupId: number, members: MemberRow[]): MemberBalance[] =>
    computeBalances(members.map((m) => m.id), ledger(groupId))

  const toMember = (m: MemberRow, group: GroupRow, userId: number): Member => ({
    id: m.id,
    name: m.name,
    claimed: m.userId !== null,
    isYou: m.userId === userId,
    isOwner: m.userId === group.ownerId,
  })

  const summary = (group: GroupRow, me: MemberRow, members: MemberRow[]): GroupSummary => ({
    id: group.id,
    name: group.name,
    emoji: group.emoji,
    currency: group.currency,
    memberCount: members.length,
    myMemberId: me.id,
    myBalance: balancesFor(group.id, members).find((b) => b.memberId === me.id)?.net ?? 0,
    isOwner: group.ownerId === me.userId,
    updatedAt: group.updatedAt,
  })

  const assertMembers = (groupId: number, ids: number[], field: string) => {
    const valid = new Set(repo.members.listByGroup(groupId).map((m) => m.id))
    if (ids.some((id) => !valid.has(id))) {
      throw new AppError(400, 'validation', 'Choose people from this group', { [field]: 'Choose people from this group' })
    }
  }

  const deriveShares = (amount: number, split: ExpenseRow['split']) => {
    try {
      return Object.fromEntries([...computeShares(amount, split)].map(([k, v]) => [String(k), v]))
    } catch (err) {
      if (err instanceof SplitError) throw new AppError(400, 'validation', err.message, { [err.field]: err.message })
      throw err
    }
  }

  const memberName = (groupId: number, memberId: number) =>
    repo.members.listByGroup(groupId).find((m) => m.id === memberId)?.name ?? 'Someone'

  const toExpense = (e: ExpenseRow, group: GroupRow, userId: number): Expense => ({
    id: e.id,
    groupId: e.groupId,
    description: e.description,
    amount: e.amount,
    paidBy: e.paidBy,
    date: e.date,
    category: e.category,
    notes: e.notes,
    split: e.split,
    shares: Object.entries(e.shares).map(([memberId, amount]) => ({ memberId: Number(memberId), amount })),
    createdByName: repo.users.byId(e.createdBy)?.name ?? 'Former member',
    canEdit: e.createdBy === userId || group.ownerId === userId,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  })

  const toSettlement = (s: SettlementRow, group: GroupRow, userId: number): Settlement => ({
    id: s.id,
    groupId: s.groupId,
    fromMember: s.fromMember,
    toMember: s.toMember,
    amount: s.amount,
    date: s.date,
    note: s.note,
    canDelete: s.createdBy === userId || group.ownerId === userId,
    createdAt: s.createdAt,
  })

  // ---------- auth ----------
  const auth = {
    async signup(input: unknown): Promise<Session> {
      const data = parse(signupSchema, input)
      if (repo.users.byEmail(data.email)) {
        throw new AppError(409, 'email_taken', 'An account with this email already exists', { email: 'An account with this email already exists' })
      }
      const passwordHash = await passwords.hash(data.password)
      const row = repo.users.insert({ name: data.name, email: data.email, passwordHash, createdAt: stamp() })
      return { token: tokens.sign(row), user: toUser(row) }
    },
    async login(input: unknown): Promise<Session> {
      const data = parse(loginSchema, input)
      const row = repo.users.byEmail(data.email)
      const ok = row ? await passwords.verify(data.password, row.passwordHash) : false
      if (!row || !ok) throw new AppError(401, 'bad_credentials', 'Email or password is incorrect')
      return { token: tokens.sign(row), user: toUser(row) }
    },
    authenticate(token: string | null | undefined): number {
      const id = token ? tokens.verify(token) : null
      if (id === null || !repo.users.byId(id)) throw unauthorized('Your session has ended. Sign in again.')
      return id
    },
    me(userId: number): User {
      const u = repo.users.byId(userId)
      if (!u) throw unauthorized()
      return toUser(u)
    },
    updateProfile(userId: number, input: unknown): User {
      const { name } = parse(profileSchema, input)
      repo.transaction(() => {
        repo.users.update(userId, { name })
        // Your name follows you into every group you belong to.
        for (const m of repo.members.listByUser(userId)) repo.members.update(m.id, { name })
      })
      return auth.me(userId)
    },
    /**
     * Deleting an account never rewrites shared history: your member rows
     * stay (as unclaimed names) so other people's balances don't change.
     * Groups you own are deleted only if you're the only account in them.
     */
    async deleteAccount(userId: number, input: unknown): Promise<void> {
      const { password } = parse(deleteAccountSchema, input)
      const u = repo.users.byId(userId)
      if (!u) throw unauthorized()
      if (!(await passwords.verify(password, u.passwordHash))) {
        throw new AppError(400, 'bad_password', 'That password is incorrect', { password: 'That password is incorrect' })
      }
      repo.transaction(() => {
        for (const m of repo.members.listByUser(userId)) {
          const group = repo.groups.byId(m.groupId)!
          const others = repo.members.listByGroup(group.id).filter((x) => x.userId !== null && x.userId !== userId)
          if (group.ownerId === userId && others.length === 0) deleteGroup(group.id)
          else {
            repo.members.update(m.id, { userId: null })
            if (group.ownerId === userId) repo.groups.update(group.id, { ownerId: others[0].userId! })
          }
        }
        repo.users.delete(userId)
      })
    },
  }

  function deleteGroup(groupId: number) {
    for (const e of repo.expenses.listByGroup(groupId)) repo.expenses.delete(e.id)
    for (const s of repo.settlements.listByGroup(groupId)) repo.settlements.delete(s.id)
    for (const m of repo.members.listByGroup(groupId)) repo.members.delete(m.id)
    for (const a of repo.activity.listByGroups([groupId], Number.MAX_SAFE_INTEGER)) repo.activity.delete(a.id)
    repo.groups.delete(groupId)
  }

  // ---------- groups ----------
  const groups = {
    list(userId: number): GroupSummary[] {
      return repo.members
        .listByUser(userId)
        .map((me) => {
          const group = repo.groups.byId(me.groupId)!
          return summary(group, me, repo.members.listByGroup(group.id))
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id)
    },

    get(userId: number, groupId: number): GroupDetail {
      const { group, me } = membership(userId, groupId)
      const members = repo.members.listByGroup(groupId)
      const balances = balancesFor(groupId, members)
      return {
        ...summary(group, me, members),
        inviteCode: group.inviteCode,
        members: members.map((m) => toMember(m, group, userId)),
        balances,
        plan: simplifyDebts(balances),
        expenseCount: repo.expenses.listByGroup(groupId).length,
      }
    },

    create(userId: number, input: unknown): GroupDetail {
      const data = parse(groupSchema, input)
      const me = auth.me(userId)
      const names = data.memberNames.filter((n) => n.toLowerCase() !== me.name.toLowerCase())
      if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) {
        throw new AppError(400, 'validation', 'Each person needs a different name', { memberNames: 'Each person needs a different name' })
      }
      const ts = stamp()
      const id = repo.transaction(() => {
        const group = repo.groups.insert({
          name: data.name,
          emoji: data.emoji,
          currency: data.currency,
          ownerId: userId,
          inviteCode: newInviteCode(),
          createdAt: ts,
          updatedAt: ts,
        })
        repo.members.insert({ groupId: group.id, userId, name: me.name, createdAt: ts })
        for (const name of names) repo.members.insert({ groupId: group.id, userId: null, name, createdAt: ts })
        log(group.id, userId, me.name, `created the group “${group.name}”`)
        return group.id
      })
      return groups.get(userId, id)
    },

    update(userId: number, groupId: number, input: unknown): GroupDetail {
      const data = parse(groupPatchSchema, input)
      const { group, me } = membership(userId, groupId)
      if (data.currency && data.currency !== group.currency && repo.expenses.listByGroup(groupId).length > 0) {
        throw new AppError(409, 'currency_locked', "The currency can't change once the group has expenses", { currency: "The currency can't change once the group has expenses" })
      }
      repo.transaction(() => {
        repo.groups.update(groupId, { ...data, updatedAt: stamp() })
        log(groupId, userId, me.name, 'updated the group details')
      })
      return groups.get(userId, groupId)
    },

    remove(userId: number, groupId: number): void {
      const { group } = membership(userId, groupId)
      requireOwner(group, userId, 'delete it')
      repo.transaction(() => deleteGroup(groupId))
    },

    regenerateInvite(userId: number, groupId: number): GroupDetail {
      const { group } = membership(userId, groupId)
      requireOwner(group, userId, 'change the invite code')
      repo.groups.update(groupId, { inviteCode: newInviteCode() })
      return groups.get(userId, groupId)
    },

    previewInvite(userId: number, input: unknown): JoinPreview {
      const { code } = parse(joinSchema, input)
      const group = repo.groups.byInviteCode(code)
      if (!group) throw new AppError(404, 'bad_code', 'No group uses this invite code. Check it with the person who sent it.', { code: 'No group uses this invite code' })
      const members = repo.members.listByGroup(group.id)
      return {
        groupId: group.id,
        name: group.name,
        emoji: group.emoji,
        currency: group.currency,
        memberCount: members.length,
        alreadyMember: members.some((m) => m.userId === userId),
        placeholders: members.filter((m) => m.userId === null).map((m) => ({ id: m.id, name: m.name })),
      }
    },

    /** Join by code — optionally as an existing (unclaimed) person, keeping their history. */
    join(userId: number, input: unknown): GroupDetail {
      const { code, claimMemberId } = parse(joinSchema, input)
      const preview = groups.previewInvite(userId, { code })
      if (preview.alreadyMember) return groups.get(userId, preview.groupId)
      const me = auth.me(userId)
      repo.transaction(() => {
        if (claimMemberId) {
          const target = repo.members.byId(claimMemberId)
          if (!target || target.groupId !== preview.groupId || target.userId !== null) {
            throw new AppError(409, 'already_claimed', 'Someone has already joined as that person. Join as yourself instead.')
          }
          repo.members.update(target.id, { userId, name: me.name })
          log(preview.groupId, userId, me.name, target.name === me.name ? 'joined the group' : `joined the group as ${target.name}`)
        } else {
          if (preview.memberCount >= 20) throw new AppError(409, 'group_full', 'This group already has 20 people')
          repo.members.insert({ groupId: preview.groupId, userId, name: me.name, createdAt: stamp() })
          log(preview.groupId, userId, me.name, 'joined the group')
        }
      })
      return groups.get(userId, preview.groupId)
    },

    /** Leave a group: your row stays as an unclaimed name so balances are untouched. */
    leave(userId: number, groupId: number): void {
      const { group, me } = membership(userId, groupId)
      if (group.ownerId === userId) throw new AppError(409, 'owner_cannot_leave', 'You created this group. Delete it instead, or ask someone else to.')
      const net = balancesFor(groupId, repo.members.listByGroup(groupId)).find((b) => b.memberId === me.id)?.net ?? 0
      if (net !== 0) throw new AppError(409, 'unsettled', `Settle your balance of ${money(group, Math.abs(net))} before leaving`)
      repo.transaction(() => {
        repo.members.update(me.id, { userId: null })
        log(groupId, userId, me.name, 'left the group')
      })
    },
  }

  // ---------- members ----------
  const members = {
    add(userId: number, groupId: number, input: unknown): Member {
      const { name } = parse(memberSchema, input)
      const { group, me } = membership(userId, groupId)
      const existing = repo.members.listByGroup(groupId)
      if (existing.length >= 20) throw new AppError(409, 'group_full', 'A group can have up to 20 people')
      if (existing.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
        throw new AppError(409, 'duplicate_name', `${name} is already in this group`, { name: `${name} is already in this group` })
      }
      return repo.transaction(() => {
        const row = repo.members.insert({ groupId, userId: null, name, createdAt: stamp() })
        log(groupId, userId, me.name, `added ${name}`)
        return toMember(row, group, userId)
      })
    },

    rename(userId: number, groupId: number, memberId: number, input: unknown): Member {
      const { name } = parse(memberSchema, input)
      const { group, me } = membership(userId, groupId)
      const target = repo.members.byId(memberId)
      if (!target || target.groupId !== groupId) throw notFound('Person')
      if (target.userId !== null && target.userId !== userId) {
        throw new AppError(403, 'forbidden', `${target.name} has an account — only they can change their name`)
      }
      repo.transaction(() => {
        repo.members.update(memberId, { name })
        log(groupId, userId, me.name, `renamed ${target.name} to ${name}`)
      })
      return toMember({ ...target, name }, group, userId)
    },

    /** Only people with no expenses or payments can be removed — history is never rewritten. */
    remove(userId: number, groupId: number, memberId: number): void {
      const { group, me } = membership(userId, groupId)
      const target = repo.members.byId(memberId)
      if (!target || target.groupId !== groupId) throw notFound('Person')
      if (target.userId !== null) throw new AppError(409, 'has_account', `${target.name} has an account. They can leave the group themselves.`)
      const used =
        repo.expenses.listByGroup(groupId).some((e) => e.paidBy === memberId || String(memberId) in e.shares) ||
        repo.settlements.listByGroup(groupId).some((s) => s.fromMember === memberId || s.toMember === memberId)
      if (used) throw new AppError(409, 'in_use', `${target.name} is part of existing expenses or payments, so they can't be removed`)
      void group
      repo.transaction(() => {
        repo.members.delete(memberId)
        log(groupId, userId, me.name, `removed ${target.name}`)
      })
    },
  }

  // ---------- expenses ----------
  const expenses = {
    list(userId: number, groupId: number): Expense[] {
      const { group } = membership(userId, groupId)
      return repo.expenses
        .listByGroup(groupId)
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
        .map((e) => toExpense(e, group, userId))
    },

    create(userId: number, groupId: number, input: unknown): Expense {
      const data = parse(expenseSchema, input)
      const { group, me } = membership(userId, groupId)
      assertMembers(groupId, [data.paidBy], 'paidBy')
      assertMembers(groupId, splitMemberIds(data.split), 'split')
      const shares = deriveShares(data.amount, data.split)
      const ts = stamp()
      return repo.transaction(() => {
        const row = repo.expenses.insert({ groupId, ...data, shares, createdBy: userId, createdAt: ts, updatedAt: ts })
        log(groupId, userId, me.name, `added “${row.description}” · ${money(group, row.amount)}`)
        return toExpense(row, group, userId)
      })
    },

    update(userId: number, groupId: number, expenseId: number, input: unknown): Expense {
      const data = parse(expenseSchema, input)
      const { group, me } = membership(userId, groupId)
      const existing = repo.expenses.byId(expenseId)
      if (!existing || existing.groupId !== groupId) throw notFound('Expense')
      if (existing.createdBy !== userId && group.ownerId !== userId) {
        throw new AppError(403, 'forbidden', 'Only the person who added this expense, or the group creator, can change it')
      }
      assertMembers(groupId, [data.paidBy], 'paidBy')
      assertMembers(groupId, splitMemberIds(data.split), 'split')
      const shares = deriveShares(data.amount, data.split)
      repo.transaction(() => {
        repo.expenses.update(expenseId, { ...data, shares, updatedAt: stamp() })
        log(groupId, userId, me.name, `edited “${data.description}”`)
      })
      return toExpense(repo.expenses.byId(expenseId)!, group, userId)
    },

    remove(userId: number, groupId: number, expenseId: number): void {
      const { group, me } = membership(userId, groupId)
      const existing = repo.expenses.byId(expenseId)
      if (!existing || existing.groupId !== groupId) throw notFound('Expense')
      if (existing.createdBy !== userId && group.ownerId !== userId) {
        throw new AppError(403, 'forbidden', 'Only the person who added this expense, or the group creator, can delete it')
      }
      repo.transaction(() => {
        repo.expenses.delete(expenseId)
        log(groupId, userId, me.name, `deleted “${existing.description}” (${money(group, existing.amount)})`)
      })
    },
  }

  // ---------- settlements ----------
  const settlements = {
    list(userId: number, groupId: number): Settlement[] {
      const { group } = membership(userId, groupId)
      return repo.settlements
        .listByGroup(groupId)
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
        .map((s) => toSettlement(s, group, userId))
    },

    create(userId: number, groupId: number, input: unknown): Settlement {
      const data = parse(settlementSchema, input)
      const { group, me } = membership(userId, groupId)
      assertMembers(groupId, [data.fromMember, data.toMember], 'fromMember')
      return repo.transaction(() => {
        const row = repo.settlements.insert({ groupId, ...data, createdBy: userId, createdAt: stamp() })
        log(groupId, userId, me.name, `recorded ${memberName(groupId, row.fromMember)} paying ${memberName(groupId, row.toMember)} ${money(group, row.amount)}`)
        return toSettlement(row, group, userId)
      })
    },

    remove(userId: number, groupId: number, settlementId: number): void {
      const { group, me } = membership(userId, groupId)
      const s = repo.settlements.byId(settlementId)
      if (!s || s.groupId !== groupId) throw notFound('Payment')
      if (s.createdBy !== userId && group.ownerId !== userId) {
        throw new AppError(403, 'forbidden', 'Only the person who recorded this payment, or the group creator, can delete it')
      }
      repo.transaction(() => {
        repo.settlements.delete(settlementId)
        log(groupId, userId, me.name, `deleted a payment of ${money(group, s.amount)}`)
      })
    },
  }

  // ---------- insights & overview ----------
  function insights(userId: number, groupId: number, todayInput?: string): Insights {
    membership(userId, groupId)
    const list = repo.expenses.listByGroup(groupId)
    const today = todayInput && /^\d{4}-\d{2}-\d{2}$/.test(todayInput) ? todayInput : isoDay(now())
    const months: string[] = []
    const [y, m] = today.split('-').map(Number)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(y, m - 1 - i, 1))
      months.push(d.toISOString().slice(0, 7))
    }
    const byCategory = CATEGORIES.map((category) => {
      const items = list.filter((e) => e.category === category)
      return { category, amount: items.reduce((n, e) => n + e.amount, 0), count: items.length }
    })
      .filter((c) => c.count > 0)
      .sort((a, b) => b.amount - a.amount)
    const balances = balancesFor(groupId, repo.members.listByGroup(groupId))
    return {
      total: list.reduce((n, e) => n + e.amount, 0),
      byCategory,
      byMonth: months.map((month) => ({ month, amount: list.filter((e) => e.date.startsWith(month)).reduce((n, e) => n + e.amount, 0) })),
      perMember: balances.map((b) => ({ memberId: b.memberId, paid: b.paid, share: b.share })),
    }
  }

  function activity(userId: number, groupId?: number, limit = 20): Activity[] {
    const mine = repo.members.listByUser(userId).map((m) => m.groupId)
    const ids = groupId ? (membership(userId, groupId), [groupId]) : mine
    return repo.activity.listByGroups(ids, Math.min(Math.max(limit, 1), 100)).map((a) => {
      const g = repo.groups.byId(a.groupId)
      return {
        id: a.id,
        groupId: a.groupId,
        groupName: g?.name ?? '',
        groupEmoji: g?.emoji ?? '',
        actorName: a.actorName,
        isYou: a.userId === userId,
        text: a.text,
        createdAt: a.createdAt,
      }
    })
  }

  function overview(userId: number): Overview {
    const list = groups.list(userId)
    const totals = new Map<Currency, { owed: number; owe: number }>()
    for (const g of list) {
      const t = totals.get(g.currency) ?? { owed: 0, owe: 0 }
      if (g.myBalance > 0) t.owed += g.myBalance
      else t.owe += -g.myBalance
      totals.set(g.currency, t)
    }
    return {
      totals: [...totals]
        .map(([currency, t]) => ({ currency, ...t }))
        .sort((a, b) => CURRENCIES.indexOf(a.currency) - CURRENCIES.indexOf(b.currency)),
      groups: list,
      activity: activity(userId, undefined, 12),
    }
  }

  /** Three realistic sample groups so a new account has something to explore. */
  function seedSample(userId: number, todayInput?: string): GroupSummary[] {
    const today = todayInput ?? isoDay(now())
    const d = (n: number) => addDays(today, n)
    return repo.transaction(() => {
      const trip = groups.create(userId, { name: 'Goa trip', emoji: '🏖️', currency: 'INR', memberNames: ['Aisha', 'Rohan', 'Meera'] })
      const [you, aisha, rohan, meera] = trip.members.map((m) => m.id)
      const everyone = [you, aisha, rohan, meera]
      const add = (gid: number, e: ExpenseInput) => expenses.create(userId, gid, e)
      add(trip.id, { description: 'Villa, 3 nights', amount: 2_400_000, paidBy: aisha, date: d(-12), category: 'stay', split: { type: 'equal', memberIds: everyone } })
      add(trip.id, { description: 'Flights', amount: 3_120_000, paidBy: you, date: d(-14), category: 'travel', split: { type: 'exact', amounts: [{ memberId: you, amount: 780_000 }, { memberId: aisha, amount: 780_000 }, { memberId: rohan, amount: 840_000 }, { memberId: meera, amount: 720_000 }] } })
      add(trip.id, { description: 'Seafood dinner at Baga', amount: 486_000, paidBy: rohan, date: d(-11), category: 'food', split: { type: 'equal', memberIds: everyone } })
      add(trip.id, { description: 'Scooter rentals', amount: 240_000, paidBy: meera, date: d(-11), category: 'travel', split: { type: 'shares', shares: [{ memberId: you, shares: 1 }, { memberId: aisha, shares: 1 }, { memberId: rohan, shares: 2 }, { memberId: meera, shares: 0 }] } })
      add(trip.id, { description: 'Parasailing', amount: 360_000, paidBy: you, date: d(-10), category: 'entertainment', split: { type: 'equal', memberIds: [you, aisha, rohan] } })
      add(trip.id, { description: 'Groceries for the villa', amount: 182_550, paidBy: aisha, date: d(-12), category: 'groceries', split: { type: 'percent', percents: [{ memberId: you, basisPoints: 2500 }, { memberId: aisha, basisPoints: 2500 }, { memberId: rohan, basisPoints: 2500 }, { memberId: meera, basisPoints: 2500 }] } })
      settlements.create(userId, trip.id, { fromMember: meera, toMember: aisha, amount: 500_000, date: d(-5), note: 'UPI' })

      const flat = groups.create(userId, { name: 'Flat 4B', emoji: '🏠', currency: 'INR', memberNames: ['Kabir', 'Sana'] })
      const [fyou, kabir, sana] = flat.members.map((m) => m.id)
      const flatmates = [fyou, kabir, sana]
      add(flat.id, { description: 'Rent — this month', amount: 5_400_000, paidBy: fyou, date: d(-20), category: 'rent', split: { type: 'exact', amounts: [{ memberId: fyou, amount: 2_000_000 }, { memberId: kabir, amount: 1_700_000 }, { memberId: sana, amount: 1_700_000 }] } })
      add(flat.id, { description: 'Electricity bill', amount: 312_400, paidBy: kabir, date: d(-8), category: 'utilities', split: { type: 'equal', memberIds: flatmates } })
      add(flat.id, { description: 'Wi-Fi', amount: 99_900, paidBy: sana, date: d(-6), category: 'utilities', split: { type: 'equal', memberIds: flatmates } })
      add(flat.id, { description: 'Weekly groceries', amount: 264_000, paidBy: fyou, date: d(-2), category: 'groceries', split: { type: 'equal', memberIds: flatmates } })
      add(flat.id, { description: 'Rent — last month', amount: 5_400_000, paidBy: fyou, date: d(-50), category: 'rent', split: { type: 'exact', amounts: [{ memberId: fyou, amount: 2_000_000 }, { memberId: kabir, amount: 1_700_000 }, { memberId: sana, amount: 1_700_000 }] } })
      settlements.create(userId, flat.id, { fromMember: kabir, toMember: fyou, amount: 1_700_000, date: d(-45), note: 'Rent share' })
      settlements.create(userId, flat.id, { fromMember: sana, toMember: fyou, amount: 1_700_000, date: d(-44), note: 'Rent share' })

      const conf = groups.create(userId, { name: 'Berlin conference', emoji: '💼', currency: 'EUR', memberNames: ['Lena'] })
      const [cyou, lena] = conf.members.map((m) => m.id)
      add(conf.id, { description: 'Airbnb', amount: 42_000, paidBy: lena, date: d(-30), category: 'stay', split: { type: 'equal', memberIds: [cyou, lena] } })
      add(conf.id, { description: 'Train tickets', amount: 8_960, paidBy: cyou, date: d(-31), category: 'travel', split: { type: 'equal', memberIds: [cyou, lena] } })
      add(conf.id, { description: 'Team dinner', amount: 13_450, paidBy: cyou, date: d(-29), category: 'food', split: { type: 'equal', memberIds: [cyou, lena] } })

      return groups.list(userId)
    })
  }

  return { auth, groups, members, expenses, settlements, insights, activity, overview, seedSample }
}

export type Services = ReturnType<typeof createServices>
