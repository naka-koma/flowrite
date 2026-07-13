import { useState, type ReactNode } from "react";
import { SECTION_HEADING_CLASS } from "../lib/ui";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({ title, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="card bg-base-100">
      <div className="card-body p-4 sm:p-6">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`flex w-full items-center justify-between text-left ${SECTION_HEADING_CLASS}`}
        >
          <span>{title}</span>
          <span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
            ▼
          </span>
        </button>
        {open && <div className="mt-2">{children}</div>}
      </div>
    </section>
  );
}
