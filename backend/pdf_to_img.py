import pymupdf
import os
import uuid
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


def convert_pdf(file_name: str, fmt: str, input_path: str, output_folder: str) -> str:
    """
    Convert a PDF to image(s). Returns path to the output file (image or zip).

    Bug fixes vs original:
    - doc is always closed, even when an exception is raised mid-render
    - intermediate page images are cleaned up if an exception occurs mid-zip
    - output zip/image paths include a uuid prefix to avoid collisions when
      multiple requests convert files with the same name concurrently
    - 0-page PDF guard (pymupdf.open succeeds but doc[0] would IndexError)
    """
    if fmt == "png":
        ext = ".png"
    else:
        ext = ".jpg"

    out_id = uuid.uuid4().hex
    doc = pymupdf.open(input_path)

    try:
        if len(doc) == 0:
            raise ValueError("PDF has no pages")

        mat = render_matrix(fmt)

        if len(doc) == 1:
            page = doc[0]
            pix = page.get_pixmap(matrix=mat)
            # uuid prefix avoids collision; caller strips it for the user-facing name
            save_path = f"{output_folder}/{out_id}_{file_name}{ext}"
            save_pixmap(pix, save_path, fmt)
            return save_path

        else:
            img_paths = []
            try:
                for i, page in enumerate(doc):
                    pix = page.get_pixmap(matrix=mat)
                    save_path = f"{output_folder}/{out_id}_{file_name}_page{i+1}{ext}"
                    save_pixmap(pix, save_path, fmt)
                    img_paths.append(save_path)

                zip_path = f"{output_folder}/{out_id}_{file_name}.zip"
                with zipfile.ZipFile(zip_path, "w") as zipf:
                    for p in img_paths:
                        # Strip the uuid prefix inside the zip so names are clean
                        zipf.write(p, os.path.basename(p).replace(f"{out_id}_", "", 1))
                return zip_path
            finally:
                # Always remove intermediate image files
                for p in img_paths:
                    try:
                        os.remove(p)
                    except OSError:
                        pass
    finally:
        doc.close()


if __name__ == "__main__":
    file_name = input("Enter PDF file name (without extension): ")
    fmt = input("Enter format (jpg / png): ").strip().lower()
    os.makedirs("outputs", exist_ok=True)
    result = convert_pdf(file_name, fmt, file_name + ".pdf", "outputs")
    print(f"Saved: {result}")
