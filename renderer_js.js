// 1. 基準軌道計算
function calculateReferencesJS(centerRealStr, centerImagStr, maxIters) {
    Decimal.set({ precision: 100 }); // 精度を設定
    const c = {
        re: new Decimal(centerRealStr),
        im: new Decimal(centerImagStr),
    };
    let z = { re: new Decimal(0), im: new Decimal(0) };
    const bailout = new Decimal(100);
    const orbit = [];

    for (let i = 0; i < maxIters; i++) {
        orbit.push(z.re.toNumber(), z.im.toNumber());
        if (z.re.times(z.re).plus(z.im.times(z.im)).greaterThan(bailout)) {
            break;
        }
        const temp_re = z.re.times(z.re).minus(z.im.times(z.im)).plus(c.re);
        z.im = z.re.times(z.im).times(2).plus(c.im);
        z.re = temp_re;
    }
    return orbit;
}

function getColorJS(iteration, maxIters, radiusSq) {
    if (iteration === maxIters) return [0, 0, 0];

    // 正規化された反復回数を計算
    const log_zn = Math.log(radiusSq) / 2;
    const nu = Math.log(log_zn / Math.log(2)) / Math.log(2);
    const smoothIteration = iteration + 1 - nu;
    
    // smoothIterationを元に色を決定（例：HSVカラーモデル）
    const hue = (360 * smoothIteration / maxIters) % 360;
    const saturation = 0.8;
    const value = 0.9;

    // HSVからRGBへの変換ロジック
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

// 2. 摂動描画
function renderMandelbrotJS(ctx, width, height, scale, maxIters, referenceOrbit) {
    const imageData = ctx.createImageData(width, height);
    const pixels = imageData.data;
    const aspect = width / height;
    const bailout = 100.0;
    const maxRefIter = referenceOrbit.length / 2;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dc_re = (x / width - 0.5) * scale * aspect;
            const dc_im = (y / height - 0.5) * scale;

            let dz_re = 0.0, dz_im = 0.0;
            let iter = 0, ref_iter = 0;
            let color = [0, 0, 0];

            while (iter < maxIters) {
                let ref_re = referenceOrbit[ref_iter * 2];
                let ref_im = referenceOrbit[ref_iter * 2 + 1];
                const z_re = ref_re + dz_re;
                const z_im = ref_im + dz_im;
                const r_sq = z_re * z_re + z_im + z_im;
                if (r_sq > bailout) {
                    color = getColorJS(iter, maxIters, r_sq);
                    break;
                }

                // Rebasing
                const dr_sq = dz_re * dz_re + dz_im * dz_im;
                if (r_sq < dr_sq || ref_iter == maxRefIter - 1) {
                    dz_re = z_re;
                    dz_im = z_im;
                    ref_iter = 0;
                    ref_re = referenceOrbit[0];
                    ref_im = referenceOrbit[1];
                }

                const next_dz_re = 2 * (ref_re * dz_re - ref_im * dz_im) + (dz_re * dz_re - dz_im * dz_im) + dc_re;
                dz_im = 2 * (ref_re * dz_im + ref_im * dz_re) + 2 * dz_re * dz_im + dc_im;
                dz_re = next_dz_re;

                iter++;
                ref_iter++;
            }
            
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
        calculate_references: calculateReferencesJS,
        render_perturbation: renderMandelbrotJS
    };
}
