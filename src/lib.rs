// src/lib.rs (更新版 - 境界追跡法)
use wasm_bindgen::prelude::*;
use std::collections::HashMap;

#[wasm_bindgen]
pub fn render(
    width: u32,
    height: u32,
    center_x: f64,
    center_y: f64,
    scale: f64,
    max_iterations: u32,
    bailout_sq: f64,
) -> Vec<u8> {
    let mut renderer = BoundaryTracer::new(width, height, center_x, center_y, scale, max_iterations, bailout_sq);
    renderer.render()
}

struct BoundaryTracer {
    width: u32,
    height: u32,
    center_x: f64,
    center_y: f64,
    scale: f64,
    max_iterations: u32,
    bailout_sq: f64,
    aspect: f64,
    pixels: Vec<u8>,
    color_cache: HashMap<(u32, u32), u32>,
}

impl BoundaryTracer {
    fn new(width: u32, height: u32, center_x: f64, center_y: f64, scale: f64, max_iterations: u32, bailout_sq: f64) -> Self {
        BoundaryTracer {
            width,
            height,
            center_x,
            center_y,
            scale,
            max_iterations,
            bailout_sq,
            aspect: width as f64 / height as f64,
            pixels: vec![0; (width * height * 4) as usize],
            color_cache: HashMap::new(),
        }
    }

    fn render(&mut self) -> Vec<u8> {
        let mut rect_stack = vec![(0, 0, self.width - 1, self.height - 1)];

        while let Some((x1, y1, x2, y2)) = rect_stack.pop() {
            let c1 = self.get_pixel_color(x1, y1);
            let c2 = self.get_pixel_color(x2, y1);
            let c3 = self.get_pixel_color(x1, y2);
            let c4 = self.get_pixel_color(x2, y2);

            if c1 == c2 && c1 == c3 && c1 == c4 {
                let color = self.get_color_components(c1);
                self.fill_rect(x1, y1, x2, y2, color);
            } else if x2 > x1 || y2 > y1 {
                let mid_x = x1 + (x2 - x1) / 2;
                let mid_y = y1 + (y2 - y1) / 2;
                
                rect_stack.push((x1, y1, mid_x, mid_y));
                if mid_x < x2 { rect_stack.push((mid_x + 1, y1, x2, mid_y)); }
                if mid_y < y2 { rect_stack.push((x1, mid_y + 1, mid_x, y2)); }
                if mid_x < x2 && mid_y < y2 { rect_stack.push((mid_x + 1, mid_y + 1, x2, y2)); }
            }
        }
        self.pixels.clone()
    }

    fn get_pixel_color(&mut self, x: u32, y: u32) -> u32 {
        if let Some(&iteration) = self.color_cache.get(&(x, y)) {
            return iteration;
        }

        let cx = self.center_x + (x as f64 / self.width as f64 - 0.5) * self.scale * self.aspect;
        let cy = self.center_y + (y as f64 / self.height as f64 - 0.5) * self.scale;
        
        let mut iteration = 0;
        let q = (cx - 0.25).powi(2) + cy.powi(2);

        if (cx + 1.0).powi(2) + cy.powi(2) < 0.0625 || q * (q + (cx - 0.25)) < 0.25 * cy.powi(2) {
            iteration = self.max_iterations;
        } else {
            let mut zx = 0.0; let mut zy = 0.0;
            while zx * zx + zy * zy <= self.bailout_sq && iteration < self.max_iterations {
                let temp_zx = zx * zx - zy * zy + cx;
                zy = 2.0 * zx * zy + cy;
                zx = temp_zx;
                iteration += 1;
            }
        }
        
        self.color_cache.insert((x, y), iteration);
        iteration
    }

    fn fill_rect(&mut self, x1: u32, y1: u32, x2: u32, y2: u32, color: [u8; 3]) {
        for y in y1..=y2 {
            for x in x1..=x2 {
                let index = ((y * self.width + x) * 4) as usize;
                self.pixels[index] = color[0];
                self.pixels[index + 1] = color[1];
                self.pixels[index + 2] = color[2];
                self.pixels[index + 3] = 255;
            }
        }
    }
    
    fn get_color_components(&self, iteration: u32) -> [u8; 3] {
        if iteration == self.max_iterations { return [0, 0, 0]; }
        let hue = (360.0 * iteration as f64 / self.max_iterations as f64) % 360.0;
        let saturation = 0.8; let value = 0.9;
        hsv_to_rgb(hue, saturation, value)
    }
}

// HSV to RGB (変更なし)
fn hsv_to_rgb(h: f64, s: f64, v: f64) -> [u8; 3] {
    let c = v * s;
    let x = c * (1.0 - ((h / 60.0) % 2.0 - 1.0).abs());
    let m = v - c;

    let (r_prime, g_prime, b_prime) = if h < 60.0 {
        (c, x, 0.0)
    } else if h < 120.0 {
        (x, c, 0.0)
    } else if h < 180.0 {
        (0.0, c, x)
    } else if h < 240.0 {
        (0.0, x, c)
    } else if h < 300.0 {
        (x, 0.0, c)
    } else {
        (c, 0.0, x)
    };
    
    [
        ((r_prime + m) * 255.0) as u8,
        ((g_prime + m) * 255.0) as u8,
        ((b_prime + m) * 255.0) as u8,
    ]
}
