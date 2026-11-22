import { RefObject, useEffect } from 'react';

/**
 * Syncs a React `isOpen` prop with a native `<dialog>` element via `showModal()` / `close()`,
 * resets `dialog.returnValue` on close, and adds the pointer-position light-dismiss fallback
 * when `closedby="any"` is not yet supported natively (e.g. Safari).
 */
export function useModalDialog(
    dialogRef: RefObject<HTMLDialogElement | null>,
    isOpen: boolean,
    onClose: () => void,
) {
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen) {
            if (!dialog.open) {
                dialog.showModal();
            }
        } else if (dialog.open) {
            dialog.close();
        }
    }, [dialogRef, isOpen]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const handleClose = () => {
            dialog.returnValue = '';
            onClose();
        };

        dialog.addEventListener('close', handleClose);

        if ('closedBy' in HTMLDialogElement.prototype) {
            return () => {
                dialog.removeEventListener('close', handleClose);
            };
        }

        const outside = (e: PointerEvent) => {
            const r = dialog.getBoundingClientRect();
            return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
        };

        let pressedOutside = false;
        const onPointerDown = (e: PointerEvent) => {
            if (dialog.open) {
                pressedOutside = outside(e);
            }
        };
        const onPointerUp = (e: PointerEvent) => {
            if (dialog.open && pressedOutside && outside(e)) {
                pressedOutside = false;
                dialog.close();
            } else {
                pressedOutside = false;
            }
        };

        dialog.addEventListener('pointerdown', onPointerDown);
        dialog.addEventListener('pointerup', onPointerUp);

        return () => {
            dialog.removeEventListener('close', handleClose);
            dialog.removeEventListener('pointerdown', onPointerDown);
            dialog.removeEventListener('pointerup', onPointerUp);
        };
    }, [dialogRef, onClose]);
}
