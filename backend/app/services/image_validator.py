from PIL import Image
import imagehash
from io import BytesIO

def validate_face_image(image_bytes: bytes) -> tuple[bool, str]:
    try:
        img = Image.open(BytesIO(image_bytes))
        width, height = img.size
        if width < 200 or height < 200:
            return False, f"Image too small ({width}x{height})"

        if img.mode != "RGB":
            img = img.convert("RGB")

        return True, "ok"
    except Exception as e:
        return False, str(e)

def compute_image_hash(image_bytes: bytes) -> str:
    img = Image.open(BytesIO(image_bytes))
    return str(imagehash.phash(img))
