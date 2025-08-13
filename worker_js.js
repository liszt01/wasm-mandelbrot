// 純粋な計算ロジック
function calculateMandelbrotJS(width, height, centerX, centerY, scale, maxIterations, bailoutSq) {
    const imageData = new ImageData(width, height);
    const pixels = imageData.data;
    const aspect = width / height;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cx = centerX + (x / width - 0.5) * scale * aspect;
            const cy = centerY + (y / height - 0.5) * scale;
            let zx = 0.0, zy = 0.0, iteration = 0;
            while (zx * zx + zy * zy <= bailoutSq && iteration < maxIterations) {
                const temp_zx = zx * zx - zy * zy + cx;
                zy = 2.0 * zx * zy + cy;
                zx = temp_zx;
                iteration++;
            }
            
            const color = getColor(iteration, maxIterations, zx, zy);
            const index = (y * width + x) * 4;
            pixels[index] = color[0];
            pixels[index + 1] = color[1];
            pixels[index + 2] = color[2];
            pixels[index + 3] = 255;
        }
    }
    return imageData;
}

// 発散速度に応じた滑らかな色付けを行う関数
function getColor(iteration, maxIterations, zx, zy) {
    if (iteration === maxIterations) return [0, 0, 0];

    const log_zn = Math.log(zx * zx + zy * zy) / 2;
    const nu = Math.log(log_zn / Math.log(2)) / Math.log(2);
    const smoothIteration = iteration + 1 - nu;
    
    const hue = (360 * smoothIteration / maxIterations) % 360;
    const saturation = 0.8;
    const value = 0.9;

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


// メインスレッドからのメッセージを受け取る
self.onmessage = (e) => {
    const params = e.data;
    const startTime = performance.now();
    const imageData = calculateMandelbrotJS(
        params.width, params.height, params.centerX, params.centerY, 
        params.scale, params.maxIterations, params.bailoutRadius * params.bailoutRadius
    );
    const endTime = performance.now();
    
    // 計算結果と所要時間をメインスレッドに送り返す
    // imageDataのバッファを転送(transfer)することで、コピーのオーバーヘッドをなくす
    self.postMessage({
        imageData: imageData,
        time: endTime - startTime
    }, [imageData.data.buffer]);
};
