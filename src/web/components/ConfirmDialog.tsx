import type { ReactNode } from "react";

interface ConfirmDialogProps {
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: "primary" | "danger" | "success";
  children: ReactNode;
}

export const ConfirmDialog = ({
  title,
  confirmLabel,
  onConfirm,
  onCancel,
  tone = "primary",
  children
}: ConfirmDialogProps) => (
  <div className="overlay-backdrop" onClick={onCancel} role="presentation">
    <section
      className="panel strong game-card stack overlay-panel"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(event) => event.stopPropagation()}
    >
      <h2 className="section-title" style={{ marginTop: 0 }}>{title}</h2>
      <div className="subtle dialog-copy">{children}</div>
      <div className="button-row">
        <button className={`button ${tone}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button className="ghost-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  </div>
);
