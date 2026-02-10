import { useTranslation } from "react-i18next";
import Modal from "@/components/ui/Modal";

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
                <div className="modal-actions">
                    <button
                        className="btn"
                        onClick={onCancel}
                    >
                        {cancelLabel ?? t("common.cancel")}
                    </button>

                    <button
                        className="btn btn-danger"
                        onClick={onConfirm}
                    >
                        {confirmLabel ?? t("common.confirm")}
                    </button>
                </div>
            }
        >
            {message}
        </Modal>
    );
}
