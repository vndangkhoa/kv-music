import { useState, useEffect } from 'react';

export function useDominantColor(imageUrl?: string) {
    const [color, setColor] = useState<string>('#121212'); // Default to dark grey

    useEffect(() => {
        if (!imageUrl) return;

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            canvas.width = 1;
            canvas.height = 1;

            // Draw image to 1x1 canvas to get average color
            ctx.drawImage(img, 0, 0, 1, 1);

            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            setColor(`rgb(${r}, ${g}, ${b})`);
        };

        img.onerror = () => {
            // Fallback or keep previous
        };

    }, [imageUrl]);

    return color;
}
