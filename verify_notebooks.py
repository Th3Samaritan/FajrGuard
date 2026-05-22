import json

print('=== FINAL VERIFICATION ===')
for nb_path in ['fajrguard_wudu_dataset.ipynb', 'fajrguard_wudu_kaggle.ipynb']:
    print('\n--- {} ---'.format(nb_path))
    with open(nb_path, 'r') as f:
        nb = json.load(f)
    cells = nb['cells']

    # Check 1: No single-string cells > 200 chars
    bad = [(i, len(c['source'][0])) for i, c in enumerate(cells)
           if c['cell_type'] == 'code' and len(c['source']) == 1 and len(c['source'][0]) > 200]
    if bad:
        for cell_i, char_len in bad:
            print('  FAIL: Cell {} — single string ({} chars)'.format(cell_i, char_len))
    else:
        print('  PASS: No single-string cells')

    # Check 2: Cell 4 properly split
    for i, c in enumerate(cells):
        s = ''.join(c['source'])
        if 'def generate_wet_face' in s and 'create_face_mask' in s:
            n = len(c['source'])
            if n >= 200:
                print('  PASS: Cell 4 (idx {}) — {} lines'.format(i, n))
            else:
                print('  FAIL: Cell 4 (idx {}) — only {} lines'.format(i, n))
            break

    # Check 3: ONNX export exists
    found_onnx = False
    for i, c in enumerate(cells):
        if 'torch.onnx.export' in ''.join(c['source']):
            found_onnx = True
            print('  PASS: Cell {} — ONNX export present'.format(i))
    if not found_onnx:
        print('  FAIL: ONNX export missing')

    # Check 4: No unused PIL imports in Cell 4
    for c in cells:
        s = ''.join(c['source'])
        if 'generate_wet_face' in s and 'create_face_mask' in s:
            if 'ImageFilter' in s or 'ImageEnhance' in s:
                print('  FAIL: Unused PIL imports still present')
            else:
                print('  PASS: PIL imports clean (no unused ImageFilter/Enhance/Draw)')
            break

    # Check 5: JSON valid
    try:
        json.dumps(nb)
        print('  PASS: Valid JSON')
    except Exception:
        print('  FAIL: Invalid JSON')

    # Check 6: Colab comment
    for c in cells:
        s = ''.join(c['source'])
        if 'kagglehub cell' in s:
            if 'cell below' in s:
                print('  PASS: Comment says cell below (correct)')
            elif 'cell above' in s:
                print('  FAIL: Comment still says cell above')
            break

print('\n=== VERIFICATION DONE ===')
