import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Download } from 'lucide-react'
import { profileSchema, type ProfileInput } from '../../shared/schemas.ts'
import { ApiError } from '../api/types.ts'
import { useAuth } from '../auth/AuthContext.tsx'
import { useTheme, type ThemePreference } from '../lib/theme.tsx'
import { useUi } from '../lib/uiStore.ts'
import { Button } from '../ui/Button.tsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx'
import { Field } from '../ui/Field.tsx'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export default function SettingsPage() {
  return (
    <div className="page page--narrow">
      <header className="page__header">
        <h1>Settings</h1>
      </header>
      <Profile />
      <Appearance />
      <Shortcuts />
      <DataSection />
      <DangerZone />
    </div>
  )
}

function Profile() {
  const { user, api, setUser } = useAuth()
  const toast = useUi((s) => s.toast)
  const { register, handleSubmit, reset, setError, formState: { errors, isDirty, isSubmitting } } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '' },
  })
  const onSubmit = handleSubmit(async (values) => {
    try {
      const updated = await api.updateProfile(values)
      setUser(updated)
      reset({ name: updated.name })
      toast('Profile saved', 'success')
    } catch (err) {
      setError('name', { message: err instanceof ApiError ? err.fields?.name ?? err.message : String(err) })
    }
  })
  return (
    <section className="settings-section" aria-labelledby="s-profile">
      <h2 id="s-profile">Profile</h2>
      <form onSubmit={onSubmit} noValidate className="stack">
        <Field label="Name" error={errors.name?.message}>
          <input autoComplete="name" {...register('name')} />
        </Field>
        <Field label="Email" hint="Your email is used to sign in and can't be changed here.">
          <input value={user?.email ?? ''} readOnly />
        </Field>
        <div className="row">
          <Button type="submit" variant="primary" disabled={!isDirty} busy={isSubmitting}>Save profile</Button>
        </div>
      </form>
    </section>
  )
}

function Appearance() {
  const { preference, setPreference } = useTheme()
  const options: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: 'Match my system' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ]
  return (
    <section className="settings-section" aria-labelledby="s-appearance">
      <h2 id="s-appearance">Appearance</h2>
      <fieldset className="radio-cards">
        <legend className="sr-only">Theme</legend>
        {options.map((o) => (
          <label key={o.value} className={`radio-card theme-preview--${o.value}`}>
            <input type="radio" name="theme" value={o.value} checked={preference === o.value} onChange={() => setPreference(o.value)} />
            <span className="radio-card__swatch" aria-hidden />
            {o.label}
          </label>
        ))}
      </fieldset>
      <p className="muted small">Animations follow your system's reduced-motion setting.</p>
    </section>
  )
}

function Shortcuts() {
  const mod = isMac ? '⌘' : 'Ctrl'
  const rows: [string, string][] = [
    [`${mod} K`, 'Search and jump anywhere'],
    ['C', 'New task'],
    ['Space, then arrow keys', 'Move a focused card on a board (Space again to drop, Esc to cancel)'],
    [`${mod} Enter`, 'Send a comment'],
    ['Esc', 'Close dialogs'],
  ]
  return (
    <section className="settings-section" aria-labelledby="s-keys">
      <h2 id="s-keys">Keyboard shortcuts</h2>
      <dl className="shortcuts">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt><kbd>{k}</kbd></dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function DataSection() {
  const { api, user } = useAuth()
  const [busy, setBusy] = useState(false)
  const toast = useUi((s) => s.toast)
  const exportData = async () => {
    setBusy(true)
    try {
      const [projects, tasks] = await Promise.all([api.listProjects(), api.listTasks()])
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), user, projects, tasks }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: `flowboard-export-${new Date().toISOString().slice(0, 10)}.json` })
      a.click()
      URL.revokeObjectURL(url)
      toast(`Exported ${projects.length} projects and ${tasks.length} tasks`, 'success')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="settings-section" aria-labelledby="s-data">
      <h2 id="s-data">Your data</h2>
      <p className="muted">
        {api.mode === 'demo'
          ? 'This copy of Flowboard runs in demo mode: your account and tasks are stored only in this browser.'
          : 'Your data is stored on the Flowboard server.'}
      </p>
      <Button icon={<Download size={16} aria-hidden />} busy={busy} onClick={exportData}>Export as JSON</Button>
    </section>
  )
}

function DangerZone() {
  const { api, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      await api.deleteAccount({ password })
      signOut()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }
  return (
    <section className="settings-section settings-section--danger" aria-labelledby="s-danger">
      <h2 id="s-danger">Delete account</h2>
      <p className="muted">Permanently removes your account, projects, tasks and comments.</p>
      <Button variant="danger" onClick={() => setOpen(true)}>Delete my account</Button>
      <ConfirmDialog
        open={open}
        title="Delete your account?"
        confirmLabel="Delete account"
        busy={busy}
        onCancel={() => {
          setOpen(false)
          setPassword('')
          setError('')
        }}
        onConfirm={confirm}
      >
        <p>Everything you've created will be deleted. This can't be undone.</p>
        <Field label="Enter your password to confirm" error={error}>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
      </ConfirmDialog>
    </section>
  )
}
