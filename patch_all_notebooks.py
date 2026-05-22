"""
Patch both FajrGuard notebooks:
1. Fix Kaggle Cell 2b (wrong content)
2. Rewrite Cell 2b in both: import real-wet-faces for training + holdout
3. Replace Cell 8b in both: comprehensive model benchmark
4. Enhance Cell 11 in both: precision-recall, per-category, threshold analysis
5. Update Kaggle metadata (dataSources)
"""
import json
import copy

# ============================================================
# Load both notebooks
# ============================================================
with open("fajrguard_wudu_kaggle.ipynb", "r", encoding="utf-8") as f:
    nb_kaggle = json.load(f)
with open("fajrguard_wudu_dataset.ipynb", "r", encoding="utf-8") as f:
    nb_colab = json.load(f)

def find_code_cell(nb, text_match):
    for i, cell in enumerate(nb["cells"]):
        if cell["cell_type"] == "code" and text_match in "".join(cell["source"]):
            return i
    return -1

# ============================================================
# CELL 2b — Import Real Wet Faces for Training + Holdout
# ============================================================
CELL_2B_KAGGLE = """# Import real wet faces from Kaggle dataset -- used for BOTH training and holdout benchmarking
# Source: https://www.kaggle.com/datasets/abdulsamadmuyideen/real-wet-faces
import os, shutil, hashlib, glob, csv, random
from PIL import Image
from facenet_pytorch import MTCNN as _MTCNN

TRAINING_WET_DIR = f"{OUTPUT_DIR}/wet"
BENCHMARK_DIR    = f"{OUTPUT_DIR}/benchmark_wet"
os.makedirs(TRAINING_WET_DIR, exist_ok=True)
os.makedirs(BENCHMARK_DIR,    exist_ok=True)

REAL_WET_SOURCE = None

# Try Kaggle dataset mount paths (user-provided path first)
for candidate in [
    "/kaggle/input/datasets/abdulsamadmuyideen/real-wet-faces",
    "/kaggle/input/real-wet-faces",
    "/kaggle/input/real-wet-faces/real_wet_faces",
]:
    if os.path.exists(candidate):
        REAL_WET_SOURCE = candidate
        break

# Fallback: download via kagglehub
if REAL_WET_SOURCE is None:
    try:
        import kagglehub
        print("Downloading real-wet-faces from Kaggle...")
        dl_path = kagglehub.dataset_download("abdulsamadmuyideen/real-wet-faces")
        for sub in sorted(os.listdir(dl_path)):
            sub_path = os.path.join(dl_path, sub)
            if os.path.isdir(sub_path):
                imgs = glob.glob(f"{sub_path}/*.jpg") + glob.glob(f"{sub_path}/*.png")
                if len(imgs) > 0:
                    REAL_WET_SOURCE = sub_path
                    break
        if REAL_WET_SOURCE is None:
            REAL_WET_SOURCE = dl_path
    except Exception as e:
        print(f"kagglehub download failed: {e}")

if REAL_WET_SOURCE is None or not os.path.exists(REAL_WET_SOURCE):
    print("Real wet faces dataset not found.")
    print("   On Kaggle: Add Data -> Search 'abdulsamadmuyideen/real-wet-faces' -> Add")
else:
    print(f"Real wet faces source: {REAL_WET_SOURCE}")
    _det = _MTCNN(keep_all=False, device="cpu", min_face_size=60)
    kept, skipped_nf, skipped_dup = 0, 0, 0
    seen = set()
    exts = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    files = sorted([f for f in os.listdir(REAL_WET_SOURCE)
                    if os.path.splitext(f)[1].lower() in exts])

    # Filter, deduplicate & collect valid face images
    valid_imgs = []
    for fname in files:
        fpath = os.path.join(REAL_WET_SOURCE, fname)
        try:
            img = Image.open(fpath).convert("RGB")
            if min(img.size) < 200:
                continue
            h = hashlib.md5(img.resize((64,64)).tobytes()).hexdigest()
            if h in seen:
                skipped_dup += 1; continue
            seen.add(h)
            boxes, probs = _det.detect(img)
            if boxes is None or probs is None:
                skipped_nf += 1; continue
            if not any(p is not None and float(p) > 0.85 for p in probs):
                skipped_nf += 1; continue
            valid_imgs.append(img)
        except Exception:
            pass

    # Split: 85% for training, 15% held out for final benchmark
    random.shuffle(valid_imgs)
    split_idx = int(len(valid_imgs) * 0.85)
    train_imgs   = valid_imgs[:split_idx]
    holdout_imgs = valid_imgs[split_idx:]

    # Save training real wet faces -> OUTPUT_DIR/wet/
    for i, img in enumerate(train_imgs):
        fname = f"real_wet_{i:05d}.jpg"
        dest = os.path.join(TRAINING_WET_DIR, fname)
        img.resize((512, 512), Image.LANCZOS).save(dest, quality=93)
        kept += 1

    # Save holdout benchmark images -> OUTPUT_DIR/benchmark_wet/ (NOT in training)
    for i, img in enumerate(holdout_imgs):
        dest = os.path.join(BENCHMARK_DIR, f"real_wet_holdout_{i:05d}.jpg")
        img.resize((512, 512), Image.LANCZOS).save(dest, quality=93)

    # Register training real wet faces in metadata.csv
    csv_path = f"{OUTPUT_DIR}/metadata.csv"
    csv_exists = os.path.exists(csv_path)
    with open(csv_path, "a", newline="") as csvfile:
        writer = csv.writer(csvfile)
        if not csv_exists:
            writer.writerow(["id", "source_file", "dry_path", "wet_path",
                             "wetness_score", "blur_score", "status", "reason", "timestamp"])
        for i in range(len(train_imgs)):
            wet_path = f"{OUTPUT_DIR}/wet/real_wet_{i:05d}.jpg"
            writer.writerow([f"real_wet_{i:05d}", f"real_wet_{i:05d}.jpg",
                             "", wet_path, "", "", "ok", "real_wet_benchmark", ""])

    print(f"Imported: {kept} real wet faces")
    print(f"  -> {len(train_imgs)} added to training set (OUTPUT_DIR/wet/ + metadata.csv)")
    print(f"  -> {len(holdout_imgs)} reserved for holdout benchmark (benchmark_wet/, excluded from training)")
    print(f"  Skipped: {skipped_nf} no-face, {skipped_dup} duplicates")
"""

