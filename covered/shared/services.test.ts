import { describe, expect, it } from 'vitest'
import { samplePdfBase64 } from './samplePdf.ts'
import { base64Bytes, sniffMatches } from './services.ts'
import { testServices } from './testing.ts'
import type { ItemInput } from './schemas.ts'

const TODAY = '2026-10-09'

async function setup() {
  const { services, repo } = testServices()
  const a = await services.auth.signup({ name: 'Piyush', email: 'piyush@example.com', password: 'password123' })
  const b = await services.auth.signup({ name: 'Aisha', email: 'aisha@example.com', password: 'password123' })
  return { services, repo, me: a.user.id, other: b.user.id }
}

const fridge = (over: Partial<ItemInput> = {}): ItemInput => ({
  name: 'Fridge',
  brand: 'LG',
  category: 'kitchen',
  purchaseDate: '2025-11-01',
  price: 3_849_000,
  coverages: [
    { kind: 'standard', label: 'Standard', months: 12, provider: 'LG' },
    { kind: 'component', label: 'Compressor', months: 120, provider: 'LG' },
  ],
  ...over,
})
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

describe('accounts', () => {
  it('signs up with a 30-day reminder window and lets you change it', async () => {
    const { services, me } = await setup()
    expect(services.auth.me(me).remindDays).toBe(30)
    expect(services.auth.updateProfile(me, { remindDays: 60 }).remindDays).toBe(60)
    expect(() => services.auth.updateProfile(me, { remindDays: 45 })).toThrow('Choose 7, 15, 30 or 60 days')
  })

  it('rejects duplicate emails and wrong passwords without saying which', async () => {
    const { services } = await setup()
    await expect(services.auth.signup({ name: 'X', email: 'PIYUSH@example.com', password: 'password123' })).rejects.toMatchObject({ code: 'email_taken' })
    await expect(services.auth.login({ email: 'piyush@example.com', password: 'nope-nope' })).rejects.toMatchObject({ status: 401 })
    await expect(services.auth.login({ email: 'ghost@example.com', password: 'nope-nope' })).rejects.toMatchObject({ status: 401 })
  })

  it('deleting the account removes items, bills and repairs', async () => {
    const { services, repo, me } = await setup()
    const item = services.items.create(me, fridge(), TODAY)
    services.files.add(me, item.id, { name: 'bill.png', mime: 'image/png', data: PNG })
    services.claims.create(me, item.id, { date: '2026-01-05', issue: 'Noisy' }, TODAY)
    await expect(services.auth.deleteAccount(me, { password: 'wrong-pass' })).rejects.toMatchObject({ code: 'bad_password' })
    await services.auth.deleteAccount(me, { password: 'password123' })
    expect(repo.snapshot().items).toHaveLength(0)
    expect(repo.snapshot().files).toHaveLength(0)
    expect(repo.snapshot().claims).toHaveLength(0)
  })
})

