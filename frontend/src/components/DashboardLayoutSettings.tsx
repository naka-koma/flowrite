import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DashboardSection, DashboardSectionId } from "../hooks/useDashboardLayout";

const SECTION_LABELS: Record<DashboardSectionId, string> = {
  upload: "CSVアップロード",
  summary: "サマリー",
  trend: "トレンド",
  aiAdvice: "AIアドバイス",
};

interface DashboardLayoutSettingsProps {
  sections: DashboardSection[];
  onToggleVisibility: (id: DashboardSectionId) => void;
  onMoveSection: (id: DashboardSectionId, direction: "up" | "down") => void;
  onReorderSections: (activeId: DashboardSectionId, overId: DashboardSectionId) => void;
  onReset: () => void;
}

interface SortableRowProps {
  section: DashboardSection;
  label: string;
  index: number;
  total: number;
  onToggleVisibility: (id: DashboardSectionId) => void;
  onMoveSection: (id: DashboardSectionId, direction: "up" | "down") => void;
}

// ドラッグハンドルのボタンは上下移動ボタンと同様のキーボード操作可能なアクセシビリティ代替として残す
function SortableRow({ section, label, index, total, onToggleVisibility, onMoveSection }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-box border border-base-300 p-2"
    >
      <button
        type="button"
        aria-label={`${label}をドラッグして並び替え`}
        className="btn btn-ghost btn-xs cursor-grab touch-none"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <div className="flex flex-col">
        <button
          type="button"
          aria-label={`${label}を上に移動`}
          disabled={index === 0}
          onClick={() => onMoveSection(section.id, "up")}
          className="btn btn-ghost btn-xs"
        >
          ▲
        </button>
        <button
          type="button"
          aria-label={`${label}を下に移動`}
          disabled={index === total - 1}
          onClick={() => onMoveSection(section.id, "down")}
          className="btn btn-ghost btn-xs"
        >
          ▼
        </button>
      </div>
      <label className="label flex flex-1 cursor-pointer justify-start gap-2">
        <input
          type="checkbox"
          className="toggle toggle-sm"
          checked={section.visible}
          onChange={() => onToggleVisibility(section.id)}
          aria-label={`${label}を表示`}
        />
        <span>{label}</span>
      </label>
    </li>
  );
}

export function DashboardLayoutSettings({
  sections,
  onToggleVisibility,
  onMoveSection,
  onReorderSections,
  onReset,
}: DashboardLayoutSettingsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorderSections(active.id as DashboardSectionId, over.id as DashboardSectionId);
  };

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2">
            {sections.map((section, index) => (
              <SortableRow
                key={section.id}
                section={section}
                label={SECTION_LABELS[section.id]}
                index={index}
                total={sections.length}
                onToggleVisibility={onToggleVisibility}
                onMoveSection={onMoveSection}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <button type="button" onClick={onReset} className="btn btn-ghost btn-sm mt-3">
        初期状態に戻す
      </button>
    </div>
  );
}