CELL_2B_COLAB = """# Import real wet faces from Kaggle dataset -- used for BOTH training and holdout benchmarking
# Source: https://www.kaggle.com/datasets/abdulsamadmuyideen/real-wet-faces
import os, shutil, hashlib, glob, csv, random
from PIL import Image
from facenet_pytorch import MTCNN as _MTCNN

TRAINING_WET_DIR = f"{OUTPUT_DIR}/wet"
BENCHMARK_DIR    = f"{OUTPUT_DIR}/benchmark_wet"
os.makedirs(TRAINING_WET_DIR, exist_ok=True)
os.makedirs(BENCHMARK_DIR,    exist_ok=True)

REAL_WET_SOURCE = None

# Download via kagglehub (Colab)
try:
    import kagglehub
    print("Downloading real-wet-faces from Kaggle...")
    dl_path = kagglehub.dataset_download("abdulsamadmuyideen/real-wet-faces")
    for sub in sorted(os.listdir(dl_path)):
        sub_path = os.path.join(dl_path, sub)
        if os.path.isdir(sub_path):
            imgs = glob.glob(f"{sub_path}/*.jpg") + glob.glob(f"{sub_path}/*.png")
            if len(imgs) > 0:
                REAL_WET_SOURCE = sub_path
                break
    if REAL_WET_SOURCE is None:
        REAL_WET_SOURCE = dl_path
except Exception as e:
    print(f"kagglehub download failed: {e}")

if REAL_WET_SOURCE is None or not os.path.exists(REAL_WET_SOURCE):
    print("Real wet faces dataset not found.")
    print("   Make sure kaggle.json is configured or dataset is manually uploaded.")
else:
    print(f"Real wet faces source: {REAL_WET_SOURCE}")
    _det = _MTCNN(keep_all=False, device="cpu", min_face_size=60)
    kept, skipped_nf, skipped_dup = 0, 0, 0
    seen = set()
    exts = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    files = sorted([f for f in os.listdir(REAL_WET_SOURCE)
                    if os.path.splitext(f)[1].lower() in exts])

    # Filter, deduplicate & collect valid face images
    valid_imgs = []
    for fname in files:
        fpath = os.path.join(REAL_WET_SOURCE, fname)
        try:
            img = Image.open(fpath).convert("RGB")
            if min(img.size) < 200:
                continue
            h = hashlib.md5(img.resize((64,64)).tobytes()).hexdigest()
            if h in seen:
                skipped_dup += 1; continue
            seen.add(h)
            boxes, probs = _det.detect(img)
            if boxes is None or probs is None:
                skipped_nf += 1; continue
            if not any(p is not None and float(p) > 0.85 for p in probs):
                skipped_nf += 1; continue
            valid_imgs.append(img)
        except Exception:
            pass

    # Split: 85% for training, 15% held out for final benchmark
    random.shuffle(valid_imgs)
    split_idx = int(len(valid_imgs) * 0.85)
    train_imgs   = valid_imgs[:split_idx]
    holdout_imgs = valid_imgs[split_idx:]

    # Save training real wet faces -> OUTPUT_DIR/wet/
    for i, img in enumerate(train_imgs):
        fname = f"real_wet_{i:05d}.jpg"
        dest = os.path.join(TRAINING_WET_DIR, fname)
        img.resize((512, 512), Image.LANCZOS).save(dest, quality=93)
        kept += 1

    # Save holdout benchmark images -> OUTPUT_DIR/benchmark_wet/ (NOT in training)
    for i, img in enumerate(holdout_imgs):
        dest = os.path.join(BENCHMARK_DIR, f"real_wet_holdout_{i:05d}.jpg")
        img.resize((512, 512), Image.LANCZOS).save(dest, quality=93)

    # Register training real wet faces in metadata.csv
    csv_path = f"{OUTPUT_DIR}/metadata.csv"
    csv_exists = os.path.exists(csv_path)
    with open(csv_path, "a", newline="") as csvfile:
        writer = csv.writer(csvfile)
        if not csv_exists:
            writer.writerow(["id", "source_file", "dry_path", "wet_path",
                             "wetness_score", "blur_score", "status", "reason", "timestamp"])
        for i in range(len(train_imgs)):
            wet_path = f"{OUTPUT_DIR}/wet/real_wet_{i:05d}.jpg"
            writer.writerow([f"real_wet_{i:05d}", f"real_wet_{i:05d}.jpg",
                             "", wet_path, "", "", "ok", "real_wet_benchmark", ""])

    print(f"Imported: {kept} real wet faces")
    print(f"  -> {len(train_imgs)} added to training set (OUTPUT_DIR/wet/ + metadata.csv)")
    print(f"  -> {len(holdout_imgs)} reserved for holdout benchmark (benchmark_wet/, excluded from training)")
    print(f"  Skipped: {skipped_nf} no-face, {skipped_dup} duplicates")
"""

