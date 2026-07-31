import { UploadForm } from "./UploadForm";

interface UploadModalProps {
  onClose: () => void;
}

export function UploadModal({ onClose }: UploadModalProps) {
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
        >
          ✕
        </button>
        <UploadForm />
      </div>
      <button type="button" aria-label="モーダルの外側" className="modal-backdrop" onClick={onClose}>
        close
      </button>
    </div>
  );
}
