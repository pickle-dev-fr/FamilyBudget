import type { Transaction } from "@/api/transactions.api"
import Modal from "@/components/ui/Modal"
import { t } from "i18next"
import { useState } from "react"

export default function DeleteRecurringModal({
    onClose,
    onConfirm
}: {
    transaction: Transaction
    onClose: () => void
    onConfirm: (deleteFuture: boolean) => void
}) {

    const [deleteFuture, setDeleteFuture] = useState(false)

    return (
        <Modal
            open={true}
            onClose={onClose}
            title={t("recurring.delete.title")}
            footer={
                <>
                    <button
                        className="btn"
                        onClick={onClose}
                    >
                        {t("common.cancel")}
                    </button>

                    <button
                        className="btn btn-error"
                        onClick={() => onConfirm(deleteFuture)}
                    >
                        {t("common.confirm")}
                    </button>
                </>
            }
        >
            <div className="flex flex-col gap-4">

                <p>
                    {t("recurring.delete.confirm")}
                </p>

                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        className="checkbox"
                        checked={deleteFuture}
                        onChange={(e) =>
                            setDeleteFuture(e.target.checked)
                        }
                    />
                    <span>
                        {t("recurring.delete.also_future")}
                    </span>
                </label>

            </div>
        </Modal>
    )
}