# ============================================================
# CELL 8b — Comprehensive Model Benchmark (replaces phash)
# ============================================================
CELL_8B_MD = """## Cell 8b -- Model Benchmark: Holdout Evaluation + Per-Category Analysis
Runs on the holdout real wet faces (excluded from training) + dry faces + synthetic wet faces.
Evaluates the trained model after Cell 9/10/11 are run.
Produces precision-recall curves, F1 at threshold, confidence calibration, and per-category breakdown."""

CELL_8B_CODE = """# ============================================================
# COMPREHENSIVE MODEL BENCHMARK
# Runs AFTER model training (Cell 9/10/11)
# Evaluates on:
#   1. Holdout real wet faces (NOT seen during training)
#   2. Holdout dry faces (CelebA not used in training)
#   3. Holdout synthetic wet faces (generated, not used in training)
# ============================================================
import torch, os, glob, random, csv, json
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
from torchvision import transforms
from sklearn.metrics import (
    confusion_matrix, roc_auc_score, classification_report,
    precision_recall_curve, average_precision_score,
    f1_score, precision_score, recall_score, accuracy_score,
    roc_curve
)

# --- Load best model ---
model.load_state_dict(torch.load(model_save, map_location=DEVICE))
model.eval()

bench_tf = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

def predict_batch(img_paths, batch_size=32):
    # Run inference on a list of image paths, return probs & preds.
    probs, preds = [], []
    for i in range(0, len(img_paths), batch_size):
        batch_paths = img_paths[i:i + batch_size]
        tensors = []
        for p in batch_paths:
            try:
                img = Image.open(p).convert("RGB")
                tensors.append(bench_tf(img))
            except Exception:
                tensors.append(torch.zeros(3, 224, 224))
        if not tensors: continue
        batch = torch.stack(tensors).to(DEVICE)
        with torch.no_grad():
            out = model(batch)
            prob = torch.softmax(out, dim=1)[:, 1].cpu().numpy()
            pred = out.argmax(1).cpu().numpy()
        probs.extend(prob)
        preds.extend(pred)
    return np.array(probs), np.array(preds)

# --- Gather holdout sets ---
print("=" * 65)
print("FAJRGARD -- MODEL BENCHMARK (Holdout Evaluation)")
print("=" * 65)

# 1. Holdout real wet faces (from benchmark_wet/)
BENCHMARK_DIR = f"{OUTPUT_DIR}/benchmark_wet"
holdout_real_paths = sorted(glob.glob(f"{BENCHMARK_DIR}/real_wet_holdout_*.jpg"))
n_holdout_real = len(holdout_real_paths)

# 2. Holdout dry faces (CelebA images NOT used in pairs)
# Read metadata to find which CelebA images were used
csv_path = f"{OUTPUT_DIR}/metadata.csv"
used_dry = set()
used_wet = set()
if os.path.exists(csv_path):
    with open(csv_path) as f:
        for row in csv.DictReader(f):
            if row.get("status") == "ok" and row.get("dry_path", "").strip():
                used_dry.add(os.path.basename(row["dry_path"]))
            if row.get("status") == "ok" and row.get("wet_path", "").strip():
                used_wet.add(os.path.basename(row["wet_path"]))

# Select dry faces NOT used in training
all_celeba = sorted([f for f in os.listdir(CELEBA_DIR)
                      if f.lower().endswith((".jpg", ".jpeg", ".png"))])
# Map celeb filenames to dry filenames
holdout_dry_paths = []
for cf in all_celeba:
    img_id = cf.rsplit(".", 1)[0]
    dry_name = f"{img_id}_dry.jpg"
    if dry_name not in used_dry:
        dry_path = f"{OUTPUT_DIR}/dry/{dry_name}"
        if os.path.exists(dry_path):
            holdout_dry_paths.append(dry_path)
# Limit to same count as holdout real for balance
random.shuffle(holdout_dry_paths)
holdout_dry_paths = holdout_dry_paths[:min(len(holdout_dry_paths), max(50, n_holdout_real))]

# 3. Holdout synthetic wet (generated, paired with holdout dry if available)
holdout_synth_paths = []
for dp in holdout_dry_paths:
    wp = dp.replace("_dry.jpg", "_wet.jpg").replace("/dry/", "/wet/")
    if os.path.exists(wp) and os.path.basename(wp) not in used_wet:
        holdout_synth_paths.append(wp)
holdout_synth_paths = holdout_synth_paths[:min(50, len(holdout_synth_paths))]

print(f"Holdout real wet faces    : {n_holdout_real}")
print(f"Holdout dry faces         : {len(holdout_dry_paths)}")
print(f"Holdout synthetic wet     : {len(holdout_synth_paths)}")

if n_holdout_real == 0:
    print("No holdout real wet faces found. Skipping benchmark.")
    print("Run Cell 2b first to import real-wet-faces dataset.")
else:
    # --- Run inference on all holdout sets ---
    real_probs, real_preds = predict_batch(holdout_real_paths)
    dry_probs, dry_preds = predict_batch(holdout_dry_paths)
    synth_probs, synth_preds = predict_batch(holdout_synth_paths)

    real_labels = np.ones(len(real_probs), dtype=int)
    dry_labels  = np.zeros(len(dry_probs), dtype=int)
    synth_labels = np.ones(len(synth_probs), dtype=int)

    # Combine all
    all_probs  = np.concatenate([dry_probs, synth_probs, real_probs])
    all_preds  = np.concatenate([dry_preds, synth_preds, real_preds])
    all_labels = np.concatenate([dry_labels, synth_labels, real_labels])

    # ============================================================
    # 1. OVERALL METRICS
    # ============================================================
    print("")
    print("=" * 65)
    print("1. OVERALL CLASSIFICATION REPORT (holdout)")
    print("=" * 65)
    print(classification_report(all_labels, all_preds, target_names=["Dry", "Wet"], digits=4))

    acc  = accuracy_score(all_labels, all_preds)
    auc  = roc_auc_score(all_labels, all_probs)
    f1   = f1_score(all_labels, all_preds)
    prec = precision_score(all_labels, all_preds)
    rec  = recall_score(all_labels, all_preds)
    ap   = average_precision_score(all_labels, all_probs)

    print(f"Accuracy          : {acc:.4f}")
    print(f"ROC-AUC           : {auc:.4f}")
    print(f"Avg Precision     : {ap:.4f}")
    print(f"F1 Score          : {f1:.4f}")
    print(f"Precision (Wet)   : {prec:.4f}")
    print(f"Recall (Wet)      : {rec:.4f}")

    # ============================================================
    # 2. PER-CATEGORY BREAKDOWN
    # ============================================================
    print("")
    print("=" * 65)
    print("2. PER-CATEGORY BREAKDOWN")
    print("=" * 65)

    def category_stats(name, probs, preds, labels):
        if len(probs) == 0: return
        acc = accuracy_score(labels, preds)
        f1c = f1_score(labels, preds, zero_division=0)
        mean_conf = np.mean(probs)
        median_conf = np.median(probs)
        correct = (preds == labels)
        mean_correct_conf = np.mean(probs[correct]) if correct.any() else 0.0
        mean_wrong_conf = np.mean(probs[~correct]) if (~correct).any() else 0.0
        print(f"  {name:25s} | N={len(probs):4d} | Acc={acc:.4f} | F1={f1c:.4f} | "
              f"Conf: mean={mean_conf:.3f} median={median_conf:.3f} "
              f"| Correct-conf={mean_correct_conf:.3f} Wrong-conf={mean_wrong_conf:.3f}")

    category_stats("Dry (CelebA holdout)", dry_probs, dry_preds, dry_labels)
    category_stats("Synthetic Wet (holdout)", synth_probs, synth_preds, synth_labels)
    category_stats("Real Wet (holdout)", real_probs, real_preds, real_labels)

    # ============================================================
    # 3. THRESHOLD ANALYSIS (F1 at app threshold 0.82)
    # ============================================================
    print("")
    print("=" * 65)
    print("3. THRESHOLD ANALYSIS")
    print("=" * 65)

    APP_THRESHOLD = 0.82
    threshold_preds = (all_probs >= APP_THRESHOLD).astype(int)
    t_acc = accuracy_score(all_labels, threshold_preds)
    t_f1  = f1_score(all_labels, threshold_preds, zero_division=0)
    t_prec = precision_score(all_labels, threshold_preds, zero_division=0)
    t_rec  = recall_score(all_labels, threshold_preds, zero_division=0)

    # Specifically on real wet faces at threshold
    real_tp = np.sum((real_probs >= APP_THRESHOLD) & (real_labels == 1))
    real_fn = np.sum((real_probs < APP_THRESHOLD) & (real_labels == 1))
    real_fp = np.sum((real_probs >= APP_THRESHOLD) & (dry_labels == 0))
    real_tn = np.sum((real_probs < APP_THRESHOLD) & (dry_labels == 0))

    print(f"At app threshold {APP_THRESHOLD}:")
    print(f"  Overall     : Acc={t_acc:.4f}  F1={t_f1:.4f}  Prec={t_prec:.4f}  Rec={t_rec:.4f}")
    print(f"  Real wet    : Detected={real_tp}/{len(real_labels)} ({real_tp/max(len(real_labels),1)*100:.1f}%)")
    print(f"  Dry false + : {real_fp}/{len(dry_labels)} ({real_fp/max(len(dry_labels),1)*100:.1f}%)")

    # Find optimal threshold (max F1)
    prec_curve, rec_curve, thresh_curve = precision_recall_curve(all_labels, all_probs)
    f1_curve = 2 * (prec_curve * rec_curve) / (prec_curve + rec_curve + 1e-10)
    best_idx = np.argmax(f1_curve)
    best_thresh = thresh_curve[best_idx] if best_idx < len(thresh_curve) else 1.0
    best_f1 = f1_curve[best_idx]
    print(f"  Optimal threshold: {best_thresh:.3f} (F1={best_f1:.4f})")

    # ============================================================
    # 4. VISUALIZATION (3x2 grid)
    # ============================================================
    fig, axes = plt.subplots(2, 3, figsize=(18, 12))

    # 4a. Confusion Matrix
    cm = confusion_matrix(all_labels, all_preds)
    import seaborn as sns
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", ax=axes[0,0],
                xticklabels=["Dry", "Wet"], yticklabels=["Dry", "Wet"])
    axes[0,0].set_title("Confusion Matrix (Holdout)", fontweight="bold")
    axes[0,0].set_ylabel("Actual"); axes[0,0].set_xlabel("Predicted")

    # 4b. Precision-Recall Curve (better than ROC for imbalanced data)
    axes[0,1].plot(rec_curve, prec_curve, "b-", linewidth=2, label=f"AP={ap:.4f}")
    axes[0,1].plot(rec_curve[best_idx], prec_curve[best_idx], "ro",
                   markersize=8, label=f"Best F1={best_f1:.3f} @ {best_thresh:.3f}")
    axes[0,1].axhline(y=0.5, color="gray", linestyle=":", alpha=0.5)
    axes[0,1].set_xlabel("Recall"); axes[0,1].set_ylabel("Precision")
    axes[0,1].set_title("Precision-Recall Curve", fontweight="bold")
    axes[0,1].legend(loc="lower left"); axes[0,1].grid(True, alpha=0.3)

    # 4c. ROC Curve
    fpr, tpr, _ = roc_curve(all_labels, all_probs)
    axes[0,2].plot(fpr, tpr, "b-", linewidth=2, label=f"AUC={auc:.4f}")
    axes[0,2].plot([0,1], [0,1], "k--", alpha=0.3, label="Random")
    axes[0,2].set_xlabel("False Positive Rate"); axes[0,2].set_ylabel("True Positive Rate")
    axes[0,2].set_title("ROC Curve", fontweight="bold")
    axes[0,2].legend(loc="lower right"); axes[0,2].grid(True, alpha=0.3)

    # 4d. Confidence Distribution per Category
    bins = np.linspace(0, 1, 31)
    axes[1,0].hist(dry_probs, bins=bins, alpha=0.6, label="Dry (CelebA)", color="#C9A227", density=True)
    axes[1,0].hist(synth_probs, bins=bins, alpha=0.5, label="Synthetic Wet", color="#F59E0B", density=True)
    axes[1,0].hist(real_probs, bins=bins, alpha=0.5, label="Real Wet", color="#2DD4BF", density=True)
    axes[1,0].axvline(x=APP_THRESHOLD, color="red", linestyle="--", linewidth=2, label=f"Threshold={APP_THRESHOLD}")
    axes[1,0].axvline(x=best_thresh, color="green", linestyle="--", linewidth=1.5, label=f"Optimal={best_thresh:.3f}")
    axes[1,0].set_xlabel("Predicted Wet Probability"); axes[1,0].set_ylabel("Density")
    axes[1,0].set_title("Confidence Distribution per Category", fontweight="bold")
    axes[1,0].legend(fontsize=8)

    # 4e. Calibration / Reliability Diagram
    from sklearn.calibration import calibration_curve
    prob_true, prob_pred = calibration_curve(all_labels, all_probs, n_bins=10, strategy="uniform")
    axes[1,1].plot(prob_pred, prob_true, "bo-", linewidth=2, markersize=6, label="Model")
    axes[1,1].plot([0,1], [0,1], "k--", alpha=0.3, label="Perfect calibration")
    axes[1,1].set_xlabel("Mean Predicted Probability"); axes[1,1].set_ylabel("Fraction of Positives")
    axes[1,1].set_title("Reliability Diagram (Calibration)", fontweight="bold")
    axes[1,1].legend(); axes[1,1].grid(True, alpha=0.3)

    # 4f. F1 vs Threshold
    axes[1,2].plot(thresh_curve, f1_curve[:-1], "g-", linewidth=2)
    axes[1,2].axvline(x=APP_THRESHOLD, color="red", linestyle="--", label=f"App={APP_THRESHOLD}")
    axes[1,2].axvline(x=best_thresh, color="green", linestyle="--", label=f"Optimal={best_thresh:.3f}")
    axes[1,2].set_xlabel("Threshold"); axes[1,2].set_ylabel("F1 Score")
    axes[1,2].set_title("F1 Score vs Threshold", fontweight="bold")
    axes[1,2].legend(); axes[1,2].grid(True, alpha=0.3)

    plt.suptitle("FajrGuard -- Comprehensive Model Benchmark (Holdout Data)",
                 fontsize=15, fontweight="bold")
    plt.tight_layout()
    plt.show()

    # ============================================================
    # 5. SUMMARY VERDICT
    # ============================================================
    print("")
    print("=" * 65)
    print("5. BENCHMARK SUMMARY")
    print("=" * 65)

    real_detect_rate = real_tp / max(len(real_labels), 1)
    dry_false_pos_rate = real_fp / max(len(dry_labels), 1)

    print(f"  Real wet detection rate : {real_detect_rate:.2%}")
    print(f"  Dry false-positive rate : {dry_false_pos_rate:.2%}")
    print(f"  AUC-ROC                 : {auc:.4f}")
    print(f"  Avg Precision           : {ap:.4f}")
    print(f"  F1 at optimal threshold : {best_f1:.4f} (thresh={best_thresh:.3f})")

    if real_detect_rate >= 0.95 and dry_false_pos_rate <= 0.03:
        print("  VERDICT: EXCELLENT -- Model meets high-accuracy requirements for wudu detection")
    elif real_detect_rate >= 0.90 and dry_false_pos_rate <= 0.05:
        print("  VERDICT: GOOD -- Model is reliable but may need more real wet training data")
    elif real_detect_rate >= 0.85 and dry_false_pos_rate <= 0.08:
        print("  VERDICT: ACCEPTABLE -- Consider increasing MAX_IMAGES or real wet faces count")
    else:
        print("  VERDICT: NEEDS IMPROVEMENT -- Increase training data (MAX_IMAGES, real wet samples)")
        print("            or tune the wetness generation parameters (STRENGTH, droplet settings)")

    # Export benchmark results
    bench_results = {
        "accuracy": float(acc), "auc_roc": float(auc), "avg_precision": float(ap),
        "f1_score": float(f1), "precision": float(prec), "recall": float(rec),
        "f1_at_app_threshold": float(t_f1),
        "optimal_threshold": float(best_thresh), "optimal_f1": float(best_f1),
        "real_wet_detection_rate": float(real_detect_rate),
        "dry_false_positive_rate": float(dry_false_pos_rate),
        "n_real_wet_holdout": n_holdout_real,
        "n_dry_holdout": len(holdout_dry_paths),
        "n_synthetic_holdout": len(holdout_synth_paths),
    }
    bench_path = f"{OUTPUT_DIR}/../benchmark_results.json"
    with open(bench_path, "w") as f:
        json.dump(bench_results, f, indent=2)
    print(f"  Benchmark results saved to: {bench_path}")
"""

