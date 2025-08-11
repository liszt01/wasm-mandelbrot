use wasm_bindgen::prelude::*;
use bigdecimal::{BigDecimal, FromPrimitive};
use num_complex::Complex;
use std::str::FromStr;
use bigdecimal::ToPrimitive;
 
// 1. 高精度な基準軌道を計算する関数
#[wasm_bindgen]
pub fn calculate_references(
    center_real_str: &str,
    center_imag_str: &str,
    max_iters: u32,
) -> Vec<f64> {
    // BigDecimalで高精度計算
    let c_real = BigDecimal::from_str(center_real_str).unwrap();
    let c_imag = BigDecimal::from_str(center_imag_str).unwrap();
    let c = Complex::new(c_real, c_imag);
    let mut z = Complex::new(BigDecimal::from_i32(0).unwrap(), BigDecimal::from_i32(0).unwrap());
    
    let bailout_radius_sq = BigDecimal::from_i32(100).unwrap(); // 大きな脱出半径
    let mut orbit = Vec::new();

    for _ in 0..max_iters {
        // f64に変換して軌道を保存
        orbit.push(z.re.to_f64().unwrap());
        orbit.push(z.im.to_f64().unwrap());

        if z.re.clone() * z.re.clone() + z.im.clone() * z.im.clone() > bailout_radius_sq {
            break;
        }
        z = z.clone() * z.clone() + c.clone();
    }
    orbit
}

fn get_color(iteration: u32, max_iters: u32, radius_sq: f64) -> [u8; 3] {
    if iteration >= max_iters {
        return [0, 0, 0]; // 黒
    }

    // 正規化された反復回数を計算
    let log_zn = (radius_sq).ln() / 2.0;
    let nu = (log_zn / 2.0f64.ln()).ln() / 2.0f64.ln();
    let smooth_iteration = iteration as f64 + 1.0 - nu;

    // smooth_iterationを元に色を決定（例：HSVカラーモデル）
    let hue = (360.0 * smooth_iteration / max_iters as f64) % 360.0;
    let saturation = 0.8;
    let value = 0.9;

    // HSVからRGBへの変換ロジック
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

// 2. 摂動論を使った描画関数
#[wasm_bindgen]
pub fn render(
    width: u32,
    height: u32,
    scale: f64,
    max_iters: u32,
    reference_orbit: &[f64],
) -> Vec<u8> {
    let mut pixels = vec![0u8; (width * height * 4) as usize];
    let max_ref_iter = reference_orbit.len() / 2;
    let aspect = width as f64 / height as f64;
    let bailout_radius_sq = 100.0;

    for y_pixel in 0..height {
        for x_pixel in 0..width {
            let dc_real = (x_pixel as f64 / width as f64 - 0.5) * scale * aspect;
            let dc_imag = (y_pixel as f64 / height as f64 - 0.5) * scale;
            let dc = Complex::new(dc_real, dc_imag);

            let mut dz = Complex::new(0.0, 0.0);
            let mut iteration: u32 = 0;
            let mut ref_iter: usize = 0;

            let mut color = [0u8, 0u8, 0u8];
            
            while iteration < max_iters {
                let mut ref_z = Complex::new(reference_orbit[ref_iter * 2], reference_orbit[ref_iter * 2 + 1]);
                let z = ref_z + dz;

                let radius_sq = z.norm_sqr();
                if radius_sq > bailout_radius_sq {
                    color = get_color(iteration, max_iters, radius_sq);
                    break;
                }

                // Rebasing
                let dradius_sq = dz.norm_sqr();
                let ref_z_sq = ref_z.norm_sqr();
                if dradius_sq > ref_z_sq || ref_iter >= max_ref_iter - 1 {
                    dz = z;
                    ref_iter = 0;
                    // ref_z = Complex::new(reference_orbit[0], reference_orbit[1]);
                }

                dz = 2.0 * ref_z * dz + dz * dz + dc;

                iteration += 1;
                ref_iter += 1;
            }
            
            let index = ((y_pixel * width + x_pixel) * 4) as usize;
            pixels[index..index+3].copy_from_slice(&color);
            pixels[index + 3] = 255;
        }
    }
    pixels
}
