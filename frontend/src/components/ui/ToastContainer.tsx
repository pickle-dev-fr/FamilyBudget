import { useEffect, useState } from "react";
import { registerToastDispatch, nextId, type ToastItem, type ToastType } from "@/lib/toast";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

const DURATION = 4000;
const EXIT_DURATION = 300;

const toastConfig: Record<ToastType, { icon: React.ReactNode; class: string }> = {
    success: { icon: <CheckCircle size={16} />, class: "border-success/30 bg-success/10 text-success" },
    error:   { icon: <XCircle size={16} />,     class: "border-error/30 bg-error/10 text-error" },
    warning: { icon: <AlertTriangle size={16} />,class: "border-warning/30 bg-warning/10 text-warning" },
    info:    { icon: <Info size={16} />,         class: "border-info/30 bg-info/10 text-info" },
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
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), EXIT_DURATION);
    }

    if (toasts.length === 0) return null;

    return (
        <>
            <style>{`
                @keyframes toast-in  { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes toast-out { from { transform: translateX(0); opacity: 1; } to { transform: translateX(110%); opacity: 0; } }
                .toast-enter { animation: toast-in  ${EXIT_DURATION}ms cubic-bezier(0.16,1,0.3,1) forwards; }
                .toast-leave { animation: toast-out ${EXIT_DURATION}ms ease-in forwards; }
            `}</style>

            <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-xs w-full">
                {toasts.map(t => {
                    const cfg = toastConfig[t.type];
                    return (
                        <div
                            key={t.id}
                            role="alert"
                            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg bg-base-100
                                ${cfg.class} ${t.leaving ? "toast-leave" : "toast-enter"}`}
                        >
                            <span className="shrink-0 mt-0.5">{cfg.icon}</span>
                            <span className="flex-1 text-sm font-medium text-base-content">{t.message}</span>
                            <button
                                className="shrink-0 text-base-content/30 hover:text-base-content transition-colors"
                                onClick={() => startLeaving(t.id)}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