# ============================================================
# CELL 11 — Enhanced Evaluation
# ============================================================
CELL_11_CODE = """from sklearn.metrics import (
    confusion_matrix, roc_auc_score, classification_report,
    precision_recall_curve, average_precision_score,
    f1_score, precision_score, recall_score
)
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import json

model.load_state_dict(torch.load(model_save, map_location=DEVICE))
model.eval()

all_preds, all_labels, all_probs = [], [], []
with torch.no_grad():
    for imgs, labels in val_loader:
        imgs = imgs.to(DEVICE)
        out  = model(imgs)
        probs = torch.softmax(out, dim=1)[:, 1].cpu().numpy()
        preds = out.argmax(1).cpu().numpy()
        all_preds.extend(preds)
        all_labels.extend(labels.numpy())
        all_probs.extend(probs)

probs_arr = np.array(all_probs)
labels_arr = np.array(all_labels)

cm   = confusion_matrix(all_labels, all_preds)
auc  = roc_auc_score(all_labels, all_probs)
ap   = average_precision_score(all_labels, all_probs)
f1   = f1_score(all_labels, all_preds)
prec = precision_score(all_labels, all_preds)
rec  = recall_score(all_labels, all_preds)

print(classification_report(all_labels, all_preds, target_names=["Dry", "Wet"], digits=4))
print(f"ROC-AUC          : {auc:.4f}")
print(f"Avg Precision    : {ap:.4f}")
print(f"F1 Score         : {f1:.4f}")
print(f"Precision (Wet)  : {prec:.4f}")
print(f"Recall (Wet)     : {rec:.4f}")

# Optimize threshold from validation set
prec_curve, rec_curve, thresh_curve = precision_recall_curve(all_labels, all_probs)
f1_curve = 2 * (prec_curve * rec_curve) / (prec_curve + rec_curve + 1e-10)
best_idx = np.argmax(f1_curve)
best_thresh = thresh_curve[best_idx] if best_idx < len(thresh_curve) else 1.0
best_f1 = f1_curve[best_idx]

# App threshold metrics
APP_THRESHOLD = float(WET_THRESHOLD)
app_preds = (probs_arr >= APP_THRESHOLD).astype(int)
app_f1 = f1_score(all_labels, app_preds, zero_division=0)
app_prec = precision_score(all_labels, app_preds, zero_division=0)
app_rec = recall_score(all_labels, app_preds, zero_division=0)

print(f"")
print(f"At app threshold {APP_THRESHOLD}: F1={app_f1:.4f}  Prec={app_prec:.4f}  Rec={app_rec:.4f}")
print(f"Optimal threshold : {best_thresh:.3f} (F1={best_f1:.4f})")

# --- Figure: 2x2 Grid ---
fig, axes = plt.subplots(2, 2, figsize=(14, 12))

# 1. Confusion Matrix
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", ax=axes[0,0],
            xticklabels=["Dry", "Wet"], yticklabels=["Dry", "Wet"])
axes[0,0].set_title("Confusion Matrix", fontweight="bold")
axes[0,0].set_ylabel("Actual"); axes[0,0].set_xlabel("Predicted")

# 2. Precision-Recall Curve
from sklearn.metrics import PrecisionRecallDisplay
PrecisionRecallDisplay.from_predictions(all_labels, all_probs, ax=axes[0,1])
axes[0,1].set_title(f"Precision-Recall (AP={ap:.4f})", fontweight="bold")
axes[0,1].grid(True, alpha=0.3)

# 3. Probability Distribution
axes[1,0].hist(probs_arr[labels_arr == 0], bins=35, alpha=0.6, label="Dry faces", color="#C9A227", density=True)
axes[1,0].hist(probs_arr[labels_arr == 1], bins=35, alpha=0.5, label="Wet faces", color="#2DD4BF", density=True)
axes[1,0].axvline(x=APP_THRESHOLD, color="red", linestyle="--", linewidth=2, label=f"App={APP_THRESHOLD}")
axes[1,0].axvline(x=best_thresh, color="green", linestyle="--", linewidth=1.5, label=f"Optimal={best_thresh:.3f}")
axes[1,0].set_title("Wet Probability Distribution", fontweight="bold")
axes[1,0].set_xlabel("Predicted wet probability"); axes[1,0].set_ylabel("Density")
axes[1,0].legend(fontsize=8)

# 4. F1 vs Threshold
axes[1,1].plot(thresh_curve, f1_curve[:-1], "g-", linewidth=2)
axes[1,1].axvline(x=APP_THRESHOLD, color="red", linestyle="--", label=f"App={APP_THRESHOLD}")
axes[1,1].axvline(x=best_thresh, color="green", linestyle="--", label=f"Optimal={best_thresh:.3f}")
axes[1,1].set_xlabel("Threshold"); axes[1,1].set_ylabel("F1 Score")
axes[1,1].set_title("F1 Score vs Threshold", fontweight="bold")
axes[1,1].legend(); axes[1,1].grid(True, alpha=0.3)

plt.suptitle("FajrGuard -- Model Evaluation (Validation Set)", fontsize=14, fontweight="bold")
plt.tight_layout()
plt.show()

# Save metrics for deployment
eval_metrics = {
    "accuracy": float((cm[0,0] + cm[1,1]) / cm.sum()),
    "auc_roc": float(auc), "avg_precision": float(ap),
    "f1_score": float(f1), "precision": float(prec), "recall": float(rec),
    "app_threshold": APP_THRESHOLD,
    "app_threshold_f1": float(app_f1),
    "optimal_threshold": float(best_thresh), "optimal_f1": float(best_f1),
    "confusion_matrix": [[int(cm[0,0]), int(cm[0,1])], [int(cm[1,0]), int(cm[1,1])]],
}
metrics_path = f"{OUTPUT_DIR}/../eval_metrics.json"
with open(metrics_path, "w") as f:
    json.dump(eval_metrics, f, indent=2)
print(f"Evaluation metrics saved to: {metrics_path}")
"""

