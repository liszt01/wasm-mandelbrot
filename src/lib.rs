use wasm_bindgen::prelude::*;

// 複素数
struct Complex {
    real: f64,
    imag: f64,
}

fn get_color(iteration: u32, max_iterations: u32, z: &Complex) -> [u8; 3] { // zを引数に追加
    if iteration == max_iterations {
        return [0, 0, 0]; // 黒
    }

    // 正規化された反復回数を計算
    let log_zn = (z.real * z.real + z.imag * z.imag).ln() / 2.0;
    let nu = (log_zn / 2.0f64.ln()).ln() / 2.0f64.ln();
    let smooth_iteration = iteration as f64 + 1.0 - nu;

    // smooth_iterationを元に色を決定（例：HSVカラーモデル）
    let hue = (360.0 * smooth_iteration / max_iterations as f64) % 360.0;
    let saturation = 0.8;
    let value = 0.9;

    // HSVからRGBへの変換ロジック (変更なし)
    let c = value * saturation;
    let x = c * (1.0 - ((hue / 60.0) % 2.0 - 1.0).abs());
    let m = value - c;
    let (r_prime, g_prime, b_prime) = match (hue / 60.0).floor() as u32 {
        0 => (c, x, 0.0),
        1 => (x, c, 0.0),
        2 => (0.0, c, x),
        3 => (0.0, x, c),
        4 => (x, 0.0, c),
        _ => (c, 0.0, x),
    };
    [
        ((r_prime + m) * 255.0) as u8,
        ((g_prime + m) * 255.0) as u8,
        ((b_prime + m) * 255.0) as u8,
    ]
}

#[wasm_bindgen]
pub fn render(
    width: u32,
    height: u32,
    center_x: f64,
    center_y: f64,
    scale: f64,
    max_iterations: u32,
) -> Vec<u8> {
    let mut pixels = vec![0u8; (width * height * 4) as usize];
    let aspect_ratio = width as f64 / height as f64;

    for y_pixel in 0..height {
        for x_pixel in 0..width {
            let cx = center_x + scale * (x_pixel as f64 / width as f64 - 0.5) * aspect_ratio;
            let cy = center_y + scale * (y_pixel as f64 / height as f64 - 0.5);
            let c = Complex { real: cx, imag: cy };
            let mut z = Complex { real: 0.0, imag: 0.0 };
            let mut iteration = 0;
            
            // 脱出半径は16 (4の2乗) など、大きめに取るとより滑らかになる
            while z.real * z.real + z.imag * z.imag <= 16.0 && iteration < max_iterations {
                let temp_real = z.real * z.real - z.imag * z.imag + c.real;
                z.imag = 2.0 * z.real * z.imag + c.imag;
                z.real = temp_real;
                iteration += 1;
            }

            // zをget_colorに渡す
            let color = get_color(iteration, max_iterations, &z);
            let index = ((y_pixel * width + x_pixel) * 4) as usize;
            pixels[index] = color[0];
            pixels[index + 1] = color[1];
            pixels[index + 2] = color[2];
            pixels[index + 3] = 255;
        }
    }
    pixels
}
