import json

with open("fajrguard_wudu_dataset.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

cells = nb["cells"]

# ── Fix 1: Replace install cell source ──────────────────────────────────────
# Updated: use diffusers/transformers versions compatible with Colab's
# huggingface_hub >= 1.0.  Removed --force-reinstall to avoid cascading
# dependency breakage in Colab's pre-installed ecosystem.
NEW_INSTALL = [
    "import torch\n",
    "print(f\"PyTorch: {torch.__version__} | CUDA: {torch.cuda.is_available()}\")\n",
    "if torch.cuda.is_available():\n",
    "    print(f\"GPU: {torch.cuda.get_device_name(0)}\")\n",
    "else:\n",
    "    print(\"⚠️  No GPU — Runtime > Change runtime type > T4 GPU\")\n",
    "\n",
    "# Core packages — versions compatible with Colab's huggingface_hub >= 1.0\n",
    "# (diffusers>=0.31 and transformers>=4.46 added huggingface_hub 1.x support)\n",
    "!pip install \"diffusers>=0.31,<1.0\" \"transformers>=4.46,<5.0\" \"accelerate>=0.35,<1.0\" -q\n",
    "!pip install \"controlnet-aux>=0.0.7\" -q\n",
    "!pip install opencv-python-headless facenet-pytorch Pillow tqdm imagehash kagglehub icrawler -q\n",
    "\n",
    "# xformers: install matching Colab's CUDA version, skip gracefully if it fails\n",
    "import subprocess, sys\n",
    "try:\n",
    "    cu = torch.version.cuda.replace('.', '')\n",
    "    subprocess.run(\n",
    "        [sys.executable, '-m', 'pip', 'install', 'xformers',\n",
    "         '--index-url', f'https://download.pytorch.org/whl/cu{cu}', '-q'],\n",
    "        check=True, capture_output=True\n",
    "    )\n",
    "    print('✅ xformers installed')\n",
    "except Exception as e:\n",
    "    print(f'⚠️  xformers skipped — attention_slicing fallback will be used')\n",
    "\n",
    "print('\\n✅ All dependencies ready')",
]

# Find install cell (contains "xformers controlnet_aux")
for cell in cells:
    if cell["cell_type"] == "code":
        src = "".join(cell["source"])
        if "xformers controlnet_aux" in src or ("diffusers" in src and "pip install" in src and "xformers" in src):
            cell["source"] = NEW_INSTALL
            print("✅ Fix 1 applied: install cell updated")
            break

# ── Fix 2: Insert kagglehub download cell after Cell 2 config ───────────────
KAGGLE_CELL = {
    "cell_type": "code",
    "execution_count": None,
    "metadata": {},
    "outputs": [],
    "source": [
        "# ─── Download CelebA via kagglehub (no manual Drive upload needed) ───────────\n",
        "import kagglehub, os, glob\n",
        "\n",
        "# First run: will prompt for kaggle.json credentials\n",
        "# Upload kaggle.json when prompted, or run the cell below first:\n",
        "#   from google.colab import files; files.upload()\n",
        "#   !mkdir -p ~/.kaggle && cp kaggle.json ~/.kaggle/ && chmod 600 ~/.kaggle/kaggle.json\n",
        "\n",
        "print('Downloading CelebA (~1.3 GB, cached after first run)...')\n",
        "dl_path = kagglehub.dataset_download('zuozhaorui/celeba')\n",
        "print(f'Downloaded to: {dl_path}')\n",
        "\n",
        "# Auto-locate img_align_celeba folder\n",
        "matches = glob.glob(f'{dl_path}/**/img_align_celeba', recursive=True)\n",
        "if matches:\n",
        "    CELEBA_DIR = matches[0]\n",
        "else:\n",
        "    CELEBA_DIR = dl_path  # fallback: images at root\n",
        "\n",
        "print(f'✅ CELEBA_DIR = {CELEBA_DIR}')\n",
        "print(f'   Images found: {len(os.listdir(CELEBA_DIR)):,}')",
    ],
}

# Insert after the Cell 2 config code cell (contains "img_align_celeba")
insert_after = -1
for i, cell in enumerate(cells):
    if cell["cell_type"] == "code":
        src = "".join(cell["source"])
        if "img_align_celeba" in src and "CELEBA_DIR" in src and "OUTPUT_DIR" in src:
            insert_after = i
            break

kaggle_exists = any(
    c["cell_type"] == "code" and "kagglehub.dataset_download" in "".join(c["source"])
    for c in cells
)

if insert_after >= 0 and not kaggle_exists:
    cells.insert(insert_after + 1, KAGGLE_CELL)
    print(f"✅ Fix 2 applied: kagglehub cell inserted at position {insert_after + 1}")
elif kaggle_exists:
    print("✅ Fix 2 skipped: kagglehub cell already exists")
else:
    print("⚠️  Fix 2 skipped: Cell 2 anchor not found")

# ── Fix 3: Fix xformers call in model loading cell ──────────────────────────
for cell in cells:
    if cell["cell_type"] == "code":
        src = "".join(cell["source"])
        if "enable_xformers_memory_efficient_attention" in src and "StableDiffusion" in src:
            new_src = []
            for line in cell["source"]:
                if "enable_xformers_memory_efficient_attention" in line:
                    new_src += [
                        "try:\n",
                        "    pipe.enable_xformers_memory_efficient_attention()\n",
                        "    print('✅ xformers memory efficient attention enabled')\n",
                        "except Exception:\n",
                        "    pipe.enable_attention_slicing()\n",
                        "    print('⚠️  xformers unavailable — using attention_slicing (same quality, slightly slower)')\n",
                    ]
                else:
                    new_src.append(line)
            cell["source"] = new_src
            print("✅ Fix 3 applied: xformers call made optional")
            break

# ── Fix 4: Fix OpenposeDetector loading ─────────────────────────────────────
for cell in cells:
    if cell["cell_type"] == "code":
        src = "".join(cell["source"])
        if "OpenposeDetector.from_pretrained" in src:
            new_src = []
            for line in cell["source"]:
                if "OpenposeDetector.from_pretrained" in line:
                    new_src += [
                        "try:\n",
                        "    openpose = OpenposeDetector.from_pretrained('lllyasviel/ControlNet')\n",
                        "    print('✅ OpenPose loaded')\n",
                        "except Exception as e:\n",
                        "    print(f'⚠️  OpenPose failed ({e}), falling back to MidasDetector')\n",
                        "    from controlnet_aux import MidasDetector\n",
                        "    openpose = MidasDetector.from_pretrained('lllyasviel/Annotators')\n",
                        "    print('✅ Depth detector loaded as fallback')\n",
                    ]
                else:
                    new_src.append(line)
            cell["source"] = new_src
            print("✅ Fix 4 applied: OpenposeDetector loading made fault-tolerant")
            break

# ── Fix 5: Update config cell — CELEBA_DIR note + heavy-wetness params ──────
for cell in cells:
    if cell["cell_type"] == "code":
        src = "".join(cell["source"])
        if "CELEBA_DIR" in src and "OUTPUT_DIR" in src and "MAX_IMAGES" in src:
            new_src = []
            for line in cell["source"]:
                if 'CELEBA_DIR' in line and 'img_align_celeba' in line and '=' in line:
                    new_src.append(
                        "CELEBA_DIR   = \"/content/drive/MyDrive/celeba/img_align_celeba\"  "
                        "# overridden by kagglehub cell above if used\n"
                    )
                elif 'STRENGTH' in line and '=' in line and 'def ' not in line:
                    new_src.append(
                        "STRENGTH     = 0.70       # img2img strength — heavy wetness (was 0.52)\n"
                    )
                elif 'STEPS' in line and '=' in line and 'num_inference' not in line and 'def ' not in line:
                    new_src.append(
                        "STEPS        = 40         # inference steps — more detail for water droplets (was 28)\n"
                    )
                else:
                    new_src.append(line)
            cell["source"] = new_src
            print("✅ Fix 5 applied: CELEBA_DIR + STRENGTH=0.70 + STEPS=40")
            break

# ── Fix 6: REMOVED — Real wet faces now come from Kaggle dataset, no scraping.
# The real-wet-faces dataset (abdulsamadmuyideen/real-wet-faces) is imported in
# Cell 2b via kagglehub / Kaggle mount, with 85/15 training/holdout split.
# Previously this inserted a web-scraping cell using icrawler.BingImageCrawler.
print("✅ Fix 6 skipped: real wet faces loaded from dataset, no scraping.")

# ── Fix 7: Replace generation with PURE POST-PROCESSING (no SD) ─────────────
# SD img2img destroys face identity. This approach overlays water effects
# on the ORIGINAL image using only OpenCV/PIL — 100% identity preservation.
IMPROVED_GEN_CELL = [
    "from PIL import Image, ImageFilter, ImageEnhance, ImageDraw\n",
    "import numpy as np\n",
    "import cv2\n",
    "import random\n",
    "\n",
    "# ═══════════════════════════════════════════════════════════════════════════\n",
    "# PHYSICS-BASED PROCEDURAL WETNESS — 100% IDENTITY PRESERVATION\n",
    "# Six-pass compositing: wet skin tone → facial sheen → edge wetness →\n",
    "# caustic droplets → micro-texture → gravity streaks.\n",
    "# Blend modes: screen, overlay, soft_light.  No SD / no neural network.\n",
    "# ═══════════════════════════════════════════════════════════════════════════\n",
    "\n",
    "# ═══ UNIFIED BLEND FUNCTIONS ═══════════════════════════════════════════════\n",
    "def _blend(base, overlay, alpha, mode='screen'):\n",
    "    '''Base + overlay with alpha mask, using screen/overlay/soft_light.'''\n",
    "    b = base / 255.0\n",
    "    o = overlay / 255.0\n",
    "    a = alpha[:,:,None] if alpha.ndim == 2 else alpha\n",
    "    if mode == 'screen':\n",
    "        blended = 1.0 - (1.0 - b) * (1.0 - o)\n",
    "    elif mode == 'overlay':\n",
    "        lo = b < 0.5\n",
    "        blended = np.where(lo, 2.0*b*o, 1.0 - 2.0*(1.0-b)*(1.0-o))\n",
    "    elif mode == 'soft_light':\n",
    "        lo = o < 0.5\n",
    "        blended = np.where(lo, b - (1.0-2.0*o)*b*(1.0-b), b + (2.0*o-1.0)*(np.sqrt(b)-b))\n",
    "    else:\n",
    "        blended = 1.0 - (1.0 - b) * (1.0 - o)\n",
    "    result = b*(1-a) + blended*a\n",
    "    return np.clip(result*255, 0, 255)\n",
    "\n",
    "# ═══ FACE MASK ═════════════════════════════════════════════════════════════\n",
    "def create_face_mask(img_pil, detector, padding=0.22):\n",
    "    '''Returns float32 (H,W) soft elliptical face mask.'''\n",
    "    boxes, probs = detector.detect(img_pil)\n",
    "    w, h = img_pil.size\n",
    "    mask = np.zeros((h, w), dtype=np.float32)\n",
    "    if boxes is not None and len(boxes) > 0:\n",
    "        idx = int(probs.argmax())\n",
    "        x1, y1, x2, y2 = boxes[idx]\n",
    "        fw, fh = float(x2 - x1), float(y2 - y1)\n",
    "        cx, cy = int((x1 + x2) / 2), int((y1 + y2) / 2)\n",
    "        rx, ry = int(fw/2 * (1+padding)), int(fh/2 * (1+padding*1.3))\n",
    "        cv2.ellipse(mask, (cx, cy), (rx, ry), 0, 0, 360, 1.0, -1)\n",
    "        ksize = max(3, int(fw * 0.15)) | 1\n",
    "        mask = cv2.GaussianBlur(mask, (ksize, ksize), fw * 0.08)\n",
    "    else:\n",
    "        cx, cy = w//2, h//2\n",
    "        cv2.ellipse(mask, (cx, cy), (w//3, h//3), 0, 0, 360, 1.0, -1)\n",
    "        mask = cv2.GaussianBlur(mask, (31, 31), 12)\n",
    "    return np.clip(mask, 0, 1)\n",
    "\n",
    "def _face_detail_mask(mask, grad_scale=8.0):\n",
    "    '''Gradient magnitude of mask — highlights facial contours.'''\n",
    "    gy, gx = np.gradient(mask)\n",
    "    grad = np.sqrt(gx**2 + gy**2)\n",
    "    grad = cv2.GaussianBlur(grad, (21, 21), 8)\n",
    "    return np.clip(grad * grad_scale, 0, 1)\n",
    "\n",
    "# ═══ WATER DROPLET TEMPLATES (PHYSICS-BASED) ═══════════════════════════════\n",
    "def _make_drop_template(radius):\n",
    "    '''Multi-layer droplet: caustic highlight + fresnel + refraction.'''\n",
    "    sz = int(radius * 2 + 8)\n",
    "    cy = cx = sz // 2\n",
    "    Y, X = np.mgrid[0:sz, 0:sz]\n",
    "    dx = (X - cx).astype(np.float32)\n",
    "    dy = (Y - cy).astype(np.float32)\n",
    "    dist = np.sqrt(dx*dx + dy*dy)\n",
    "    nd = np.clip(dist / max(radius, 1), 0, 1.0)\n",
    "    inside = (dist <= radius).astype(np.float32)\n",
    "    alpha = np.clip(1.0 - nd**2.2, 0, 1) * 0.5 * inside\n",
    "    sx = dx + radius * 0.30\n",
    "    sy = dy + radius * 0.30\n",
    "    sd = np.sqrt(sx*sx + sy*sy) / max(radius, 1)\n",
    "    spec = np.clip(1.0 - sd * 1.8, 0, 1) ** 3.0\n",
    "    sx2 = dx - radius * 0.40\n",
    "    sy2 = dy - radius * 0.40\n",
    "    sd2 = np.sqrt(sx2*sx2 + sy2*sy2) / max(radius, 1)\n",
    "    bounce = np.clip(1.0 - sd2 * 2.5, 0, 1) ** 4.0 * 0.15\n",
    "    rim = nd ** 3.0 * 0.22 * inside  # fresnel rim darkening\n",
    "    # Combine: bright caustic + dim bounce - rim\n",
    "    bright = np.clip(0.05 + spec * 0.95 + bounce - rim, 0, 1) * inside\n",
    "    return np.stack([bright, alpha], axis=-1)\n",
    "\n",
    "_DROP_CACHE = {r: _make_drop_template(r) for r in range(1, 16)}\n",
    "\n",
    "def _scatter_droplets(h, w, mask, strength=1.0):\n",
    "    '''Cluster-aware droplet placement: droplets gather near each other.'''\n",
    "    hl = np.zeros((h, w), dtype=np.float32)\n",
    "    al = np.zeros((h, w), dtype=np.float32)\n",
    "    ys, xs = np.where(mask > 0.30)\n",
    "    if len(ys) < 10:\n",
    "        return hl, al\n",
    "    n = int(len(ys) * 0.055 * strength)\n",
    "    weights = [40, 30, 20, 12, 7, 4, 3, 2, 1, 1, 1, 1, 1, 1]\n",
    "    n_clusters = max(3, n // 40)\n",
    "    cluster_yx = [(int(ys[random.randint(0, len(ys)-1)]),\n",
    "                   int(xs[random.randint(0, len(xs)-1)]))\n",
    "                  for _ in range(n_clusters)]\n",
    "    for _ in range(n):\n",
    "        if random.random() < 0.60 and cluster_yx:\n",
    "            cy_c, cx_c = random.choice(cluster_yx)\n",
    "            cy = cy_c + random.randint(-80, 80)\n",
    "            cx = cx_c + random.randint(-80, 80)\n",
    "            cy = max(0, min(h-1, cy))\n",
    "            cx = max(0, min(w-1, cx))\n",
    "            if mask[cy, cx] < 0.15:\n",
    "                idx = random.randint(0, len(ys)-1)\n",
    "                cy, cx = int(ys[idx]), int(xs[idx])\n",
    "        else:\n",
    "            idx = random.randint(0, len(ys)-1)\n",
    "            cy, cx = int(ys[idx]), int(xs[idx])\n",
    "        r = random.choices(range(1, 15), weights=weights)[0]\n",
    "        tmpl = _DROP_CACHE[r]\n",
    "        tsz = tmpl.shape[0]\n",
    "        y1, y2 = max(0, cy-tsz//2), min(h, cy-tsz//2+tsz)\n",
    "        x1, x2 = max(0, cx-tsz//2), min(w, cx-tsz//2+tsz)\n",
    "        dy1 = y1 - (cy - tsz//2)\n",
    "        dx1 = x1 - (cx - tsz//2)\n",
    "        patch = tmpl[dy1:dy1+(y2-y1), dx1:dx1+(x2-x1)]\n",
    "        hl[y1:y2, x1:x2] = np.maximum(hl[y1:y2, x1:x2], patch[:,:,0])\n",
    "        al[y1:y2, x1:x2] = np.maximum(al[y1:y2, x1:x2], patch[:,:,1])\n",
    "    return hl, al\n",
    "\n",
    "# ═══ MICRO-TEXTURE (WATER IN SKIN PORES) ══════════════════════════════════\n",
    "def _micro_texture(h, w, mask, strength=1.0):\n",
    "    '''Fine water-beading texture: simulates water filling skin micro-crevices.'''\n",
    "    noise = np.zeros((h, w), dtype=np.float32)\n",
    "    for octave, scale in enumerate([16, 32, 64]):\n",
    "        nh, nw = h//scale, w//scale\n",
    "        n = np.random.rand(nh, nw).astype(np.float32)\n",
    "        n = cv2.resize(n, (w, h), interpolation=cv2.INTER_CUBIC)\n",
    "        amp = 0.5 ** octave\n",
    "        noise += n * amp\n",
    "    noise = (noise - noise.mean()) / (noise.std() + 1e-6)\n",
    "    noise = np.clip(noise * 0.5 + 0.5, 0, 1)\n",
    "    kernel = np.array([[-1,-1,-1],[-1,9,-1],[-1,-1,-1]], dtype=np.float32)/5.0\n",
    "    noise = cv2.filter2D(noise, -1, kernel)\n",
    "    noise = np.clip(noise, 0, 1)\n",
    "    return noise * mask * strength * 0.12\n",
    "\n",
    "# ═══ FACIAL SHEEN (CONTOUR-AWARE BROAD SPECULAR) ══════════════════════════\n",
    "def _facial_sheen(arr, mask, strength=1.0):\n",
    "    '''Broad wet gloss following facial contours — not uniform shine.'''\n",
    "    gray = cv2.cvtColor(arr.astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)/255.0\n",
    "    sheen = (gray - 0.25).clip(0, 1) ** 0.7\n",
    "    sheen *= mask * strength * 0.14\n",
    "    h, w = arr.shape[:2]\n",
    "    n1 = cv2.GaussianBlur(np.random.rand(h//8, w//8).astype(np.float32), (0,0), 3)\n",
    "    n1 = cv2.resize(n1, (w, h))\n",
    "    n2 = cv2.GaussianBlur(np.random.rand(h//4, w//4).astype(np.float32), (0,0), 2)\n",
    "    n2 = cv2.resize(n2, (w, h))\n",
    "    noise = n1 * 0.7 + n2 * 0.3\n",
    "    sheen *= (0.35 + noise * 0.65)\n",
    "    edge = _face_detail_mask(mask, grad_scale=4.0)\n",
    "    sheen += edge * strength * 0.06\n",
    "    return np.clip(sheen, 0, 1)\n",
    "\n",
    "# ═══ WATER STREAKS / RIVULETS ═════════════════════════════════════════════\n",
    "def _water_streaks(h, w, mask, strength=1.0):\n",
    "    '''Gravity-driven water streaks with variable width and specular centers.'''\n",
    "    spec_layer = np.zeros((h, w), dtype=np.float32)\n",
    "    dark_layer = np.zeros((h, w), dtype=np.float32)\n",
    "    ys, xs = np.where(mask > 0.30)\n",
    "    if len(ys) < 100:\n",
    "        return spec_layer, dark_layer\n",
    "    y_mid = float(np.median(ys))\n",
    "    for _ in range(int(12 * strength)):\n",
    "        upper = np.where(ys < y_mid)[0]\n",
    "        if len(upper) == 0:\n",
    "            continue\n",
    "        ti = upper[random.randint(0, len(upper)-1)]\n",
    "        sy, sx = int(ys[ti]), int(xs[ti])\n",
    "        pts = [(sx, sy)]\n",
    "        for _ in range(random.randint(30, 80)):\n",
    "            lx, ly = pts[-1]\n",
    "            ny = ly + random.randint(2, 4)\n",
    "            nx = lx + random.choice([-2,-1,0,1,2])\n",
    "            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] > 0.10:\n",
    "                pts.append((nx, ny))\n",
    "            else:\n",
    "                break\n",
    "        if len(pts) > 8:\n",
    "            arr_pts = np.array(pts, dtype=np.int32).reshape(-1, 1, 2)\n",
    "            width = random.choice([1, 1, 2, 2, 3])\n",
    "            cv2.polylines(dark_layer, [arr_pts], False, 0.55, width+2)\n",
    "            cv2.polylines(spec_layer, [arr_pts], False, 0.85, max(1, width-1))\n",
    "    dark_layer = cv2.GaussianBlur(dark_layer, (5, 5), 1.2)\n",
    "    spec_layer = cv2.GaussianBlur(spec_layer, (3, 3), 0.6)\n",
    "    return spec_layer * strength, dark_layer * strength\n",
    "\n",
    "# ═══ EDGE WATER ACCUMULATION ══════════════════════════════════════════════\n",
    "def _edge_wetness(arr, mask, strength=1.0):\n",
    "    '''Water pools at facial edges (jawline, nose sides, under eyes, hairline).'''\n",
    "    edge = _face_detail_mask(mask, grad_scale=6.0)\n",
    "    hsv = cv2.cvtColor(arr.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)\n",
    "    m = (edge * strength * 0.7)[:,:,None]\n",
    "    hsv[:,:,2] *= (1 - edge * strength * 0.12)\n",
    "    hsv[:,:,1] = np.clip(hsv[:,:,1] * (1 + edge * strength * 0.20), 0, 255)\n",
    "    result = cv2.cvtColor(np.clip(hsv, 0, 255).astype(np.uint8), cv2.COLOR_HSV2RGB)\n",
    "    return (arr.astype(np.float32)*(1-m) + result.astype(np.float32)*m)\n",
    "\n",
    "# ═══ WET SKIN TONE ════════════════════════════════════════════════════════\n",
    "def _wet_tone(arr, mask, strength=1.0):\n",
    "    '''Darken slightly + boost saturation — wet skin is darker and more vivid.'''\n",
    "    hsv = cv2.cvtColor(arr.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)\n",
    "    m3 = mask[:,:,None]\n",
    "    hsv[:,:,2] *= (1 - mask * 0.08 * strength)\n",
    "    hsv[:,:,1] = np.clip(hsv[:,:,1] * (1 + mask * 0.16 * strength), 0, 255)\n",
    "    wet = cv2.cvtColor(np.clip(hsv, 0, 255).astype(np.uint8), cv2.COLOR_HSV2RGB)\n",
    "    return (arr * (1 - m3) + wet.astype(np.float32) * m3)\n",
    "\n",
    "# ═══════════════════════════════════════════════════════════════════════════\n",
    "# MAIN GENERATION FUNCTION\n",
    "# ═══════════════════════════════════════════════════════════════════════════\n",
    "def generate_wet_face(dry_img_pil, strength=STRENGTH):\n",
    "    '''\n",
    "    Physics-based procedural wetness.  100% identity preservation.\n",
    "    Pass 1 — Wet skin tone (HSV darken + saturation boost)\n",
    "    Pass 2 — Facial sheen (contour-aware specular gloss, screen blend)\n",
    "    Pass 3 — Edge wetness (water accumulation at facial contours)\n",
    "    Pass 4 — Water droplets (cluster-scattered with caustic highlights)\n",
    "    Pass 5 — Micro-texture (water beading in skin pores, soft-light blend)\n",
    "    Pass 6 — Water streaks (gravity rivulets: dark core + specular center)\n",
    "    '''\n",
    "    img = dry_img_pil.resize((512, 512), Image.LANCZOS)\n",
    "    arr = np.array(img).astype(np.float32)\n",
    "    h, w = arr.shape[:2]\n",
    "    mask = create_face_mask(img, mtcnn)\n",
    "    \n",
    "    # Pass 1: Wet skin tone\n",
    "    result = _wet_tone(arr, mask, strength)\n",
    "    \n",
    "    # Pass 2: Facial sheen (screen blend)\n",
    "    sheen = _facial_sheen(result, mask, strength)\n",
    "    result = _blend(result, np.stack([sheen]*3, axis=-1)*255, sheen*0.85, 'screen')\n",
    "    \n",
    "    # Pass 3: Edge wetness\n",
    "    result = _edge_wetness(result, mask, strength)\n",
    "    \n",
    "    # Pass 4: Water droplets (screen blend on top)\n",
    "    d_hl, d_al = _scatter_droplets(h, w, mask, strength)\n",
    "    d_ovl = np.stack([d_hl*0.9]*3, axis=-1)*255\n",
    "    result = _blend(result, d_ovl, np.clip(d_al*1.1, 0, 1), 'screen')\n",
    "    \n",
    "    # Pass 5: Micro-texture (soft-light blend — subtle but realistic)\n",
    "    micro = _micro_texture(h, w, mask, strength)\n",
    "    micro_ovl = np.stack([micro]*3, axis=-1)*255\n",
    "    result = _blend(result, micro_ovl, micro*0.8, 'soft_light')\n",
    "    \n",
    "    # Pass 6: Water streaks (dark core + specular center)\n",
    "    streak_spec, streak_dark = _water_streaks(h, w, mask, strength)\n",
    "    dark_ovl = np.stack([streak_dark]*3, axis=-1)*255\n",
    "    result = _blend(result, dark_ovl, streak_dark*0.7, 'soft_light')\n",
    "    spec_ovl = np.stack([streak_spec]*3, axis=-1)*255\n",
    "    result = _blend(result, spec_ovl, streak_spec*0.75, 'screen')\n",
    "    \n",
    "    return Image.fromarray(np.clip(result, 0, 255).astype(np.uint8))\n",
    "\n",
    "print('\\n✅ Physics-based wetness generator ready')\n",
    "print('   Mode              : PURE POST-PROCESSING (no SD, 100% identity)')\n",
    "print(f'   Strength           : {STRENGTH}')\n",
    "print('   Water droplets    : cluster-scattered caustic + fresnel (1-14px)')\n",
    "print('   Micro-texture     : multi-octave noise (water in skin pores)')\n",
    "print('   Facial sheen      : contour-aware specular + organic patchiness')\n",
    "print('   Edge wetness      : water pooling at facial contours')\n",
    "print('   Streaks/rivulets  : dark core + specular center, gravity flow')\n",
    "print('   Blend modes       : screen + overlay + soft_light')",
]

# Find and replace Cell 4 (generation function)
# Match either old SD-based cell or new post-processing cell
for cell in cells:
    if cell["cell_type"] == "code":
        src = "".join(cell["source"])
        if "generate_wet_face" in src and "def " in src:
            cell["source"] = IMPROVED_GEN_CELL
            print("✅ Fix 7 applied: pure post-processing wetness (no SD)")
            break

# ── Save ─────────────────────────────────────────────────────────────────────
with open("fajrguard_wudu_dataset.ipynb", "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=1, ensure_ascii=False)

print("\n✅ Notebook patched and saved: fajrguard_wudu_dataset.ipynb")
