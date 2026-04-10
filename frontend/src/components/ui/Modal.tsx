import { type ReactNode } from "react";

type ModalProps = {
	open: boolean;
	title?: string;
	onClose: () => void;
	children: ReactNode;
	footer?: ReactNode;
};

export default function Modal({
	open,
	title,
	onClose,
	children,
	footer,
}: ModalProps) {
	if (!open) return null;

	return (
        <div
            className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-base-100 rounded-lg shadow-lg max-w-md w-full flex flex-col max-h-full"
                onClick={(e) => e.stopPropagation()}
            >
                {title && <h2 className="text-lg font-semibold p-6 pb-0 shrink-0">{title}</h2>}

                <div className="overflow-y-auto p-6 flex-1">
                    {children}
                </div>

                {footer && (
                    <div className="flex flex-wrap justify-end gap-2 p-6 pt-0 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>

	);
}
