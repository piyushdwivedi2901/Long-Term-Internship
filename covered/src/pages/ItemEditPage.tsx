import { useMemo, useRef, useState } from 'react'
import { useFieldArray, useForm, useWatch, type Control } from 'react-hook-form'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { keys, useItem, useSaveItem } from '../api/hooks.ts'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/types.ts'
import { useAuth } from '../auth/AuthContext.tsx'
import { CATEGORIES, CATEGORY_LABELS } from '../../shared/schemas.ts'
import { coverageAnswer, layoutCoverages } from '../../shared/warranty.ts'
import { localToday } from '../lib/dates.ts'
import { ACCEPT, formatBytes, prepareUpload } from '../lib/files.ts'
import { useUi } from '../lib/uiStore.ts'
import { CoverageTimeline } from '../features/CoverageTimeline.tsx'
import { DEFAULT_LABEL, PRESETS, emptyForm, itemResolver, rowMonths, toForm, toInput, type ItemFormValues } from '../features/itemForm.ts'
import { Button } from '../ui/Button.tsx'
import { CATEGORY_ICONS } from '../ui/bits.tsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx'
import { Field } from '../ui/Field.tsx'
import { PageLoading } from '../ui/Spinner.tsx'

/** Live "what this means" preview under the warranty rows. */
function CoverPreview({ control, remindDays }: { control: Control<ItemFormValues>; remindDays: number }) {
  const [purchaseDate, rows] = useWatch({ control, name: ['purchaseDate', 'coverages'] })
  const today = localToday()
  const covers = useMemo(() => {
    return rows
      .map((r) => ({ kind: r.kind, label: r.kind === 'standard' ? 'Standard' : r.label.trim() || DEFAULT_LABEL[r.kind] || 'Part', months: rowMonths(r), provider: r.provider.trim() }))
      .filter((c) => Number.isInteger(c.months) && c.months >= 1 && c.months <= 240)
  }, [rows])
  if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate) || Number.isNaN(Date.parse(purchaseDate))) return null
  if (covers.length === 0) return <p className="preview preview--empty">No warranty added — Covered will still keep the bill and details.</p>
  const views = layoutCoverages(purchaseDate, covers, today)
  const answer = coverageAnswer(views, today, remindDays)
  return (
    <div className="preview" aria-live="polite">
      <p className={`preview__answer tone--${answer.tone}`}>
        <strong>{answer.headline}</strong> <span>{answer.detail}</span>
      </p>
      <CoverageTimeline purchaseDate={purchaseDate} coverages={views} today={today} remindDays={remindDays} />
    </div>
  )
}

export default function ItemEditPage() {
  const { itemId } = useParams()
  const id = Number(itemId) || 0
  const editing = id > 0
  const item = useItem(id)
  if (editing && item.isPending) return <PageLoading label="Loading item" />
  if (editing && item.isError) {
    return (
      <div className="page page--narrow">
        <h1>Item not found</h1>
        <p className="muted">{item.error.message}</p>
        <Link to="/items" className="button">Back to my things</Link>
      </div>
    )
  }
  return <ItemForm key={id} initial={editing ? toForm(item.data!) : emptyForm(localToday())} itemId={editing ? id : undefined} />
}

interface Queued {
  key: number
  file: File
}