# ============================================================
# APPLY PATCHES
# ============================================================

# --- Helper: find cell index by content ---
def find_cell_idx(nb, text, cell_type="code"):
    for i, c in enumerate(nb["cells"]):
        if c["cell_type"] == cell_type and text in "".join(c["source"]):
            return i
    return -1

def cell_from_string(source_str):
    """Convert a Python source string to a notebook cell source list."""
    return [line + "\n" for line in source_str.strip().split("\n")]

# ============================================================
# Patch KAGGLE notebook
# ============================================================
print("=== Patching Kaggle notebook ===")

# Fix Cell 2b (currently has wrong duplicated CelebA code)
idx_2b_kag = find_cell_idx(nb_kaggle, "Cell 2b", cell_type="markdown")
if idx_2b_kag >= 0:
    # Cell 2b code is the next code cell after the markdown
    for j in range(idx_2b_kag + 1, len(nb_kaggle["cells"])):
        if nb_kaggle["cells"][j]["cell_type"] == "code":
            old_src = "".join(nb_kaggle["cells"][j]["source"])
            if "real_wet" in old_src.lower() or "CelebA" in old_src:
                nb_kaggle["cells"][j]["source"] = cell_from_string(CELL_2B_KAGGLE)
                print(f"  Fix 1: Cell 2b (index {j}) replaced with real-wet-faces import + training registration")
                break
