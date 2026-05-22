"""Update Cell 2b to use Kaggle dataset and add prediction test cell."""

import json

NEW_2B_CODE = [
    "# Import real wet faces from Kaggle dataset\n",
    "import os, shutil, hashlib, glob\n",
    "from PIL import Image\n",
    "from facenet_pytorch import MTCNN as _MTCNN\n",
    "\n",
    'BENCHMARK_DIR = f"{OUTPUT_DIR}/benchmark_wet"\n',
    "os.makedirs(BENCHMARK_DIR, exist_ok=True)\n",
    "\n",
    "# Source: https://www.kaggle.com/datasets/abdulsamadmuyideen/real-wet-faces\n",
    "REAL_WET_SOURCE = None\n",
    "\n",
    "# Try Kaggle mounted path first\n",
    'for candidate in ["/kaggle/input/real-wet-faces", "/kaggle/input/real-wet-faces/real_wet_faces"]:\n',
    "    if os.path.exists(candidate):\n",
    "        REAL_WET_SOURCE = candidate\n",
    "        break\n",
    "\n",
    "# Fallback: download via kagglehub (Colab)\n",
    "if REAL_WET_SOURCE is None:\n",
    "    try:\n",
    "        import kagglehub\n",
    '        print("Downloading real-wet-faces from Kaggle...")\n',
    '        dl_path = kagglehub.dataset_download("abdulsamadmuyideen/real-wet-faces")\n',
    '        print(f"Downloaded to: {dl_path}")\n',
    "        for sub in sorted(os.listdir(dl_path)):\n",
    "            sub_path = os.path.join(dl_path, sub)\n",
    "            if os.path.isdir(sub_path):\n",
    '                imgs = glob.glob(f"{sub_path}/*.jpg") + glob.glob(f"{sub_path}/*.png")\n',
    "                if len(imgs) > 0:\n",
    "                    REAL_WET_SOURCE = sub_path\n",
    "                    break\n",
    "        if REAL_WET_SOURCE is None:\n",
    "            REAL_WET_SOURCE = dl_path\n",
    "    except Exception as e:\n",
    '        print(f"kagglehub failed: {e}")\n',
    "\n",
    "if REAL_WET_SOURCE is None or not os.path.exists(REAL_WET_SOURCE):\n",
    '    print("Real wet faces not found.")\n',
    '    print("On Kaggle: Add Data -> Search real-wet-faces -> Add")\n',
    "else:\n",
    '    print(f"Source: {REAL_WET_SOURCE}")\n',
    '    _det = _MTCNN(keep_all=False, device="cpu", min_face_size=60)\n',
    "    kept, skipped_nf, skipped_dup = 0, 0, 0\n",
    "    seen = set()\n",
    '    exts = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}\n',
    "    files = sorted([f for f in os.listdir(REAL_WET_SOURCE)\n",
    "                    if os.path.splitext(f)[1].lower() in exts])\n",
    "    for fname in files:\n",
    "        fpath = os.path.join(REAL_WET_SOURCE, fname)\n",
    "        try:\n",
    '            img = Image.open(fpath).convert("RGB")\n',
    "            if min(img.size) < 200:\n",
    "                continue\n",
    "            h = hashlib.md5(img.resize((64,64)).tobytes()).hexdigest()\n",
    "            if h in seen:\n",
    "                skipped_dup += 1; continue\n",
    "            seen.add(h)\n",
    "            boxes, probs = _det.detect(img)\n",
    "            if boxes is None or probs is None:\n",
    "                skipped_nf += 1; continue\n",
    "            if not any(p is not None and float(p) > 0.85 for p in probs):\n",
    "                skipped_nf += 1; continue\n",
    '            dest = os.path.join(BENCHMARK_DIR, f"real_wet_{kept:05d}.jpg")\n',
    "            img.resize((512, 512), Image.LANCZOS).save(dest, quality=93)\n",
    "            kept += 1\n",
    "        except Exception:\n",
    "            pass\n",
    '    print(f"Imported: {kept} (skipped no-face: {skipped_nf}, dup: {skipped_dup})")\n',
]

PREDICTION_TEST_MD = [
    "## \U0001f52e Cell 11b -- Test Model on New Images (Wet vs Dry)\n",
    "Drop test images in a `test_images/` folder and this cell predicts\n",
    "whether each face is wet or dry.\n",
]

