import { useClickOutside } from "@/utils"
import { t } from "i18next"
import { useRef, useState } from "react"

type ActionsMenuProps = {
    onDelete: () => void
    onEdit?: () => void
}

export function ActionsMenu({ onDelete, onEdit }: ActionsMenuProps) {
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useClickOutside(containerRef, () => setOpen(false))

    return (
        <div ref={containerRef} className="relative inline-block">
            <button
                className="btn btn-ghost btn-sm"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setOpen(prev => !prev)}
            >
                ⋯
            </button>

            {open && (
                <div className="absolute right-0 mt-1 w-40 bg-base-100 rounded-md shadow-lg z-20 flex flex-col">
                    {onEdit && (
                        <button
                            className="text-left px-3 py-2 hover:bg-base-200 rounded"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => {
                                onEdit()
                                setOpen(false)
                            }}
                        >
                            {t("common.edit")}
                        </button>
                    )}

                    <button
                        className="text-left px-3 py-2 hover:bg-base-200 rounded"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => {
                            onDelete()
                            setOpen(false)
                        }}
                    >
                        {t("common.delete")}
                    </button>
                </div>
            )}
        </div>
    )
}
