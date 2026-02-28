import Modal from "@/components/ui/Modal";
import { useTranslation } from "react-i18next";

type ConfirmModalProps = {
    open: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmModal({
    open,
    title,
    message,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel
}: ConfirmModalProps) {
    const { t } = useTranslation();

    return (
        <Modal
            open={open}
            title={title}
            onClose={onCancel}
            footer={
                <div className="flex justify-end gap-2 mt-4">
                    <button
                        className="btn btn-ghost"
                        onClick={onCancel}
                    >
                        {cancelLabel ?? t("common.cancel")}
                    </button>

                    <button
                        className="btn btn-error"
                        onClick={onConfirm}
                    >
                        {confirmLabel ?? t("common.confirm")}
                    </button>
                </div>
            }
        >
            <div className="py-2 text-text">
                {message}
            </div>
        </Modal>


    );
}
