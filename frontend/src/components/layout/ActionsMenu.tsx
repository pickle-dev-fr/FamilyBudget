import { useClickOutside } from "@/utils"
import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"

type ActionsMenuProps = {
    onDelete: () => void
    onEdit?: () => void
}

export function ActionsMenu({ onDelete, onEdit }: ActionsMenuProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false)
    const [openUpward, setOpenUpward] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useClickOutside(containerRef, () => setOpen(false))

    function handleToggle() {
        if (!open && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            setOpenUpward(rect.bottom + 120 > window.innerHeight)
        }
        setOpen(prev => !prev)
    }

    return (
        <div ref={containerRef} className="relative inline-block">
            <button
                className="btn btn-ghost btn-sm"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleToggle}
            >
                ⋯
            </button>

            {open && (
                <div className={`absolute right-0 w-40 bg-base-100 rounded-md shadow-lg z-20 flex flex-col ${openUpward ? "bottom-full mb-1" : "mt-1"}`}>
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
