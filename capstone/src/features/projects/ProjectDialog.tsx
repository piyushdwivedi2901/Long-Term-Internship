import { useLayoutEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { PROJECT_COLORS, projectSchema } from '../../../shared/schemas.ts'
import type { Project } from '../../../shared/types.ts'
import { useCreateProject, useUpdateProject } from '../../api/hooks.ts'
import { ApiError } from '../../api/types.ts'
import { useUi } from '../../lib/uiStore.ts'
import { Button } from '../../ui/Button.tsx'
import { Field } from '../../ui/Field.tsx'
import { Modal } from '../../ui/Modal.tsx'

const formSchema = z.object({
  name: projectSchema.shape.name,
  description: z.string().trim().max(280, 'Use 280 characters or fewer'),
  color: z.enum(PROJECT_COLORS),
})
type Values = z.infer<typeof formSchema>

const COLOR_NAMES: Record<(typeof PROJECT_COLORS)[number], string> = {
  blue: 'Blue',
  teal: 'Teal',
  amber: 'Amber',
  magenta: 'Magenta',
  green: 'Green',
  violet: 'Violet',
}

/** Create a project (no `project`) or edit one. */
export function ProjectDialog({ open, onClose, project }: { open: boolean; onClose: () => void; project?: Project }) {
  const create = useCreateProject()
  const update = useUpdateProject()
  const toast = useUi((s) => s.toast)
  const navigate = useNavigate()
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(formSchema),
  })

  useLayoutEffect(() => {
    if (open) reset({ name: project?.name ?? '', description: project?.description ?? '', color: project?.color ?? 'blue' })
  }, [open, project, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (project) {
        await update.mutateAsync({ id: project.id, patch: values })
        toast('Project updated', 'success')
        onClose()
      } else {
        const created = await create.mutateAsync(values)
        toast(`Created “${created.name}”`, 'success')
        onClose()
        navigate(`/projects/${created.id}`)
      }
    } catch (err) {
      const fields = err instanceof ApiError ? err.fields : undefined
      if (fields) for (const [k, m] of Object.entries(fields)) setError(k as keyof Values, { message: m })
      else setError('root', { message: (err as Error).message })
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? 'Edit project' : 'New project'}
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="project-form" busy={isSubmitting}>
            {project ? 'Save changes' : 'Create project'}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={onSubmit} noValidate className="stack">
        <Field label="Name" error={errors.name?.message}>
          <input data-autofocus autoComplete="off" placeholder="e.g. Website relaunch" {...register('name')} />
        </Field>
        <Field label="Description" hint="Optional — what is this project for?" error={errors.description?.message}>
          <textarea rows={3} {...register('description')} />
        </Field>
        <fieldset className="swatches">
          <legend className="field__label">Line colour</legend>
          {PROJECT_COLORS.map((c) => (
            <label key={c} className={`swatch line--${c}`}>
              <input type="radio" value={c} {...register('color')} />
              <span className="sr-only">{COLOR_NAMES[c]}</span>
            </label>
          ))}
        </fieldset>
        {errors.root && <p className="form-error" role="alert">{errors.root.message}</p>}
      </form>
    </Modal>
  )
}
