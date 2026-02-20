import { useClickOutside } from "@/utils"
import { t } from "i18next"
import { useRef, useState } from "react"

export function ActionsMenu({
    onDelete,
}: {
    onDelete: () => void
}) {
    const [open, setOpen] = useState(false)
    
    // HOOK de fermeture
    const containerRef = useRef<HTMLDivElement>(null)

    useClickOutside(containerRef, () => {
        setOpen(false)
    })

    return (
        <div ref={containerRef} className="relative inline-block">
            <button
                className="btn btn-ghost btn-sm"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setOpen((prev) => !prev)}
            >
                ⋯
            </button>

            {open && (
                <div className="absolute right-0 mt-1 w-40 bg-bg-soft rounded-md shadow-lg z-20 flex flex-col">
                    <button
                        className="text-left px-3 py-2 hover:bg-gray-700 rounded"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => {
                            onDelete();
                            setOpen(false);
                        }}
                    >
                        {t("common.delete")}
                    </button>
                </div>
            )}
        </div>

    )
}