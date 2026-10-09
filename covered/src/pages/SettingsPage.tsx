import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Braces } from 'lucide-react'
import { REMIND_OPTIONS, profileSchema, type ProfileInput } from '../../shared/schemas.ts'
import { ApiError } from '../api/types.ts'
import { useAuth } from '../auth/AuthContext.tsx'
import { useTheme, type ThemePreference } from '../lib/theme.tsx'
import { useUi } from '../lib/uiStore.ts'
import { CalendarButton, CsvButton, useExport } from '../features/ExportActions.tsx'
import { Button } from '../ui/Button.tsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx'
import { Field } from '../ui/Field.tsx'

export default function SettingsPage() {
  const { user, api, setUser, signOut } = useAuth()
  const { preference, setPreference } = useTheme()
  const toast = useUi((s) => s.toast)
  const qc = useQueryClient()
  const backup = useExport()
  const { register, handleSubmit, reset, setError, formState: { errors, isDirty, isSubmitting } } = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: { name: user?.name ?? '' } })
  const [deleting, setDeleting] = useState(false)
  const [password, setPassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [busy, setBusy] = useState(false)
  const [savingRemind, setSavingRemind] = useState(false)

  const save = handleSubmit(async (v) => {
    try {
      const u = await api.updateProfile({ name: v.name })
      setUser(u)
      reset({ name: u.name })
      toast('Name updated', 'success')
    } catch (e) {
      setError('name', { message: e instanceof ApiError ? (e.fields?.name ?? e.message) : String(e) })
    }
  })

  const setRemind = async (days: number) => {
    setSavingRemind(true)
    try {
      setUser(await api.updateProfile({ remindDays: days }))
      await qc.invalidateQueries()
      toast(`You'll be warned ${days} days before cover ends`, 'success')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setSavingRemind(false)
    }
  }

  const themes: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: 'Match my device' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ]

  return (
    <div className="page page--narrow">
      <title>Settings · Covered</title>
      <h1>Settings</h1>

      <section className="card stack" aria-labelledby="s-profile">
        <h2 id="s-profile" className="section-title">Profile</h2>
        <form className="stack" onSubmit={save} noValidate>
          <Field label="Your name" hint="Used to sign the message for service centres" error={errors.name?.message}>
            <input autoComplete="name" {...register('name')} />
          </Field>
          <Field label="Email">
            <input value={user?.email ?? ''} readOnly />
          </Field>
          <div className="row"><Button type="submit" variant="primary" disabled={!isDirty} busy={isSubmitting}>Save name</Button></div>
        </form>
      </section>

      <section className="card stack" aria-labelledby="s-remind">
        <h2 id="s-remind" className="section-title">Reminders</h2>
        <p className="muted">How early should Covered warn you that cover is about to end? Items inside this window show as “Expiring soon”, and calendar reminders fire this many days before.</p>
        <fieldset className="theme-pick" disabled={savingRemind}>
          <legend className="sr-only">Warn me before cover ends</legend>
          {REMIND_OPTIONS.map((d) => (
            <label key={d}>
              <input type="radio" name="remind" checked={user?.remindDays === d} onChange={() => setRemind(d)} />
              {d} days
            </label>
          ))}
        </fieldset>
      </section>

      <section className="card stack" aria-labelledby="s-theme">
        <h2 id="s-theme" className="section-title">Appearance</h2>
        <fieldset className="theme-pick">
          <legend className="sr-only">Theme</legend>
          {themes.map((t) => (
            <label key={t.value}>
              <input type="radio" name="theme" checked={preference === t.value} onChange={() => setPreference(t.value)} />
              {t.label}
            </label>
          ))}
        </fieldset>
      </section>

      <section className="card stack" aria-labelledby="s-data">
        <h2 id="s-data" className="section-title">Your data</h2>
        <p className="muted">
          {api.mode === 'demo'
            ? 'This copy of Covered runs in demo mode: everything, including bills and photos, is stored only in this browser. Clearing your browsing data deletes it — export a backup if it matters.'
            : 'Your items, bills and repairs are stored on the Covered server, visible only to you.'}
        </p>
        <div className="row">
          <CalendarButton />
          <CsvButton />
          <Button size="sm" icon={<Braces size={16} aria-hidden />} busy={backup.busy === 'json'} onClick={() => backup.run('json')}>Full backup (JSON)</Button>
        </div>
        <p className="muted small">The backup has every detail and date. Bills and photos stay in Covered — download the ones you need from each item.</p>
      </section>

      <section className="card stack card--danger" aria-labelledby="s-delete">
        <h2 id="s-delete" className="section-title">Delete account</h2>
        <p className="muted">Deletes your account and everything in it — items, bills, photos and repair history.</p>
        <div><Button variant="danger" onClick={() => setDeleting(true)}>Delete my account</Button></div>
      </section>

      <ConfirmDialog
        open={deleting}
        title="Delete your account?"
        confirmLabel="Delete everything"
        busy={busy}
        onCancel={() => {
          setDeleting(false)
          setPassword('')
          setDeleteError('')
        }}
        onConfirm={async () => {
          setBusy(true)
          setDeleteError('')
          try {
            await api.deleteAccount({ password })
            signOut()
          } catch (e) {
            setDeleteError((e as Error).message)
            setBusy(false)
          }
        }}
      >
        <p>This can't be undone. Download a backup first if you might need your records.</p>
        <Field label="Enter your password to confirm" error={deleteError}>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
      </ConfirmDialog>
    </div>
  )
}
