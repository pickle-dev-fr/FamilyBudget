import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

type ActionsMenuProps = {
    onDelete: () => void;
    onEdit?: () => void;
};

type DropdownPos = { top: number; right: number; openUpward: boolean };

export function ActionsMenu({ onDelete, onEdit }: ActionsMenuProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<DropdownPos>({ top: 0, right: 0, openUpward: false });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    function handleToggle() {
        if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const openUpward = rect.bottom + 120 > window.innerHeight;
            setPos({
                top: openUpward ? rect.top : rect.bottom + 4,
                right: window.innerWidth - rect.right,
                openUpward,
            });
        }
        setOpen(prev => !prev);
    }

    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        const onPointerDown = (e: PointerEvent) => {
            if (
                !dropdownRef.current?.contains(e.target as Node) &&
                !buttonRef.current?.contains(e.target as Node)
            ) close();
        };
        document.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
        };
    }, [open]);

    const dropdown = open && createPortal(
        <div
            ref={dropdownRef}
            style={{
                position: "fixed",
                right: pos.right,
                ...(pos.openUpward ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
            }}
            className="w-38 bg-base-100 border border-base-300 rounded-xl shadow-xl z-[200] py-1 overflow-hidden"
            onPointerDown={(e) => e.stopPropagation()}
        >
            {onEdit && (
                <button
                    className="flex items-center gap-2.5 w-full text-left text-sm px-3 py-2 hover:bg-base-200 transition-colors"
                    onClick={() => { onEdit(); setOpen(false); }}
                >
                    <Pencil size={14} className="text-base-content/50" />
                    {t("common.edit")}
                </button>
            )}
            <button
                className="flex items-center gap-2.5 w-full text-left text-sm px-3 py-2 hover:bg-error/10 text-error/80 hover:text-error transition-colors"
                onClick={() => { onDelete(); setOpen(false); }}
            >
                <Trash2 size={14} />
                {t("common.delete")}
            </button>
        </div>,
        document.body
    );

    return (
        <div className="relative inline-block">
            <button
                ref={buttonRef}
                className="btn btn-ghost btn-xs btn-square text-base-content/40 hover:text-base-content"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); handleToggle(); }}
            >
                <MoreHorizontal size={16} />
            </button>
            {dropdown}
        </div>
    );
}
