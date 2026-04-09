export type ToastType = "success" | "error" | "warning" | "info";

export type ToastItem = {
    id: number;
    message: string;
    type: ToastType;
};

type ToastFn = (message: string, type: ToastType) => void;

let _dispatch: ToastFn | null = null;
let _counter = 0;

export function registerToastDispatch(fn: ToastFn) {
    _dispatch = fn;
}

function push(message: string, type: ToastType) {
    _dispatch?.(message, type);
}

export const toast = {
    success: (message: string) => push(message, "success"),
    error:   (message: string) => push(message, "error"),
    warning: (message: string) => push(message, "warning"),
    info:    (message: string) => push(message, "info"),
};

export function nextId() {
    return ++_counter;
}
