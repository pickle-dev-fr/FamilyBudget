import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { UISousPot } from "./types"
import { ActionsMenu } from "@/components/layout/ActionsMenu"

type Props = {
    sousPot: UISousPot
    disabled?: boolean
    onDelete?: (sousPotId: string) => void
}

export default function SousPotItem({
    sousPot,
    disabled,
    onDelete
}: Props) {

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: sousPot.id,
        data: {
            type: "souspot",
            potId: sousPot.pot_id,
        },
        disabled,
    })

    const current = sousPot.current ?? 0

    const percentage =
        sousPot.prevision > 0
            ? (current / sousPot.prevision) * 100
            : current ? 100 : 0

    const clamped = Math.min(percentage, 100)

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        background: "#1e1e1e",
        borderRadius: 6,
        opacity: disabled ? 0.5 : isDragging ? 0 : 1,
        padding: "8px 12px",
        display: "flex",
        flexDirection: "column" as const,
        gap: 6,
    }

    return (
        <div
            ref={setNodeRef}
            className="flex flex-col gap-1 p-2 rounded-md bg-base-200"
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: disabled ? 0.5 : isDragging ? 0 : 1,
            }}
        >
            <div
                {...attributes}
                {...listeners}
                className="grid grid-cols-5 items-center gap-2"
            >
                <div className="cursor-grab">{sousPot.name}</div>
                <div className="text-sm opacity-70">{sousPot.prevision}</div>
                <div className="text-sm">{current}</div>
                <div className="text-sm">{percentage.toFixed(0)} %</div>
                <div className="ml-auto">
                    <ActionsMenu onDelete={() => onDelete?.(sousPot.id)} />
                </div>
            </div>

            <div className="h-2 w-full rounded overflow-hidden">
                <div
                    className={`h-full transition-all ${
                        percentage >= 100
                            ? "bg-error"
                            : percentage > 80
                            ? "bg-warning"
                            : "bg-success"
                    }`}
                    style={{ width: `${clamped}%` }}
                />
            </div>
        </div>
    )
}

