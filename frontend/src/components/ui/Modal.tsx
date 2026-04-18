import { type ReactNode } from "react";
import { X } from "lucide-react";

type ModalProps = {
    open: boolean;
    title?: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
};

export default function Modal({ open, title, onClose, children, footer }: ModalProps) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-base-100 border border-base-300 rounded-2xl shadow-2xl max-w-md w-full flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-base-300 shrink-0">
                        <h2 className="text-base font-semibold">{title}</h2>
                        <button
                            onClick={onClose}
                            className="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="overflow-y-auto px-6 py-5 flex-1">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex flex-wrap justify-end gap-2 px-6 pb-5 pt-3 border-t border-base-300 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
