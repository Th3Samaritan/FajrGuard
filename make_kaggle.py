"""Convert the Colab notebook to a Kaggle-compatible version."""
import json, copy

with open("fajrguard_wudu_dataset.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

kb = copy.deepcopy(nb)
kb["metadata"] = {
    "kernelspec": {"name": "python3", "display_name": "Python 3"},
    "language_info": {"name": "python"},
    "kaggle": {
        "accelerator": "gpu",
        "dataSources": [{"sourceId": 29561, "sourceType": "datasetVersion",
                         "datasetId": 17918, "sourceSlug": "celeba-dataset"}],
        "isGpuEnabled": True, "isInternetEnabled": True
    },
}

cells = kb["cells"]

# ── 1. Fix install cell: remove Colab-only bits, add Kaggle deps ───────────
for c in cells:
    if c["cell_type"] == "code":
        src = "".join(c["source"])
        if "pip install" in src and "diffusers" in src:
            c["source"] = [
                "import torch\n",
                "print(f'PyTorch: {torch.__version__} | CUDA: {torch.cuda.is_available()}')\n",
                "if torch.cuda.is_available():\n",
                "    print(f'GPU: {torch.cuda.get_device_name(0)}')\n",
                "else:\n",
                "    print('⚠️  No GPU — enable GPU in Settings > Accelerator')\n",
                "\n",
                "!pip install \"diffusers>=0.31,<1.0\" \"transformers>=4.46,<5.0\" \"accelerate>=0.35,<1.0\" -q\n",
                "!pip install \"controlnet-aux>=0.0.7\" -q\n",
                "!pip install opencv-python-headless facenet-pytorch Pillow tqdm imagehash icrawler -q\n",
                "\n",
                "import subprocess, sys\n",
                "try:\n",
                "    cu = torch.version.cuda.replace('.', '')\n",
                "    subprocess.run([sys.executable, '-m', 'pip', 'install', 'xformers',\n",
                "         '--index-url', f'https://download.pytorch.org/whl/cu{cu}', '-q'],\n",
                "        check=True, capture_output=True)\n",
                "    print('✅ xformers installed')\n",
                "except Exception:\n",
                "    print('⚠️  xformers skipped — attention_slicing fallback')\n",
                "\n",
                "print('\\n✅ All dependencies ready')",
            ]
            print("✅ Install cell adapted for Kaggle")
            break

# ── 2. Replace Drive mount / config cell with Kaggle paths ─────────────────
for c in cells:
    if c["cell_type"] == "code":
        src = "".join(c["source"])
        if "drive.mount" in src or ("CELEBA_DIR" in src and "OUTPUT_DIR" in src and "MAX_IMAGES" in src):
            c["source"] = [
                "import os, glob\n",
                "\n",
                "# ─── KAGGLE PATHS ────────────────────────────────────────────────────────────\n",
                "# CelebA: add dataset 'jessicali9530/celeba-dataset' to your notebook\n",
                "CELEBA_DIR   = '/kaggle/input/celeba-dataset/img_align_celeba/img_align_celeba'\n",
                "OUTPUT_DIR   = '/kaggle/working/fajrguard_dataset'\n",
                "MAX_IMAGES   = 500\n",
                "STRENGTH     = 0.70\n",
                "STEPS        = 40\n",
                "WET_THRESHOLD = 0.82\n",
                "# ─────────────────────────────────────────────────────────────────────────────\n",
                "\n",
                "# Fallback: try to find CelebA in common locations\n",
                "if not os.path.exists(CELEBA_DIR):\n",
                "    matches = glob.glob('/kaggle/input/**/img_align_celeba', recursive=True)\n",
                "    if matches:\n",
                "        CELEBA_DIR = matches[0]\n",
                "\n",
                "os.makedirs(f'{OUTPUT_DIR}/dry', exist_ok=True)\n",
                "os.makedirs(f'{OUTPUT_DIR}/wet', exist_ok=True)\n",
                "os.makedirs(f'{OUTPUT_DIR}/rejected', exist_ok=True)\n",
                "\n",
                "print(f'✅ Output directory: {OUTPUT_DIR}')\n",
                "if os.path.exists(CELEBA_DIR):\n",
                "    print(f'✅ CelebA found: {len(os.listdir(CELEBA_DIR)):,} images')\n",
                "else:\n",
                "    print('⚠️  CelebA not found — add jessicali9530/celeba-dataset to notebook')",
            ]
            print("✅ Config cell adapted for Kaggle paths")
            break

# ── 3. Remove or replace kagglehub download cell ───────────────────────────
# On Kaggle the dataset is already mounted, so skip the kagglehub cell
new_cells = []
for c in cells:
    if c["cell_type"] == "code" and "kagglehub.dataset_download" in "".join(c["source"]):
        # Replace with a simpler note
        c["source"] = [
            "# On Kaggle, CelebA is already available via the attached dataset.\n",
            "# If CELEBA_DIR was not found above, go to:\n",
            "#   Add Data > Search 'celeba-dataset' > Add\n",
            "print(f'CELEBA_DIR = {CELEBA_DIR}')\n",
            "print(f'Images: {len(os.listdir(CELEBA_DIR)):,}' if os.path.exists(CELEBA_DIR) else '⚠️  Not found')",
        ]
    new_cells.append(c)
kb["cells"] = new_cells
cells = kb["cells"]

# ── 4. Fix benchmark cell tmp dir for Kaggle ───────────────────────────────
for c in cells:
    if c["cell_type"] == "code":
        src = "".join(c["source"])
        if "benchmark_wet" in src and "_TMP_DIR" in src:
            c["source"] = [line.replace("/content/_bench_tmp", "/kaggle/working/_bench_tmp")
                           for line in c["source"]]
            print("✅ Benchmark cell paths fixed for Kaggle")
            break

# ── 5. Fix model save paths ────────────────────────────────────────────────
for c in cells:
    if c["cell_type"] == "code":
        src = "".join(c["source"])
        if "model_save" in src and "OUTPUT_DIR" in src:
            # These use OUTPUT_DIR which is already fixed, no change needed
            pass

# ── 6. Update title ────────────────────────────────────────────────────────
for c in cells:
    if c["cell_type"] == "markdown":
        src = "".join(c["source"])
        if "FajrGuard" in src and "Wudu Detector Dataset" in src:
            c["source"] = [line.replace("Wudu Detector Dataset Generator",
                                        "Wudu Detector Dataset Generator (Kaggle)")
                           for line in c["source"]]
            break

# ── Save ────────────────────────────────────────────────────────────────────
out = "fajrguard_wudu_kaggle.ipynb"
with open(out, "w", encoding="utf-8") as f:
    json.dump(kb, f, indent=1, ensure_ascii=False)

print(f"\n✅ Kaggle notebook saved: {out}")
print("   Upload to kaggle.com/code > New Notebook > File > Import Notebook")
print("   Attach dataset: jessicali9530/celeba-dataset")
print("   Enable GPU: Settings > Accelerator > GPU T4 x2")
