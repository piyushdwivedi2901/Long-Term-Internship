import { useRef, useState } from 'react'
import { Camera, Download, FileText, Trash2, Upload } from 'lucide-react'
import { useDeleteFile, useFileUrl, useUploadFile } from '../api/hooks.ts'
import { useAuth } from '../auth/AuthContext.tsx'
import { MAX_FILES_PER_ITEM } from '../../shared/schemas.ts'
import type { FileMeta } from '../../shared/types.ts'
import { formatDate } from '../lib/dates.ts'
import { ACCEPT, formatBytes, prepareUpload } from '../lib/files.ts'
import { useUi } from '../lib/uiStore.ts'
import { Button } from '../ui/Button.tsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx'
import { Modal } from '../ui/Modal.tsx'
import { Spinner } from '../ui/Spinner.tsx'

function Thumb({ file, onOpen }: { file: FileMeta; onOpen(): void }) {
  const isImage = file.mime.startsWith('image/')
  const url = useFileUrl(isImage ? file.id : null)
  return (
    <button type="button" className="thumb" onClick={onOpen}>
      <span className="thumb__media">
        {isImage ? url.data ? <img src={url.data} alt="" /> : <Spinner size={16} /> : <FileText size={28} strokeWidth={1.5} aria-hidden />}
      </span>
      <span className="thumb__name">{file.name}</span>
      <span className="thumb__meta">{file.mime === 'application/pdf' ? 'PDF' : 'Photo'} · {formatBytes(file.size)}</span>
    </button>
  )
}

function Viewer({ file, onClose, onDelete }: { file: FileMeta | null; onClose(): void; onDelete(f: FileMeta): void }) {
  const url = useFileUrl(file?.id ?? null)
  return (
    <Modal
      open={!!file}
      onClose={onClose}
      title={file?.name ?? ''}
      description={file ? `Added ${formatDate(file.createdAt.slice(0, 10))} · ${formatBytes(file.size)}` : undefined}
      size="lg"
      footer={
        file && (
          <>
            <Button variant="ghost" icon={<Trash2 size={16} aria-hidden />} onClick={() => onDelete(file)} className="viewer__delete">Delete</Button>
            {url.data && (
              <a className="button" href={url.data} download={file.name}>
                <Download size={16} aria-hidden /> <span>Download</span>
              </a>
            )}
            <Button variant="primary" onClick={onClose}>Done</Button>
          </>
        )
      }
    >
      <div className="viewer">
        {!url.data ? (
          url.isError ? <p className="form-error">{url.error.message}</p> : <Spinner size={22} label="Loading file" />
        ) : file?.mime === 'application/pdf' ? (
          <object data={url.data} type="application/pdf" className="viewer__pdf" aria-label={file.name}>
            <p>
              This browser can't show PDFs inline. <a href={url.data} download={file.name}>Download it</a> instead.
            </p>
          </object>
        ) : (
          <img src={url.data} alt={file?.name} className="viewer__img" />
        )}
      </div>
    </Modal>
  )
}

/** The bill, warranty card and photos — kept with the item they prove. */
export function FilesPanel({ itemId, files }: { itemId: number; files: FileMeta[] }) {
  const { api } = useAuth()
  const upload = useUploadFile(itemId)
  const remove = useDeleteFile(itemId)
  const toast = useUi((s) => s.toast)
  const picker = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(0)
  const [open, setOpen] = useState<FileMeta | null>(null)
  const [confirm, setConfirm] = useState<FileMeta | null>(null)
  const full = files.length >= MAX_FILES_PER_ITEM

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return
    const picked = Array.from(list).slice(0, MAX_FILES_PER_ITEM - files.length)
    setBusy(picked.length)
    for (const f of picked) {
      try {
        await upload.mutateAsync(await prepareUpload(f, { compact: api.mode === 'demo' }))
        toast(`${f.name} saved`, 'success')
      } catch (e) {
        toast(`${f.name}: ${(e as Error).message}`, 'error')
      } finally {
        setBusy((n) => n - 1)
      }
    }
  }

  return (
    <section className="card files" aria-labelledby="files-title">
      <div className="card__head">
        <h2 id="files-title" className="section-title">Bill &amp; photos</h2>
        <span className="muted small">{files.length}/{MAX_FILES_PER_ITEM}</span>
      </div>
      {files.length === 0 && busy === 0 && (
        <p className="files__empty">
          <strong>No bill saved yet.</strong> Without the invoice, most brands won't repair it for free — even inside the warranty.
        </p>
      )}
      {(files.length > 0 || busy > 0) && (
        <ul className="thumbs">
          {files.map((f) => (
            <li key={f.id}>
              <Thumb file={f} onOpen={() => setOpen(f)} />
            </li>
          ))}
          {busy > 0 && (
            <li className="thumb thumb--busy" aria-live="polite">
              <Spinner size={18} />
              <span className="thumb__name">Uploading {busy}…</span>
            </li>
          )}
        </ul>
      )}
      <div className="row">
        <Button size="sm" icon={<Upload size={15} aria-hidden />} disabled={full || busy > 0} onClick={() => picker.current?.click()}>
          Add bill or photo
        </Button>
        <Button size="sm" className="only-touch" icon={<Camera size={15} aria-hidden />} disabled={full || busy > 0} onClick={() => camera.current?.click()}>
          Take photo
        </Button>
        <input ref={picker} type="file" accept={ACCEPT} multiple hidden aria-label="Add bill or photo" onChange={(e) => (addFiles(e.target.files), (e.target.value = ''))} />
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden aria-label="Take photo" onChange={(e) => (addFiles(e.target.files), (e.target.value = ''))} />
      </div>
      {api.mode === 'demo' && <p className="muted small">Demo mode keeps files in this browser, so photos are shrunk to save space.</p>}

      <Viewer file={open} onClose={() => setOpen(null)} onDelete={(f) => setConfirm(f)} />
      <ConfirmDialog
        open={!!confirm}
        title="Delete this file?"
        confirmLabel="Delete file"
        busy={remove.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          remove.mutate(confirm!.id, {
            onSuccess: () => toast('File deleted', 'success'),
            onError: (e) => toast(e.message, 'error'),
            onSettled: () => {
              setConfirm(null)
              setOpen(null)
            },
          })
        }
      >
        <p>“{confirm?.name}” will be removed from this item. Keep a copy if it's your only proof of purchase.</p>
      </ConfirmDialog>
    </section>
  )
}
