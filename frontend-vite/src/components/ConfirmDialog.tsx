import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useModalDialog } from '../hooks/useModalDialog';

export interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    busy?: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
}

export default function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    destructive = true,
    busy = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const cancelBtnRef = useRef<HTMLButtonElement>(null);
    const titleId = useId();
    const descId = useId();

    useModalDialog(dialogRef, isOpen, onCancel);

    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => cancelBtnRef.current?.focus());
        }
    }, [isOpen]);

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            aria-describedby={descId}
            {...({ closedby: 'any' } as any)}
            className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-[12px] bg-[#212121] border border-white/10 text-white p-0 shadow-2xl"
        >
            <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <h1 id={titleId} className="text-lg font-bold text-white leading-snug">
                        {title}
                    </h1>
                    <button
                        type="button"
                        onClick={() => dialogRef.current?.close()}
                        aria-label="Close dialog"
                        className="w-8 h-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center flex-shrink-0 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <p id={descId} className="text-sm text-white/75 leading-relaxed">
                    {message}
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                        ref={cancelBtnRef}
                        type="button"
                        autoFocus
                        disabled={busy}
                        onClick={() => dialogRef.current?.close()}
                        className="h-9 px-4 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition disabled:opacity-40"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                            void onConfirm();
                        }}
                        className={`h-9 px-5 rounded-full text-sm font-medium transition disabled:opacity-40 ${
                            destructive
                                ? 'bg-[#ff4e45] hover:bg-[#ff665e] text-white'
                                : 'bg-white text-[#030303] hover:bg-white/90'
                        }`}
                    >
                        {busy ? 'Working…' : confirmLabel}
                    </button>
                </div>
            </div>
        </dialog>
    );
}
