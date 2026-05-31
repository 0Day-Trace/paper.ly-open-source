import pymupdf
import os
import zipfile

# PNG: lossless, full resolution (larger files, best for editing/archival)
PNG_DPI = 300
# JPG: half the pixel count of PNG + compression — good on screen, much smaller downloads
JPG_DPI = 150
# 82 = clear text/graphics without near-lossless bloat (PyMuPDF default 95 ≈ huge JPGs)
JPG_QUALITY = 82


def render_matrix(img_fmt: str) -> pymupdf.Matrix:
    dpi = PNG_DPI if img_fmt == "png" else JPG_DPI
    return pymupdf.Matrix(dpi / 72, dpi / 72)


def save_pixmap(pix, path: str, img_fmt: str) -> None:
    if img_fmt == "png":
        pix.save(path)
    else:
        pix.save(path, jpg_quality=JPG_QUALITY)


def convert_pdf(file_name, fmt, input_path, output_folder):
    if fmt == "png":
        ext = ".png"
    else:
        ext = ".jpg"

    doc = pymupdf.open(input_path)
    mat = render_matrix(fmt)

    if len(doc) == 1:
        page = doc[0]
        pix = page.get_pixmap(matrix=mat)
        save_path = f"{output_folder}/{file_name}{ext}"
        save_pixmap(pix, save_path, fmt)
        doc.close()
        return save_path

    else:
        zip_path = f"{output_folder}/{file_name}.zip"
        with zipfile.ZipFile(zip_path, "w") as zipf:
            for i, page in enumerate(doc):
                pix = page.get_pixmap(matrix=mat)
                save_path = f"{output_folder}/{file_name}_page{i+1}{ext}"
                save_pixmap(pix, save_path, fmt)
                zipf.write(save_path, os.path.basename(save_path))
                os.remove(save_path)
        doc.close()
        return zip_path

if __name__ == "__main__":
    file_name = input("Enter PDF file name (without extension): ")
    fmt = input("Enter format (jpg / png): ").strip().lower()
    os.makedirs("outputs", exist_ok=True)
    result = convert_pdf(file_name, fmt, file_name + ".pdf", "outputs")
    print(f"Saved: {result}")
