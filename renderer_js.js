function getColorJS(iteration, maxIterations, zx, zy) { // zxとzyを引数に追加
    if (iteration === maxIterations) return [0, 0, 0];

    // 正規化された反復回数を計算
    const log_zn = Math.log(zx * zx + zy * zy) / 2;
    const nu = Math.log(log_zn / Math.log(2)) / Math.log(2);
    const smoothIteration = iteration + 1 - nu;
    
    // smoothIterationを元に色を決定（例：HSVカラーモデル）
    const hue = (360 * smoothIteration / maxIterations) % 360;
    const saturation = 0.8;
    const value = 0.9;

    // HSVからRGBへの変換ロジック (変更なし)
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

function renderMandelbrotJS(ctx, width, height, centerX, centerY, scale, maxIterations) {
    const imageData = ctx.createImageData(width, height);
    const pixels = imageData.data;
    const aspect = width / height;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cx = centerX + (x / width - 0.5) * scale * aspect;
            const cy = centerY + (y / height - 0.5) * scale;
            let zx = 0.0, zy = 0.0, iteration = 0;
            while (zx * zx + zy * zy <= 16.0 && iteration < maxIterations) {
                const temp_zx = zx * zx - zy * zy + cx;
                zy = 2.0 * zx * zy + cy;
                zx = temp_zx;
                iteration++;
            }
            
            // zxとzyをgetColorJSに渡す
            const color = getColorJS(iteration, maxIterations, zx, zy);
            const index = (y * width + x) * 4;
            pixels.set(color, index);
            pixels[index + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

// レンダラーオブジェクトを返す（Wasm版とインターフェースを合わせる）
export async function initialize() {
    return {
        render: renderMandelbrotJS
    };
}
