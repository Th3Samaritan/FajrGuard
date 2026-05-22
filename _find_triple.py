lines = open(r"C:\Users\MAST\Documents\FajrGuard\patch_all_notebooks.py", "r").readlines()
for i, line in enumerate(lines):
    if '"""' in line:
        stripped = line.rstrip()
        print(f"Line {i+1}: {stripped[:120]}")
