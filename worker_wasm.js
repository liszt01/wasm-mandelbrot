// Wasmモジュールをインポート
// `renderer_wasm.js` を `pkg` フォルダからコピー＆リネームしたものを想定
import init, { render as renderWasm } from './pkg/mandelbrot_zoom.js';

// Wasmモジュールの初期化は非同期で行う
const wasmReady = init();

self.onmessage = async (e) => {
    // Wasmモジュールの初期化が完了するのを待つ
    await wasmReady;

    const params = e.data;
    const startTime = performance.now();
    // Wasmの計算関数を呼び出す
    const pixelData = renderWasm(
        params.width, params.height, params.centerX, params.centerY, 
        params.scale, params.maxIterations, params.bailoutRadius * params.bailoutRadius
    );
    const endTime = performance.now();

    // 結果のピクセルデータと所要時間をメインスレッドに送り返す
    // pixelDataのバッファを転送(transfer)する
    self.postMessage({
        pixelData: pixelData,
        time: endTime - startTime,
        width: params.width,
        height: params.height,
    }, [pixelData.buffer]);
};
