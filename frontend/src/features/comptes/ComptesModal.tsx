import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Modal from "@/components/ui/Modal";
export type CompteFormData = {
  name: string;
  startDay: number;
  initialValue: number;
};


type ComptesModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CompteFormData) => void;
  defaultValues?: CompteFormData;
};

export default function ComptesModal({
  open,
  onClose,
  onSubmit,
  defaultValues,
}: ComptesModalProps) {
  const { t } = useTranslation();

  const [startDay, setStartDay] = useState(1);
  const [initialValue, setInitialValue] = useState(0);
  const [name, setName] = useState("");


  useEffect(() => {
  if (defaultValues) {
    setName(defaultValues.name);
    setStartDay(defaultValues.startDay);
    setInitialValue(defaultValues.initialValue);
  }
}, [defaultValues, open]);


  function handleSubmit() {
    onSubmit({
      name,
      startDay,
      initialValue,
    });
  }

  return (
    <Modal
      open={open}
      title={t("accounts.edit")}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button onClick={handleSubmit}>
            {t("common.save")}
          </button>
        </>
      }
    >
      <div>
        <div className="label">
          {t("accounts.name")}
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <div className="label">
          {t("accounts.start_day")}
        </div>
        <input
          type="number"
          min={1}
          max={31}
          value={startDay}
          onChange={(e) => setStartDay(Number(e.target.value))}
        />
      </div>

      <div>
        <div className="label">
          {t("accounts.initial_value")}
        </div>
        <input
          type="number"
          value={initialValue}
          onChange={(e) => setInitialValue(Number(e.target.value))}
        />
      </div>
    </Modal>
  );
}
