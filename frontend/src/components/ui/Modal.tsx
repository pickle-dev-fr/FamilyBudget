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
            className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-base-100 p-6 rounded-lg shadow-lg max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
            >
                {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}

                <div className="mb-4">
                    {children}
                </div>

                {footer && <div className="flex justify-end gap-2">{footer}</div>}
            </div>
        </div>

	);
}
