import json, sys

def fix_notebook(path, is_colab):
    with open(path, 'r', encoding='utf-8') as f:
        nb = json.load(f)

    cells = nb['cells']
    fixes_applied = []

    for i, cell in enumerate(cells):
        if cell['cell_type'] != 'code':
            continue
        src = cell['source']

        # ─── FIX 1: Split Cell 4 single-string source into multi-line ─────────
        if len(src) == 1 and 'generate_wet_face' in src[0] and 'def ' in src[0]:
            old_text = src[0]
            lines = old_text.split('\n')
            new_src = [line + '\n' for line in lines[:-1]]
            if lines[-1]:
                new_src.append(lines[-1] + '\n')
            cell['source'] = new_src
            fixes_applied.append(f"FIX 1: Cell {i} — split single-string source into {len(new_src)} lines")

        # ─── FIX 2: Remove unused PIL imports from Cell 4 ──────────────────────
        if len(src) > 1 and 'from PIL import Image' in ''.join(src):
            new_src = []
            for line in src:
                if 'ImageFilter' in line or 'ImageEnhance' in line or 'ImageDraw' in line:
                    if 'from PIL import Image' in line:
                        new_src.append('from PIL import Image\n')
                        fixes_applied.append(f"FIX 2: Cell {i} — removed unused PIL imports (kept Image only)")
                    continue
                new_src.append(line)
            cell['source'] = new_src

        # ─── FIX 3: Add PyTorch→ONNX export step (Cell 10, first code cell) ───
        if len(src) > 1 and 'onnx' in ''.join(src) and 'subprocess.run' in ''.join(src):
            # This is the Cell 10 setup cell — add ONNX export after imports
            onnx_export_lines = [
                '\n',
                '# Step 1: PyTorch → ONNX\n',
                'print("Exporting PyTorch → ONNX...")\n',
                'model.eval()\n',
                'onnx_path = f"{OUTPUT_DIR}/../wudu_detector.onnx"\n',
                'dummy_input = torch.randn(1, 3, 224, 224).to(DEVICE)\n',
                'torch.onnx.export(\n',
                '    model, dummy_input, onnx_path,\n',
                '    input_names=["input"],\n',
                '    output_names=["output"],\n',
                '    dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},\n',
                '    opset_version=12\n',
                ')\n',
                'print(f"✅ ONNX model: {onnx_path}")\n',
            ]
            cell['source'] = cell['source'] + onnx_export_lines
            fixes_applied.append(f"FIX 3: Cell {i} — added missing PyTorch→ONNX export step")

    # ─── FIX 4: Fix misleading comment in Colab Cell 2 ────────────────────────
    if is_colab:
        for cell in cells:
            if cell['cell_type'] == 'code':
                src = cell['source']
                if len(src) > 1 and 'CELEBA_DIR' in ''.join(src) and 'OUTPUT_DIR' in ''.join(src):
                    new_src = []
                    for line in src:
                        if 'overridden by kagglehub cell above' in line:
                            line = line.replace('cell above', 'cell below')
                            fixes_applied.append("FIX 4: Colab Cell 2 — fixed misleading 'cell above' → 'cell below'")
                        new_src.append(line)
                    cell['source'] = new_src
                    break

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(nb, f, indent=1, ensure_ascii=False)

    return fixes_applied

# Fix both notebooks
print("=" * 60)
print("FIXING fajrguard_wudu_dataset.ipynb (Colab)")
print("=" * 60)
colab_fixes = fix_notebook('fajrguard_wudu_dataset.ipynb', is_colab=True)
for f in colab_fixes:
    print(f"  {f}")

print()
print("=" * 60)
print("FIXING fajrguard_wudu_kaggle.ipynb (Kaggle)")
print("=" * 60)
kaggle_fixes = fix_notebook('fajrguard_wudu_kaggle.ipynb', is_colab=False)
for f in kaggle_fixes:
    print(f"  {f}")

print()
print(f"✅ Done — {len(colab_fixes) + len(kaggle_fixes)} fixes applied across both notebooks")
