import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileSchema, type ProfileInput } from '../../shared/schemas.ts'
import { ApiError } from '../api/types.ts'
import { useAuth } from '../auth/AuthContext.tsx'
import { useTheme, type ThemePreference } from '../lib/theme.tsx'
import { useUi } from '../lib/uiStore.ts'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../ui/Button.tsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx'
import { Field } from '../ui/Field.tsx'

export default function SettingsPage() {
  const { user, api, setUser, signOut } = useAuth()
  const { preference, setPreference } = useTheme()
  const toast = useUi((s) => s.toast)
  const qc = useQueryClient()
  const { register, handleSubmit, reset, setError, formState: { errors, isDirty, isSubmitting } } = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: { name: user?.name ?? '' } })
  const [deleting, setDeleting] = useState(false)
  const [password, setPassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [busy, setBusy] = useState(false)

  const save = handleSubmit(async (v) => {
    try {
      const u = await api.updateProfile(v)
      setUser(u)
      reset({ name: u.name })
      await qc.invalidateQueries()
      toast('Name updated in all your groups', 'success')
    } catch (e) {
      setError('name', { message: e instanceof ApiError ? (e.fields?.name ?? e.message) : String(e) })
    }
  })

  const themes: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: 'Match my device' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ]

  return (
    <div className="page page--narrow">
      <title>Settings · Fairshare</title>
      <h1>Settings</h1>
      <section className="card stack" aria-labelledby="s-profile">
        <h2 id="s-profile" className="section-title">Profile</h2>
        <form className="stack" onSubmit={save} noValidate>
          <Field label="Your name" hint="Shown to everyone in your groups" error={errors.name?.message}>
            <input autoComplete="name" {...register('name')} />
          </Field>
          <Field label="Email">
            <input value={user?.email ?? ''} readOnly />
          </Field>
          <div className="row"><Button type="submit" variant="primary" disabled={!isDirty} busy={isSubmitting}>Save name</Button></div>
        </form>
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
        <h2 id="s-data" className="section-title">Where your data lives</h2>
        <p className="muted">
          {api.mode === 'demo'
            ? 'This copy of Fairshare runs in demo mode: accounts and groups are stored only in this browser, so invite codes work between accounts on this device. Run the Fairshare server to share groups across devices.'
            : 'Your groups are stored on the Fairshare server and shared with the people in them.'}
        </p>
        <p className="muted small">Export any group as a spreadsheet from its People tab.</p>
      </section>

      <section className="card stack card--danger" aria-labelledby="s-delete">
        <h2 id="s-delete" className="section-title">Delete account</h2>
        <p className="muted">Your account is removed. Your name stays on shared expenses so your friends' balances don't change.</p>
        <div><Button variant="danger" onClick={() => setDeleting(true)}>Delete my account</Button></div>
      </section>

      <ConfirmDialog
        open={deleting}
        title="Delete your account?"
        confirmLabel="Delete account"
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
        <p>This can't be undone.</p>
        <Field label="Enter your password to confirm" error={deleteError}>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
      </ConfirmDialog>
    </div>
  )
}
