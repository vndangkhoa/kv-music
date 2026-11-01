import { create } from 'zustand';

interface ToastItem {
    id: number;
    message: string;
}

interface ToastState {
    toasts: ToastItem[];
    push: (message: string) => void;
    addToast: (message: string) => void;
    remove: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
    toasts: [],
    push: (message) => {
        const id = nextId++;
        set((s) => ({ toasts: [...s.toasts, { id, message }] }));
        setTimeout(() => {
            set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, 3500);
    },
    addToast: (message) => get().push(message),
    remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(message: string) {
    useToastStore.getState().push(message);
}