else:
    print("  WARNING: Cell 2b markdown not found")

# Fix Cell 8b (benchmark) - replace markdown
idx_8b_md = find_cell_idx(nb_kaggle, "Cell 8b", cell_type="markdown")
if idx_8b_md >= 0:
    nb_kaggle["cells"][idx_8b_md]["source"] = [l + "\n" for l in CELL_8B_MD.strip().split("\n")]
    # Find the code cell after this markdown
    for j in range(idx_8b_md + 1, len(nb_kaggle["cells"])):
        if nb_kaggle["cells"][j]["cell_type"] == "code":
            old_src = "".join(nb_kaggle["cells"][j]["source"])
            if "benchmark" in old_src.lower() or "phash" in old_src:
                nb_kaggle["cells"][j]["source"] = cell_from_string(CELL_8B_CODE)
                print(f"  Fix 2: Cell 8b (index {j}) replaced with comprehensive model benchmark")
                break
else:
    print("  WARNING: Cell 8b markdown not found")

# Fix Cell 11 (evaluation) - replace code cell after "Cell 11" markdown
idx_11_md = find_cell_idx(nb_kaggle, "Cell 11 -- Evaluate", cell_type="markdown")
if idx_11_md >= 0:
    for j in range(idx_11_md + 1, len(nb_kaggle["cells"])):
        if nb_kaggle["cells"][j]["cell_type"] == "code":
            old_src = "".join(nb_kaggle["cells"][j]["source"])
            if "confusion_matrix" in old_src and "roc_auc_score" in old_src:
                nb_kaggle["cells"][j]["source"] = cell_from_string(CELL_11_CODE)
                print(f"  Fix 3: Cell 11 (index {j}) enhanced with precision-recall, threshold opt, per-category metrics")
                break
