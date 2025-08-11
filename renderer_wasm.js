import init, { calculate_references as calculateReferencesWasm, render as renderWasm } from './pkg/mandelbrot_zoom.js';

let wasmModule = null;

// Wasmモジュールを初期化し、レンダラーオブジェクトを返す
export async function initialize() {
    if (!wasmModule) {
        wasmModule = await init();
    }
    return {
        calculate_references: calculateReferencesWasm,
        render_perturbation: (ctx, width, height, scale, maxIters, referenceOrbit) => {
            const pixelData = renderWasm(width, height, scale, maxIters, referenceOrbit);
            const imageData = new ImageData(new Uint8ClampedArray(pixelData), width, height);
            ctx.putImageData(imageData, 0, 0);
        }
    };
}
