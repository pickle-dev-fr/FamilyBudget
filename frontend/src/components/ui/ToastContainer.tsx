import { useEffect, useState } from "react";
import { registerToastDispatch, nextId, type ToastItem, type ToastType } from "@/lib/toast";

const DURATION = 4000;
const EXIT_DURATION = 300;

const alertClass: Record<string, string> = {
    success: "alert-success",
    error:   "alert-error",
    warning: "alert-warning",
    info:    "alert-info",
};

type ToastItemWithState = ToastItem & { leaving: boolean };

export default function ToastContainer() {
    const [toasts, setToasts] = useState<ToastItemWithState[]>([]);

    useEffect(() => {
        registerToastDispatch((message: string, type: ToastType) => {
            const id = nextId();
            setToasts(prev => [...prev, { id, message, type, leaving: false }]);
            setTimeout(() => startLeaving(id), DURATION);
        });
    }, []);

    function startLeaving(id: number) {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, EXIT_DURATION);
    }

    function dismiss(id: number) {
        startLeaving(id);
    }

    if (toasts.length === 0) return null;

    return (
        <>
            <style>{`
                @keyframes toast-in {
                    from { transform: translateX(110%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
                @keyframes toast-out {
                    from { transform: translateX(0);    opacity: 1; }
                    to   { transform: translateX(110%); opacity: 0; }
                }
                .toast-enter { animation: toast-in  ${EXIT_DURATION}ms ease-out forwards; }
                .toast-leave { animation: toast-out ${EXIT_DURATION}ms ease-in  forwards; }
            `}</style>

            <div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2 w-80">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        role="alert"
                        className={`alert ${alertClass[t.type]} shadow-lg flex items-start gap-2 ${t.leaving ? "toast-leave" : "toast-enter"}`}
                    >
                        <span className="flex-1 text-sm">{t.message}</span>
                        <button
                            className="btn btn-ghost btn-xs shrink-0"
                            onClick={() => dismiss(t.id)}
                            aria-label="Fermer"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </>
    );
}
