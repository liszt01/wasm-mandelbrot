import init, { render as renderWasm } from './pkg/mandelbrot_zoom.js';

let wasmModule = null;

// Wasmモジュールを初期化し、レンダラーオブジェクトを返す
export async function initialize() {
    if (!wasmModule) {
        wasmModule = await init();
    }
    return {
        render: (ctx, width, height, centerX, centerY, scale, maxIterations, bailoutSq) => {
            const pixelData = renderWasm(width, height, centerX, centerY, scale, maxIterations, bailoutSq);
            const imageData = new ImageData(new Uint8ClampedArray(pixelData), width, height);
            ctx.putImageData(imageData, 0, 0);
        }
    };
}
