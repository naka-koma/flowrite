import type { ReactNode } from "react";
import { SECTION_HEADING_CLASS } from "../lib/ui";

interface SectionCardProps {
  title?: string;
  children: ReactNode;
}

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <section className="card bg-base-100">
      <div className="card-body p-4 sm:p-6">
        {title && <h2 className={SECTION_HEADING_CLASS}>{title}</h2>}
        {children}
      </div>
    </section>
  );
}
