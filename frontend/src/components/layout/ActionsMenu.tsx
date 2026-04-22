import { useClickOutside } from "@/utils";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

type ActionsMenuProps = {
    onDelete: () => void;
    onEdit?: () => void;
};

export function ActionsMenu({ onDelete, onEdit }: ActionsMenuProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useClickOutside(containerRef, () => setOpen(false));

    function handleToggle() {
        if (!open && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
            setOpenUpward(rect.bottom + 120 > viewportHeight);
        }
        setOpen(prev => !prev);
    }

    return (
        <div ref={containerRef} className="relative inline-block">
            <button
                className="btn btn-ghost btn-xs btn-square text-base-content/40 hover:text-base-content"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleToggle}
            >
                <MoreHorizontal size={16} />
            </button>

            {open && (
                <div className={`absolute right-0 w-38 bg-base-100 border border-base-300 rounded-xl shadow-xl z-20 py-1 overflow-hidden
                    ${openUpward ? "bottom-full mb-1" : "mt-1"}`}
                >
                    {onEdit && (
                        <button
                            className="flex items-center gap-2.5 w-full text-left text-sm px-3 py-2 hover:bg-base-200 transition-colors"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => { onEdit(); setOpen(false); }}
                        >
                            <Pencil size={14} className="text-base-content/50" />
                            {t("common.edit")}
                        </button>
                    )}
                    <button
                        className="flex items-center gap-2.5 w-full text-left text-sm px-3 py-2 hover:bg-error/10 text-error/80 hover:text-error transition-colors"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => { onDelete(); setOpen(false); }}
                    >
                        <Trash2 size={14} />
                        {t("common.delete")}
                    </button>
                </div>
            )}
        </div>
    );
}