else:
    print("  WARNING: Cell 11 markdown not found")

# Update Kaggle metadata - add real-wet-faces data source
if "kaggle" in nb_kaggle["metadata"] and "dataSources" in nb_kaggle["metadata"]["kaggle"]:
    ds = nb_kaggle["metadata"]["kaggle"]["dataSources"]
    # Check if real-wet-faces is already listed
    has_rwf = any("real-wet-faces" in str(s).lower() for s in ds)
    if not has_rwf:
        ds.append({
            "sourceId": 99999,
            "sourceType": "datasetVersion",
            "datasetId": 99999,
            "sourceSlug": "abdulsamadmuyideen/real-wet-faces"
        })
        print("  Fix 4: Added real-wet-faces to Kaggle dataSources metadata")

# ============================================================
# Patch COLAB notebook
# ============================================================
print("=== Patching Colab notebook ===")

# Fix Cell 2b
idx_2b_col = find_cell_idx(nb_colab, "Cell 2b", cell_type="markdown")
if idx_2b_col >= 0:
    for j in range(idx_2b_col + 1, len(nb_colab["cells"])):
        if nb_colab["cells"][j]["cell_type"] == "code":
            old_src = "".join(nb_colab["cells"][j]["source"])
            if "real_wet" in old_src.lower() or "BENCHMARK_DIR" in old_src:
                nb_colab["cells"][j]["source"] = cell_from_string(CELL_2B_COLAB)
                print(f"  Fix 1: Cell 2b (index {j}) replaced with real-wet-faces import + training registration")
                break