describe('items', () => {
  it('computes status, cover dates and the plain-language note', async () => {
    const { services, me } = await setup()
    const item = services.items.create(me, fridge(), TODAY)
    expect(item).toMatchObject({ status: 'expiring', coveredUntil: '2026-10-31', daysLeft: 22, statusNote: 'Ends in 22 days' })
    expect(item.coverages.map((c) => [c.label, c.end, c.state])).toEqual([
      ['Standard', '2026-10-31', 'active'],
      ['Compressor', '2035-10-31', 'active'],
    ])
    // A shorter reminder window means it isn't "expiring" yet.
    services.auth.updateProfile(me, { remindDays: 15 })
    expect(services.items.get(me, item.id, TODAY).status).toBe('covered')
  })

  it('validates the form the same way the UI does', async () => {
    const { services, me } = await setup()
    expect(() => services.items.create(me, fridge({ name: ' ' }), TODAY)).toThrow('What is it?')
    expect(() => services.items.create(me, fridge({ purchaseDate: '2026-10-11' }), TODAY)).toThrow("can't be in the future")
    expect(() => services.items.create(me, fridge({ purchaseDate: '2026-02-30' }), TODAY)).toThrow('Enter a real date')
    expect(() =>
      services.items.create(me, fridge({ coverages: [{ kind: 'standard', label: 'A', months: 12 }, { kind: 'standard', label: 'B', months: 24 }] }), TODAY),
    ).toThrow('only one standard warranty')
    expect(() => services.items.create(me, fridge({ support: { website: 'lg.com' } }), TODAY)).toThrow('https://')
    expect(() => services.items.create(me, fridge({ price: 12.5 }), TODAY)).toThrow('whole paise')
  })

  it("keeps everyone's things private: other people get a 404, never a 403", async () => {
    const { services, me, other } = await setup()
    const item = services.items.create(me, fridge(), TODAY)
    expect(() => services.items.get(other, item.id)).toThrow('Item not found')
    expect(() => services.items.update(other, item.id, fridge())).toThrow('Item not found')
    expect(() => services.items.remove(other, item.id)).toThrow('Item not found')
    expect(() => services.files.add(other, item.id, { name: 'x.png', mime: 'image/png', data: PNG })).toThrow('Item not found')
    expect(services.items.list(other)).toEqual([])
  })

  it("won't move the purchase date after a logged repair", async () => {
    const { services, me } = await setup()
    const item = services.items.create(me, fridge(), TODAY)
    services.claims.create(me, item.id, { date: '2025-12-01', issue: 'Door seal' }, TODAY)
    expect(() => services.items.update(me, item.id, fridge({ purchaseDate: '2026-01-01' }), TODAY)).toThrow('before this purchase date')
  })

  it('deleting an item deletes its bills and repairs', async () => {
    const { services, repo, me } = await setup()
    const item = services.items.create(me, fridge(), TODAY)
    services.files.add(me, item.id, { name: 'bill.png', mime: 'image/png', data: PNG })
    services.items.remove(me, item.id)
    expect(repo.snapshot().files).toHaveLength(0)
  })
})

describe('bills and photos', () => {
  it('stores a file, lists it without its contents, and returns it intact', async () => {
    const { services, me, other } = await setup()
    const item = services.items.create(me, fridge(), TODAY)
    const meta = services.files.add(me, item.id, { name: 'Invoice/March?.png', mime: 'image/png', data: PNG })
    expect(meta).toMatchObject({ name: 'Invoice_March_.png', size: 68 })
    expect(services.items.get(me, item.id).files).toEqual([meta])
    expect(services.items.get(me, item.id).fileCount).toBe(1)
    expect(services.files.get(me, meta.id).data).toBe(PNG)
    expect(() => services.files.get(other, meta.id)).toThrow('File not found')
    services.files.remove(me, meta.id)
    expect(services.items.get(me, item.id).files).toEqual([])
  })

  it('checks the bytes really are the claimed type', () => {
    expect(sniffMatches('image/png', PNG)).toBe(true)
    expect(sniffMatches('application/pdf', PNG)).toBe(false)
    expect(sniffMatches('image/jpeg', btoa('MZ\x90\x00 this is an exe'))).toBe(false)
    expect(sniffMatches('application/pdf', samplePdfBase64({ store: 'S', invoiceNo: '1', date: 'd', lines: [], total: '1', footer: '' }))).toBe(true)
    expect(base64Bytes('QUJD')).toBe(3)
    expect(base64Bytes('QUI=')).toBe(2)
  })

  it('rejects disguised files, too many files and a full quota', async () => {
    const { repo } = testServices()
    const { createServices } = await import('./services.ts')
    const { plainHasher, plainTokens } = await import('./testing.ts')
    const services = createServices({ repo, passwords: plainHasher, tokens: plainTokens, fileQuotaBytes: 200, now: () => new Date('2026-10-09T09:00:00Z') })
    const me = (await services.auth.signup({ name: 'P', email: 'p@example.com', password: 'password123' })).user.id
    const item = services.items.create(me, fridge())
    expect(() => services.files.add(me, item.id, { name: 'x.pdf', mime: 'application/pdf', data: PNG })).toThrow("isn't a real photo or PDF")
    expect(() => services.files.add(me, item.id, { name: 'x.gif', mime: 'image/gif' as never, data: PNG })).toThrow('Upload a photo')
    services.files.add(me, item.id, { name: 'a.png', mime: 'image/png', data: PNG })
    services.files.add(me, item.id, { name: 'b.png', mime: 'image/png', data: PNG })
    expect(() => services.files.add(me, item.id, { name: 'c.png', mime: 'image/png', data: PNG })).toThrow('storage is full')
  })
})