PREDICTION_TEST_CODE = [
    "# Predict wet vs dry on new test images\n",
    "import os, glob\n",
    "import torch\n",
    "from PIL import Image\n",
    "from torchvision import transforms\n",
    "import matplotlib.pyplot as plt\n",
    "\n",
    "model.load_state_dict(torch.load(model_save, map_location=DEVICE))\n",
    "model.eval()\n",
    "\n",
    "test_tf = transforms.Compose([\n",
    "    transforms.Resize((224, 224)),\n",
    "    transforms.ToTensor(),\n",
    "    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),\n",
    "])\n",
    "\n",
    'TEST_DIR = "test_images"\n',
    "if not os.path.exists(TEST_DIR):\n",
    "    os.makedirs(TEST_DIR, exist_ok=True)\n",
    "    print(f\"Created '{TEST_DIR}/' folder. Add test images there and re-run.\")\n",
    "else:\n",
    '    test_files = sorted(glob.glob(f"{TEST_DIR}/*.jpg") +\n',
    '                        glob.glob(f"{TEST_DIR}/*.png") +\n',
    '                        glob.glob(f"{TEST_DIR}/*.jpeg"))\n',
    "    if len(test_files) == 0:\n",
    "        print(f\"No images in '{TEST_DIR}/'. Add .jpg/.png files and re-run.\")\n",
    "    else:\n",
    '        print(f"Testing {len(test_files)} images...")\n',
    "        print(f\"{'Image':30s} | {'Pred':6s} | {'Dry %':>7s} | {'Wet %':>7s}\")\n",
    '        print("-" * 62)\n',
    "        results = []\n",
    "        for fpath in test_files:\n",
    "            fname = os.path.basename(fpath)\n",
    '            img = Image.open(fpath).convert("RGB")\n',
    "            tensor = test_tf(img).unsqueeze(0).to(DEVICE)\n",
    "            with torch.no_grad():\n",
    "                out = model(tensor)\n",
    "                probs = torch.softmax(out, dim=1)[0]\n",
    "                dry_p, wet_p = probs[0].item(), probs[1].item()\n",
    '                pred = "WET" if wet_p > dry_p else "DRY"\n',
    "            results.append((fname, pred, dry_p, wet_p, img))\n",
    '            print(f"{fname:30s} | {pred:6s} | {dry_p:6.1%} | {wet_p:6.1%}")\n',
    "        # Show grid\n",
    "        n = len(results)\n",
    "        cols = min(4, n)\n",
    "        rows = (n + cols - 1) // cols\n",
    "        fig, axes = plt.subplots(rows, cols, figsize=(4*cols, 4*rows))\n",
    "        if rows == 1 and cols == 1:\n",
    "            axes = [[axes]]\n",
    "        elif rows == 1:\n",
    "            axes = [axes]\n",
    "        elif cols == 1:\n",
    "            axes = [[ax] for ax in axes]\n",
    "        for idx, (fname, pred, dry_p, wet_p, img) in enumerate(results):\n",
    "            r, c = idx // cols, idx % cols\n",
    "            axes[r][c].imshow(img)\n",
    '            c = "#2DD4BF" if pred == "WET" else "#EF4444"\n',
    '            axes[r][c].set_title(f"{pred} (wet={wet_p:.0%})", color=c, fontsize=12, fontweight="bold")\n',
    '            axes[r][c].axis("off")\n',
    "        for idx in range(n, rows*cols):\n",
    "            r, c = idx // cols, idx % cols\n",
    '            axes[r][c].axis("off")\n',
    '        plt.suptitle("Wudu Detector - Test Predictions", fontsize=14, fontweight="bold")\n',
    "        plt.tight_layout()\n",
    "        plt.show()\n",
    '        wet_n = sum(1 for _, p, _, _, _ in results if p == "WET")\n',
    "        dry_n = len(results) - wet_n\n",
    '        print(f"\\nSummary: {wet_n} wet, {dry_n} dry out of {len(results)} images")\n',
]

for name in ["fajrguard_wudu_dataset.ipynb", "fajrguard_wudu_kaggle.ipynb"]:
    with open(name, "r", encoding="utf-8") as f:
        nb = json.load(f)

    # Update Cell 2b
    for c in nb["cells"]:
        src = "".join(c["source"])
        if (
            "REAL_WET_SOURCE" in src
            and "kagglehub" not in src
            and "real-wet-faces" not in src
        ):
            c["source"] = NEW_2B_CODE
            print(f"{name}: updated Cell 2b with Kaggle dataset")
            break

    # Insert prediction test cell after evaluation (Cell 11)
    inserted = False
    for i, c in enumerate(nb["cells"]):
        src = "".join(c["source"])
        if "roc_auc_score" in src and "classification_report" in src:
            # Check next cell isn't already prediction test
            already = False
            if i + 1 < len(nb["cells"]):
                next_src = "".join(nb["cells"][i + 1]["source"])
                if "test_images" in next_src:
                    already = True
            if not already:
                md = {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": PREDICTION_TEST_MD,
                }
                code = {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": PREDICTION_TEST_CODE,
                }
                nb["cells"].insert(i + 1, md)
                nb["cells"].insert(i + 2, code)
                print(f"{name}: inserted prediction test cell (Cell 11b)")
            else:
                print(f"{name}: prediction test cell already present")
            inserted = True
            break

    if not inserted:
        print(f"{name}: WARNING - evaluation cell not found")

    with open(name, "w", encoding="utf-8") as f:
        json.dump(nb, f, indent=1, ensure_ascii=False)

print("Done")