function ItemForm({ initial, itemId }: { initial: ItemFormValues; itemId?: number }) {
  const navigate = useNavigate()
  const { user, api } = useAuth()
  const toast = useUi((s) => s.toast)
  const save = useSaveItem()
  const qc = useQueryClient()
  const leaving = useRef(false)
  const [queued, setQueued] = useState<Queued[]>([])
  const [fileError, setFileError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ItemFormValues>({ resolver: itemResolver, defaultValues: initial, mode: 'onSubmit', reValidateMode: 'onChange' })
  const covers = useFieldArray({ control, name: 'coverages' })
  const rows = useWatch({ control, name: 'coverages' })
  const hasStandard = rows.some((r) => r.kind === 'standard')
  const hasExtended = rows.some((r) => r.kind === 'extended')

  const blocker = useBlocker(({ currentLocation, nextLocation }) => !leaving.current && (isDirty || queued.length > 0) && currentLocation.pathname !== nextLocation.pathname)

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync({ id: itemId, input: toInput(values) })
      let failed = 0
      for (const q of queued) {
        try {
          await api.uploadFile(saved.id, await prepareUpload(q.file, { compact: api.mode === 'demo' }))
        } catch {
          failed++
        }
      }
      // The saved item was cached before its bills were uploaded — refresh it.
      if (queued.length) await Promise.all([qc.invalidateQueries({ queryKey: keys.item(saved.id) }), qc.invalidateQueries({ queryKey: keys.items }), qc.invalidateQueries({ queryKey: keys.dashboard })])
      if (failed) toast(`Saved, but ${failed} file${failed === 1 ? '' : 's'} couldn't be uploaded. Try again from the item page.`, 'error')
      else toast(itemId ? 'Changes saved' : `${saved.name} added`, 'success')
      leaving.current = true
      navigate(`/items/${saved.id}`, { replace: !itemId })
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        for (const [k, m] of Object.entries(e.fields)) setError(k.replace(/^coverages\.(\d+)\.months$/, 'coverages.$1.amount') as never, { message: m })
      } else setError('root', { message: (e as Error).message })
    }
  })

  const addFiles = (files: FileList | null) => {
    setFileError('')
    if (!files) return
    const ok: Queued[] = []
    for (const f of Array.from(files)) {
      if (!ACCEPT.split(',').includes(f.type)) setFileError(`${f.name}: upload a photo (JPG, PNG, WebP) or a PDF`)
      else ok.push({ key: Math.random(), file: f })
    }
    setQueued((q) => [...q, ...ok].slice(0, 10))
  }

  const title = itemId ? `Edit ${initial.name}` : 'Add an item'
  return (
    <div className="page page--form">
      <title>{`${title} · Covered`}</title>
      <Link to={itemId ? `/items/${itemId}` : '/items'} className="back"><ArrowLeft size={16} aria-hidden /> {itemId ? initial.name : 'My things'}</Link>
      <h1>{title}</h1>

      <form className="item-form" onSubmit={onSubmit} noValidate>
        <section className="form-section" aria-labelledby="f-what">
          <div className="form-section__intro">
            <h2 id="f-what">What is it?</h2>
            <p>A name you'd say out loud — “Bedroom AC”, not the model number.</p>
          </div>
          <div className="form-section__body">
            <Field label="Name" error={errors.name?.message}>
              <input autoFocus={!itemId} placeholder="e.g. Kitchen fridge" {...register('name')} />
            </Field>
            <fieldset className="cat-pick">
              <legend className="field__label">Category</legend>
              {CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICONS[c]
                return (
                  <label key={c} className={`cat--${c}`}>
                    <input type="radio" value={c} {...register('category')} />
                    <Icon size={18} strokeWidth={1.75} aria-hidden />
                    <span>{CATEGORY_LABELS[c]}</span>
                  </label>
                )
              })}
            </fieldset>
            <div className="form-row">
              <Field label="Brand" error={errors.brand?.message}>
                <input placeholder="e.g. LG" {...register('brand')} />
              </Field>
              <Field label="Model" error={errors.model?.message}>
                <input placeholder="e.g. GL-T322" {...register('model')} />
              </Field>
            </div>
            <Field label="Room or place" hint="Helps when you search “bedroom” later" error={errors.room?.message}>
              <input placeholder="e.g. Kitchen" {...register('room')} />
            </Field>
          </div>
        </section>

        <section className="form-section" aria-labelledby="f-buy">
          <div className="form-section__intro">
            <h2 id="f-buy">Purchase</h2>
            <p>Copy these from the bill. The invoice and serial numbers are what a service centre asks for first.</p>
          </div>
          <div className="form-section__body">
            <div className="form-row">
              <Field label="Purchase date" hint="Warranty starts from this day" error={errors.purchaseDate?.message}>
                <input type="date" max={localToday()} {...register('purchaseDate')} />
              </Field>
              <Field label="Price paid (₹)" error={errors.price?.message}>
                <input inputMode="decimal" placeholder="e.g. 54,990" {...register('price')} />
              </Field>
            </div>
            <Field label="Bought from" error={errors.store?.message}>
              <input placeholder="e.g. Croma, Amazon, local dealer" {...register('store')} />
            </Field>
            <div className="form-row">
              <Field label="Invoice number" error={errors.invoiceNo?.message}>
                <input className="mono" {...register('invoiceNo')} />
              </Field>
              <Field label="Serial number" hint="On a sticker at the back or under the battery" error={errors.serialNo?.message}>
                <input className="mono" {...register('serialNo')} />
              </Field>
            </div>
          </div>
        </section>

        <section className="form-section" aria-labelledby="f-cover">
          <div className="form-section__intro">
            <h2 id="f-cover">Warranty</h2>
            <p>Add every cover on the warranty card. Parts like an AC compressor or a TV panel often have their own, much longer cover.</p>
          </div>
          <div className="form-section__body">
            {covers.fields.length > 0 && (
              <ol className="cover-rows">
                {covers.fields.map((f, i) => {
                  const kind = rows[i]?.kind ?? f.kind
                  const e = errors.coverages?.[i]
                  return (
                    <li key={f.id} className={`cover-row cover-row--${kind}`}>
                      <Field label="Type">
                        <select
                          {...register(`coverages.${i}.kind`, {
                            onChange: (ev) => {
                              const next = ev.target.value as keyof typeof DEFAULT_LABEL
                              const label = getValues(`coverages.${i}.label`)
                              if (!label || Object.values(DEFAULT_LABEL).includes(label)) setValue(`coverages.${i}.label`, DEFAULT_LABEL[next])
                            },
                          })}
                        >
                          <option value="standard" disabled={hasStandard && kind !== 'standard'}>Standard</option>
                          <option value="extended" disabled={hasExtended && kind !== 'extended'}>Extended</option>
                          <option value="component">Part</option>
                        </select>
                      </Field>
                      {kind !== 'standard' ? (
                        <Field label={kind === 'component' ? 'Which part' : 'Plan name'} error={e?.label?.message}>
                          <input placeholder={kind === 'component' ? 'e.g. Compressor' : 'e.g. Croma Protect'} {...register(`coverages.${i}.label`)} />
                        </Field>
                      ) : (
                        <div className="cover-row__note">
                          <span className="field__label">Starts</span>
                          <span>On the purchase date</span>
                        </div>
                      )}
                      <div className="field">
                        <label className="field__label" htmlFor={`cov-${f.id}-amount`}>Length</label>
                        <div className="duration">
                          <input
                            id={`cov-${f.id}-amount`}
                            inputMode="decimal"
                            aria-invalid={e?.amount ? true : undefined}
                            aria-describedby={e?.amount ? `cov-${f.id}-err` : undefined}
                            {...register(`coverages.${i}.amount`)}
                          />
                          <select aria-label="Unit" {...register(`coverages.${i}.unit`)}>
                            <option value="years">years</option>
                            <option value="months">months</option>
                          </select>
                        </div>
                        {e?.amount && <p id={`cov-${f.id}-err`} className="field__error" role="alert">{e.amount.message}</p>}
                      </div>
                      <Field label="Given by" error={e?.provider?.message}>
                        <input placeholder={kind === 'extended' ? 'e.g. Croma' : 'e.g. the brand'} {...register(`coverages.${i}.provider`)} />
                      </Field>
                      <button type="button" className="icon-btn cover-row__remove" aria-label={`Remove ${kind === 'component' ? rows[i]?.label || 'part' : kind} cover`} onClick={() => covers.remove(i)}>
                        <Trash2 size={17} aria-hidden />
                      </button>
                      {kind === 'extended' && <p className="cover-row__hint">Starts the day after the standard warranty ends.</p>}
                    </li>
                  )
                })}
              </ol>
            )}
            {errors.coverages?.message && <p className="field__error" role="alert">{errors.coverages.message}</p>}
            {errors.coverages?.root?.message && <p className="field__error" role="alert">{errors.coverages.root.message}</p>}
            <div className="presets" role="group" aria-label="Add a cover">
              {PRESETS.filter((p) => !(p.row.kind === 'standard' && hasStandard) && !(p.row.kind === 'extended' && hasExtended)).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="preset"
                  disabled={rows.length >= 6}
                  onClick={() => covers.append({ ...p.row, provider: p.row.kind === 'extended' ? '' : getValues('brand') })}
                >
                  <Plus size={14} aria-hidden /> {p.label}
                </button>
              ))}
            </div>
            <CoverPreview control={control} remindDays={user?.remindDays ?? 30} />
          </div>
        </section>

        <section className="form-section" aria-labelledby="f-support">
          <div className="form-section__intro">
            <h2 id="f-support">Service contact</h2>
            <p>Where to call when it breaks. Usually printed on the warranty card.</p>
          </div>
          <div className="form-section__body">
            <div className="form-row">
              <Field label="Phone" error={errors.support?.phone?.message}>
                <input type="tel" inputMode="tel" placeholder="e.g. 1800 123 4567" {...register('support.phone')} />
              </Field>
              <Field label="Email" error={errors.support?.email?.message}>
                <input type="email" {...register('support.email')} />
              </Field>
            </div>
            <Field label="Support website" error={errors.support?.website?.message}>
              <input type="url" placeholder="https://" {...register('support.website')} />
            </Field>
            <Field label="Notes" hint="Anything worth remembering — installation, free services left, AMC" error={errors.notes?.message}>
              <textarea rows={3} {...register('notes')} />
            </Field>
          </div>
        </section>

        {!itemId && (
          <section className="form-section" aria-labelledby="f-bill">
            <div className="form-section__intro">
              <h2 id="f-bill">Bill &amp; photos</h2>
              <p>The invoice is your proof of purchase. Add the warranty card and a photo of the serial-number sticker too.</p>
            </div>
            <div className="form-section__body">
              <div className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => (e.preventDefault(), addFiles(e.dataTransfer.files))}>
                <ImagePlus size={26} strokeWidth={1.5} aria-hidden />
                <p>Drop files here, or</p>
                <Button size="sm" onClick={() => fileInput.current?.click()}>Choose photos or PDFs</Button>
                <input ref={fileInput} type="file" accept={ACCEPT} multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ''))} aria-label="Choose bill files" />
              </div>
              {fileError && <p className="field__error" role="alert">{fileError}</p>}
              {queued.length > 0 && (
                <ul className="queued">
                  {queued.map((q) => (
                    <li key={q.key}>
                      <FileText size={16} aria-hidden />
                      <span className="queued__name">{q.file.name}</span>
                      <span className="muted small">{formatBytes(q.file.size)}</span>
                      <button type="button" className="icon-btn icon-btn--sm" aria-label={`Remove ${q.file.name}`} onClick={() => setQueued((list) => list.filter((x) => x.key !== q.key))}>
                        <X size={14} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {errors.root && <p className="form-error" role="alert">{errors.root.message}</p>}
        <div className="form-actions">
          <Link to={itemId ? `/items/${itemId}` : '/items'} className="button">Cancel</Link>
          <Button type="submit" variant="primary" busy={isSubmitting}>{itemId ? 'Save changes' : queued.length ? `Save and upload ${queued.length} file${queued.length === 1 ? '' : 's'}` : 'Save item'}</Button>
        </div>
      </form>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Leave without saving?"
        confirmLabel="Discard changes"
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      >
        <p>Your changes to this item haven't been saved.</p>
      </ConfirmDialog>
    </div>
  )
}