describe('repairs', () => {
  it('logs repairs with dates inside the ownership period', async () => {
    const { services, me } = await setup()
    const item = services.items.create(me, fridge(), TODAY)
    expect(() => services.claims.create(me, item.id, { date: '2025-10-01', issue: 'x' }, TODAY)).toThrow('before you bought it')
    expect(() => services.claims.create(me, item.id, { date: '2026-10-12', issue: 'x' }, TODAY)).toThrow("can't be in the future")
    const c = services.claims.create(me, item.id, { date: '2026-09-30', issue: 'Not cooling', status: 'in_progress', ticketNo: 'LG-1' }, TODAY)
    expect(services.items.get(me, item.id).openClaims).toBe(1)
    services.claims.update(me, c.id, { date: '2026-09-30', issue: 'Not cooling', status: 'resolved', cost: 0 }, TODAY)
    expect(services.items.get(me, item.id).openClaims).toBe(0)
  })
})

describe('dashboard', () => {
  it('summarises a realistic household', async () => {
    const { services, me } = await setup()
    services.seedSample(me, TODAY)
    const d = services.dashboard(me, TODAY)
    expect(d.itemCount).toBe(10)
    expect(d.counts).toEqual({ covered: 6, expiring: 1, partial: 2, expired: 1, none: 0 })
    expect(d.upcoming[0]).toMatchObject({ itemName: 'Living room AC', label: 'Standard', daysLeft: 24 })
    // No "standard warranty ends" for things with an extended warranty after it.
    expect(d.upcoming.some((u) => u.itemName === 'Phone' && u.kind === 'standard')).toBe(false)
    expect(d.openClaims).toHaveLength(1)
    expect(d.openClaims[0]).toMatchObject({ itemName: 'Phone', status: 'in_progress' })
    expect(d.repairs).toEqual({ count: 3, underWarranty: 2, spent: 185_000 })
    expect(d.missingBills).toBe(2)
    expect(d.totalValue).toBeGreaterThan(d.protectedValue)
  })

  it('sample bills are real PDFs', async () => {
    const { services, me } = await setup()
    const [first] = services.seedSample(me, TODAY)
    const file = services.items.get(me, first.id).files[0]
    const pdf = atob(services.files.get(me, file.id).data)
    expect(pdf.startsWith('%PDF-1.4')).toBe(true)
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true)
    // Every xref offset points at the start of its object.
    const xref = pdf.slice(pdf.indexOf('xref'))
    const offsets = [...xref.matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]))
    offsets.forEach((o, i) => expect(pdf.slice(o).startsWith(`${i + 1} 0 obj\n`)).toBe(true))
    expect(Number(pdf.match(/startxref\n(\d+)/)![1])).toBe(pdf.indexOf('xref\n'))
  })

  it('exports everything except file contents', async () => {
    const { services, me } = await setup()
    services.seedSample(me, TODAY)
    const backup = services.exportAll(me, TODAY)
    expect(backup).toMatchObject({ app: 'covered', version: 1, user: { email: 'piyush@example.com' } })
    expect(backup.items).toHaveLength(10)
    expect(JSON.stringify(backup)).not.toContain('JVBERi0') // base64 of "%PDF-"
  })
})
