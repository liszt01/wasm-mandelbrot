// --- DOM要素の取得 (変更なし) ---
const wasmCanvas = document.getElementById('wasmCanvas'), jsCanvas = document.getElementById('jsCanvas');
const wasmCtx = wasmCanvas.getContext('2d'), jsCtx = jsCanvas.getContext('2d');
const wasmStats = document.getElementById('wasmStats'), jsStats = document.getElementById('jsStats');

const inputCenterX = document.getElementById('centerX'), inputCenterY = document.getElementById('centerY');
const inputScale = document.getElementById('scale'), inputMaxIterations = document.getElementById('maxIterations');
const inputBailout = document.getElementById('bailout');
const renderBtn = document.getElementById('renderBtn'), resetBtn = document.getElementById('resetView');
const zoomBtn = document.getElementById('zoomBtn');

const inputAnimTargetZoom = document.getElementById('animTargetZoom');
const inputAnimFrameMultiplier = document.getElementById('animFrameMultiplier');

// --- デフォルトパラメータ (変更なし) ---
const DEFAULT_PARAMS = {
    centerX: -1.37012065,
    centerY: 0.0094956,
    scale: 4.0,
    maxIterations: 1500,
    bailoutRadius: 4.0,
};
const DEFAULT_ANIM_PARAMS = {
    targetZoom: 800000,
    frameMultiplier: 1.3, // 1フレーム毎に30%ズームイン
};

// --- アプリケーションの状態 ---
let params = { ...DEFAULT_PARAMS };
let jsWorker = null, wasmWorker = null;
let isAnimating = false;
let isDragging = false, lastMousePos = { x: 0, y: 0 };


// --- UI更新 (変更なし) ---
function updateUI() {
    inputCenterX.value = params.centerX.toPrecision(16);
    inputCenterY.value = params.centerY.toPrecision(16);
    inputScale.value = params.scale.toPrecision(16);
    inputMaxIterations.value = params.maxIterations;
    inputBailout.value = params.bailoutRadius;
}
function setAnimationUI() {
    inputAnimTargetZoom.value = DEFAULT_ANIM_PARAMS.targetZoom;
    inputAnimFrameMultiplier.value = DEFAULT_ANIM_PARAMS.frameMultiplier;
}


// --- 描画トリガー ---
// Workerに計算を依頼するだけのシンプルな関数になった
function draw() {
    if (!jsWorker || !wasmWorker) return;
    // Workerに現在のパラメータを送る
    const commonParams = {
        ...params,
        width: wasmCanvas.width,
        height: wasmCanvas.height
    };
    jsWorker.postMessage(commonParams);
    wasmWorker.postMessage(commonParams);
}

// --- アニメーション ---
// ロジックは同じだが、draw()の呼び出し方が変わった
function startZoomAnimation() {
    if (isAnimating) return;

    const targetZoom = parseFloat(inputAnimTargetZoom.value) || DEFAULT_ANIM_PARAMS.targetZoom;
    const frameMultiplier = parseFloat(inputAnimFrameMultiplier.value) || DEFAULT_ANIM_PARAMS.frameMultiplier;

    if (frameMultiplier <= 1.0) {
        alert("「1フレーム毎のズーム倍率」は1より大きい値を設定してください。");
        return;
    }

    isAnimating = true;
    [renderBtn, resetBtn, zoomBtn].forEach(btn => btn.disabled = true);

    const targetScale = params.scale / targetZoom;

    function animateStep() {
        params.scale /= frameMultiplier;
        if (params.scale <= targetScale) {
            params.scale = targetScale;
            updateUI();
            draw(); // 最後のフレームを描画
            isAnimating = false;
            [renderBtn, resetBtn, zoomBtn].forEach(btn => btn.disabled = false);
            return;
        }
        updateUI();
        draw(); // 各フレームでWorkerに計算を依頼
        requestAnimationFrame(animateStep);
    }
    requestAnimationFrame(animateStep);
}


// --- イベントハンドラ (変更なし) ---
function handleRender() {
    if (isAnimating) return;
    params.centerX = parseFloat(inputCenterX.value);
    params.centerY = parseFloat(inputCenterY.value);
    params.scale = parseFloat(inputScale.value);
    params.maxIterations = parseInt(inputMaxIterations.value);
    params.bailoutRadius = parseFloat(inputBailout.value);
    draw();
}

function handleReset() {
    if (isAnimating) return;
    params = { ...DEFAULT_PARAMS };
    updateUI();
    setAnimationUI();
    draw();
}

function handleMouseDown(e) {
    if (isAnimating) return;
    isDragging = true;
    lastMousePos = { x: e.clientX, y: e.clientY };
    e.target.style.cursor = 'grabbing';
}

function handleMouseUp(e) {
    if (isAnimating) return;
    isDragging = false;
    e.target.style.cursor = 'grab';
}

function handleMouseMove(e) {
    if (!isDragging || isAnimating) return;
    const dx = e.clientX - lastMousePos.x, dy = e.clientY - lastMousePos.y;
    const scaleFactor = params.scale / e.target.width;
    params.centerX -= dx * scaleFactor;
    params.centerY -= dy * scaleFactor;
    lastMousePos = { x: e.clientX, y: e.clientY };
    updateUI();
    draw();
}

function handleWheel(e) {
    if (isAnimating) return;
    e.preventDefault();
    const rect = e.target.getBoundingClientRect();
    const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
    const mouseRe = params.centerX + (mouseX / e.target.width - 0.5) * params.scale * (e.target.width / e.target.height);
    const mouseIm = params.centerY + (mouseY / e.target.height - 0.5) * params.scale;
    const zoomFactor = e.deltaY < 0 ? 0.9 : 1.1;
    params.scale *= zoomFactor;
    params.centerX = mouseRe - (mouseX / e.target.width - 0.5) * params.scale * (e.target.width / e.target.height);
    params.centerY = mouseIm - (mouseY / e.target.height - 0.5) * params.scale;
    updateUI();
    draw();
}

// --- 初期化処理 ---
function main() {
    // Workerを初期化
    // { type: 'module' } を指定することで、Worker内でimport/export構文が使える
    jsWorker = new Worker('./worker_js.js', { type: 'module' });
    wasmWorker = new Worker('./worker_wasm.js', { type: 'module' });

    // JS Workerからのメッセージ受信時の処理
    jsWorker.onmessage = (e) => {
        const { imageData, time } = e.data;
        jsCtx.putImageData(imageData, 0, 0); // 受け取ったら即座に描画
        // jsStats.textContent = `Time: ${time.toFixed(2)} ms`;
    };
    
    // Wasm Workerからのメッセージ受信時の処理
    wasmWorker.onmessage = (e) => {
        const { pixelData, time, width, height } = e.data;
        const imageData = new ImageData(new Uint8ClampedArray(pixelData), width, height);
        wasmCtx.putImageData(imageData, 0, 0); // 受け取ったら即座に描画
        // wasmStats.textContent = `Time: ${time.toFixed(2)} ms`;
    };

    // UIの初期値を設定
    updateUI();
    setAnimationUI();

    // イベントリスナーを設定
    renderBtn.addEventListener('click', handleRender);
    resetBtn.addEventListener('click', handleReset);
    zoomBtn.addEventListener('click', startZoomAnimation);
    
    [wasmCanvas, jsCanvas].forEach(canvas => {
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseUp);
        canvas.addEventListener('wheel', handleWheel);
    });
    
    // 初回描画
    draw();
}

main();
