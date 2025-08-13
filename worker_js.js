// js_worker.js (更新版 - 境界追跡法)

// --- グローバル変数 ---
let width, height, centerX, centerY, scale, maxIterations, bailoutSq;
let pixels, aspect;
const colorCache = new Map(); // 計算結果をキャッシュ

// --- メイン処理 ---
self.onmessage = (e) => {
    const params = e.data;
    // パラメータをグローバル変数に設定
    ({ width, height, centerX, centerY, scale, maxIterations } = params);
    bailoutSq = params.bailoutRadius * params.bailoutRadius;
    aspect = width / height;
    pixels = new Uint8ClampedArray(width * height * 4);
    colorCache.clear();

    const startTime = performance.now();
    
    // 境界追跡を開始
    trace(0, 0, width - 1, height - 1, 0);

    const endTime = performance.now();
    const imageData = new ImageData(pixels, width, height);
    
    self.postMessage({
        imageData: imageData,
        time: endTime - startTime
    }, [imageData.data.buffer]);
};

// --- 境界追跡（再帰関数）---
const MIN_DEPTH = 6; // この深さまでは強制的に分割 (新しいチェックが賢いので少し浅くても良い)
const GRADIENT_THRESHOLD = 2; // 発散回数がこの値以下の差なら滑らかとみなす

function trace(x1, y1, x2, y2, depth) {
    const c1 = getPixelColor(x1, y1);
    const c2 = getPixelColor(x2, y1);
    const c3 = getPixelColor(x1, y2);
    const c4 = getPixelColor(x2, y2);

    // ▼▼▼ 判断ロジックを刷新 ▼▼▼
    let shouldFill = false;
    if (depth >= MIN_DEPTH) {
        const c_min = Math.min(c1, c2, c3, c4);
        // 条件1: 四隅すべてが集合内部
        if (c_min === maxIterations) {
            shouldFill = true;
        }
        // 条件2: 四隅すべてが外部、かつ色の差が小さい
        else {
            const c_max = Math.max(c1, c2, c3, c4);
            if (c_max < maxIterations && (c_max - c_min) <= GRADIENT_THRESHOLD) {
                shouldFill = true;
            }
        }
    }

    if (shouldFill) {
        // グラデーション領域を塗る際は、四隅の平均色を使うとより滑らかになる
        const avgIteration = Math.round((c1 + c2 + c3 + c4) / 4);
        const color = getColorComponents(avgIteration);
        fillRect(x1, y1, x2, y2, color);
    }
    // 分割条件
    else if ((x2 - x1) > 0 || (y2 - y1) > 0) {
        const midX = Math.floor((x1 + x2) / 2);
        const midY = Math.floor((y1 + y2) / 2);
        const nextDepth = depth + 1;
        trace(x1, y1, midX, midY, nextDepth);
        trace(midX + 1, y1, x2, midY, nextDepth);
        trace(x1, midY + 1, midX, y2, nextDepth);
        trace(midX + 1, midY + 1, x2, y2, nextDepth);
    }
    // 1ピクセルになった場合の最終描画
    else {
         const color = getColorComponents(c1);
         fillRect(x1, y1, x2, y2, color);
    }
    // ▲▲▲ ここまで ▲▲▲
}

// --- ヘルパー関数群 ---

// 指定したピクセルの色(Iteration値)を計算
function getPixelColor(x, y) {
    const key = `${x},${y}`;
    if (colorCache.has(key)) {
        return colorCache.get(key);
    }

    const cx = centerX + (x / width - 0.5) * scale * aspect;
    const cy = centerY + (y / height - 0.5) * scale;
    
    let iteration = 0;
    
    // 高速化チェック
    const q = (cx - 0.25) * (cx - 0.25) + cy * cy;
    if ((cx + 1) * (cx + 1) + cy * cy < 0.0625 || q * (q + (cx - 0.25)) < 0.25 * cy * cy) {
        iteration = maxIterations;
    } else {
        let zx = 0.0, zy = 0.0;
        while (zx * zx + zy * zy <= bailoutSq && iteration < maxIterations) {
            const temp_zx = zx * zx - zy * zy + cx;
            zy = 2.0 * zx * zy + cy;
            zx = temp_zx;
            iteration++;
        }
    }
    
    colorCache.set(key, iteration);
    return iteration;
}

// ピクセルデータ配列に四角形を描画
function fillRect(x1, y1, x2, y2, color) {
    for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
            const index = (y * width + x) * 4;
            pixels[index] = color[0];
            pixels[index + 1] = color[1];
            pixels[index + 2] = color[2];
            pixels[index + 3] = 255;
        }
    }
}

// Iteration値からRGBコンポーネントを取得
function getColorComponents(iteration) {
    if (iteration === maxIterations) return [0, 0, 0];
    const hue = (360 * iteration / maxIterations) % 360;
    const saturation = 0.8, value = 0.9;
    const c = value * saturation;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = value - c;
    let r_prime, g_prime, b_prime;
    if (hue < 60) { [r_prime, g_prime, b_prime] = [c, x, 0]; }
    else if (hue < 120) { [r_prime, g_prime, b_prime] = [x, c, 0]; }
    else if (hue < 180) { [r_prime, g_prime, b_prime] = [0, c, x]; }
    else if (hue < 240) { [r_prime, g_prime, b_prime] = [0, x, c]; }
    else if (hue < 300) { [r_prime, g_prime, b_prime] = [x, 0, c]; }
    else { [r_prime, g_prime, b_prime] = [c, 0, x]; }
    return [(r_prime + m) * 255, (g_prime + m) * 255, (b_prime + m) * 255];
}