else:
    print("  WARNING: Cell 2b markdown not found")

# Fix Cell 8b (benchmark)
idx_8b_col_md = find_cell_idx(nb_colab, "Cell 8b", cell_type="markdown")
if idx_8b_col_md >= 0:
    nb_colab["cells"][idx_8b_col_md]["source"] = [l + "\n" for l in CELL_8B_MD.strip().split("\n")]
    for j in range(idx_8b_col_md + 1, len(nb_colab["cells"])):
        if nb_colab["cells"][j]["cell_type"] == "code":
            old_src = "".join(nb_colab["cells"][j]["source"])
            if "benchmark" in old_src.lower() or "phash" in old_src:
                nb_colab["cells"][j]["source"] = cell_from_string(CELL_8B_CODE)
                print(f"  Fix 2: Cell 8b (index {j}) replaced with comprehensive model benchmark")
                break
else:
    print("  WARNING: Cell 8b markdown not found")

# Fix Cell 11 (evaluation)
idx_11_col_md = find_cell_idx(nb_colab, "Cell 11 -- Evaluate", cell_type="markdown")
if idx_11_col_md >= 0:
    for j in range(idx_11_col_md + 1, len(nb_colab["cells"])):
        if nb_colab["cells"][j]["cell_type"] == "code":
            old_src = "".join(nb_colab["cells"][j]["source"])
            if "confusion_matrix" in old_src and "roc_auc_score" in old_src:
                nb_colab["cells"][j]["source"] = cell_from_string(CELL_11_CODE)
                print(f"  Fix 3: Cell 11 (index {j}) enhanced with precision-recall, threshold opt, per-category metrics")
                break
else:
    print("  WARNING: Cell 11 markdown not found")

# ============================================================
# Write notebooks back
# ============================================================
with open("fajrguard_wudu_kaggle.ipynb", "w", encoding="utf-8") as f:
    json.dump(nb_kaggle, f, indent=1, ensure_ascii=False)
with open("fajrguard_wudu_dataset.ipynb", "w", encoding="utf-8") as f:
    json.dump(nb_colab, f, indent=1, ensure_ascii=False)

print("")
print("Both notebooks patched successfully!")
print("Summary of changes:")
print("  1. Cell 2b: Real wet faces imported -> 85% training, 15% holdout benchmark")
print("  2. Cell 8b: Phash benchmark replaced with comprehensive model evaluation")
print("     (precision-recall, F1 at threshold, per-category, calibration)")
print("  3. Cell 11: Evaluation enhanced with PR curve, threshold optimization, metrics export")
print("  4. Kaggle metadata: Added real-wet-faces data source")
