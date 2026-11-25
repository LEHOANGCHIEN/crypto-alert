/** `BTCUSDT-1h-20261126-1405.png` */
export const screenshotName = (symbol: string, interval: string, stamp: string): string => `${symbol}-${interval}-${stamp}.png`;

/** Downloads a canvas as a PNG file through a temporary link. */
export function downloadCanvas(canvas: HTMLCanvasElement, fileName: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
