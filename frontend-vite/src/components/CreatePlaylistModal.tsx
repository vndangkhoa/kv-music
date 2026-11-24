import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useModalDialog } from '../hooks/useModalDialog';

interface CreatePlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, description?: string) => Promise<void> | void;
    mode?: 'create' | 'edit';
    initialTitle?: string;
    initialDescription?: string;
}

export default function CreatePlaylistModal({
    isOpen,
    onClose,
    onCreate,
    mode = 'create',
    initialTitle = '',
    initialDescription = '',
}: CreatePlaylistModalProps) {
    const [name, setName] = useState(initialTitle);
    const [description, setDescription] = useState(initialDescription);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const titleId = useId();
    const titleInputId = useId();
    const descInputId = useId();

    useModalDialog(dialogRef, isOpen, onClose);

    useEffect(() => {
        if (isOpen) {
            setName(initialTitle);
            setDescription(initialDescription);
            setError(null);
            setSubmitting(false);
            requestAnimationFrame(() => titleInputRef.current?.focus());
        }
    }, [isOpen, initialTitle, initialDescription]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed || submitting) return;

        setSubmitting(true);
        setError(null);
        try {
            await onCreate(trimmed, description.trim() || undefined);
            setName('');
            setDescription('');
            dialogRef.current?.close('submitted');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save playlist');
        } finally {
            setSubmitting(false);
        }
    };

    const heading = mode === 'edit' ? 'Edit playlist' : 'New playlist';
    const submitLabel = submitting
        ? (mode === 'edit' ? 'Saving…' : 'Creating…')
        : (mode === 'edit' ? 'Save' : 'Create');

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            {...({ closedby: 'any' } as any)}
            className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[12px] bg-[#212121] border border-white/10 text-white p-0 shadow-2xl"
        >
            <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                    <h1 id={titleId} className="text-lg font-bold tracking-tight text-white">
                        {heading}
                    </h1>
                    <button
                        type="button"
                        onClick={() => dialogRef.current?.close()}
                        aria-label="Close dialog"
                        className="w-8 h-8 rounded-full text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor={titleInputId} className="block text-xs font-medium text-white/70 mb-1.5">
                            Title
                        </label>
                        <input
                            id={titleInputId}
                            ref={titleInputRef}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Give your playlist a title"
                            maxLength={100}
                            className="w-full h-11 px-3.5 bg-[#030303] border border-white/15 rounded-[8px] text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/50"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label htmlFor={descInputId} className="block text-xs font-medium text-white/70 mb-1.5">
                            Description
                        </label>
                        <input
                            id={descInputId}
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description"
                            maxLength={240}
                            className="w-full h-11 px-3.5 bg-[#030303] border border-white/15 rounded-[8px] text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/50"
                        />
                    </div>

                    {error && (
                        <p className="text-xs text-[#ff4e45]" role="alert">
                            {error}
                        </p>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => dialogRef.current?.close()}
                            className="h-9 px-4 rounded-full text-sm font-medium text-white/75 hover:text-white hover:bg-white/10 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || submitting}
                            className="h-9 px-5 rounded-full bg-white text-[#030303] text-sm font-medium hover:bg-white/90 disabled:opacity-40 disabled:pointer-events-none transition"
                        >
                            {submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </dialog>
    );
}
