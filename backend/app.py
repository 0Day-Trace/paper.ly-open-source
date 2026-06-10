from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from pdf_to_img import convert_pdf, render_matrix, save_pixmap
from supabase_helper import upload_output, get_user_files, check_limits, check_count_limit, resolve_supabase_download
from pdftool_config import (
    public_config, USE_LOCAL_STORAGE,
    get_flask_upload_limit_mb, get_soffice_timeout, get_compress_presets,
    get_retention_hours,
)
from local_storage import resolve_download
import pymupdf
import os
import base64
import pikepdf
import zipfile
import json
import gc
import subprocess
import time
import shutil
import uuid
from io import BytesIO
import io
from werkzeug.utils import secure_filename


def safe_name(filename: str, default_ext: str = "") -> str:
    """
    secure_filename returns "" for non-ASCII names like "论文.pdf" or "رسالة.pdf".
    This wrapper falls back to a UUID-based name so callers always get something usable.
    """
    base = secure_filename(filename or "")
    if base:
        return base
    return f"file_{uuid.uuid4().hex}{default_ext}"

app = Flask(__name__)
# Restrict CORS to the configured frontend origin(s).
# Operators can set CORS_ORIGINS env var (comma-separated) or rely on the
# deployment.config.json apiBaseUrl as a safe default.
_cors_origins_env = os.environ.get("CORS_ORIGINS", "")
_cors_origins = [o.strip() for o in _cors_origins_env.split(",") if o.strip()] or "*"
CORS(app, origins=_cors_origins)
# Reject uploads larger than the configured limit at the Flask layer (before any processing).
# This returns a clean 413 instead of crashing the worker with OOM.
# Configure via deployment.config.json advanced.flaskUploadLimitMb or env FLASK_UPLOAD_LIMIT_MB.
app.config["MAX_CONTENT_LENGTH"] = get_flask_upload_limit_mb() * 1024 * 1024


@app.errorhandler(413)
def request_entity_too_large(e):
    limit_mb = get_flask_upload_limit_mb()
    return jsonify({"error": f"File too large. Maximum upload size is {limit_mb} MB."}), 413


UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "outputs"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)


def cleanup(*paths):
    """Delete temp files and force garbage collection."""
    for p in paths:
        try:
            if p and os.path.exists(p):
                if os.path.isdir(p):
                    shutil.rmtree(p)
                else:
                    os.remove(p)
        except Exception:
            pass
    gc.collect()


_last_cleanup_time = 0.0
_CLEANUP_INTERVAL = 600  # run expired-file pruning at most once every 10 minutes

@app.before_request
def periodic_cleanup():
    """Delete expired local files once every 10 minutes (no-op for Supabase mode)."""
    global _last_cleanup_time
    if not USE_LOCAL_STORAGE:
        return
    retention = get_retention_hours()
    if retention is None:
        return
    now = time.monotonic()
    if now - _last_cleanup_time < _CLEANUP_INTERVAL:
        return
    _last_cleanup_time = now
    try:
        from local_storage import delete_expired_files
        delete_expired_files(retention)
    except Exception:
        pass  # non-fatal — never break a request over housekeeping


_PROCESSING_ROUTES = {
    "/merge", "/split", "/remove-pages", "/compress", "/rotate-pdf",
    "/protect", "/unlock", "/clean-metadata", "/pdf-to-image",
    "/image-to-pdf", "/pptx-convert", "/docx-convert", "/excel-convert",
}


@app.before_request
def pre_check_limits():
    """Reject over-limit users BEFORE any PDF processing starts."""
    if request.method == "POST" and request.path in _PROCESSING_ROUTES:
        user_id = request.form.get("user_id") or request.args.get("user_id", "")
        if user_id:
            ok, error = check_count_limit(user_id)
            if not ok:
                return jsonify({"error": error}), 429


def get_user_id():
    return request.form.get("user_id") or request.args.get("user_id")


def finish(output_path, user_id, original_filename, tool=None, extra_headers=None):
    file_size = os.path.getsize(output_path)
    ok, error = check_limits(user_id, file_size)
    if not ok:
        cleanup(output_path)
        return jsonify({"error": error}), 429

    url, created_at = upload_output(
        output_path,
        user_id,
        original_filename,
        tool=tool,
        base_url=request.host_url.rstrip("/"),
    )
    cleanup(output_path)
    response = jsonify({
        "url": url,
        "file_name": original_filename,
        "created_at": created_at,
    })

    if extra_headers:
        for key, value in extra_headers.items():
            response.headers[key] = value
        # Expose ALL custom headers to the browser in one header value
        response.headers["Access-Control-Expose-Headers"] = ", ".join(extra_headers.keys())

    return response


@app.route("/pdf-to-image", methods=["POST"])
def pdf_to_image():
    file = request.files["file"]
    fmt = request.form.get("fmt", "jpg").strip().lower()
    if fmt not in ("jpg", "png"):
        fmt = "jpg"
    user_id = get_user_id()
    file_name = os.path.splitext(file.filename)[0]
    pdf_path = f"{UPLOAD_FOLDER}/{uuid.uuid4().hex}_{safe_name(file.filename, ".pdf")}"
    file.save(pdf_path)
    try:
        result_path = convert_pdf(file_name, fmt, pdf_path, OUTPUT_FOLDER)
        # convert_pdf prefixes a uuid to avoid collisions; strip it for the download name
        raw_name = os.path.basename(result_path)
        out_name = raw_name.split("_", 1)[1] if "_" in raw_name else raw_name
        return finish(result_path, user_id, out_name, tool="PDF to Image")
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cleanup(pdf_path)


@app.route("/thumbnail", methods=["POST"])
def thumbnail():
    file = request.files["file"]
    pdf_path = f"{UPLOAD_FOLDER}/{uuid.uuid4().hex}_{safe_name(file.filename, ".pdf")}"
    file.save(pdf_path)
    try:
        doc = pymupdf.open(pdf_path)
        try:
            if len(doc) == 0:
                return jsonify({"error": "PDF has no pages"}), 400
            pix = doc[0].get_pixmap(matrix=pymupdf.Matrix(0.4, 0.4))
            encoded = base64.b64encode(pix.tobytes("png")).decode("utf-8")
            page_count = len(doc)
            file_size = os.path.getsize(pdf_path)
            return jsonify({ "thumbnail": encoded, "filename": file.filename, "pages": page_count, "size": file_size })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            doc.close()
    finally:
        cleanup(pdf_path)


@app.route("/pagecount", methods=["POST"])
def pagecount():
    file = request.files["file"]
    pdf_path = f"{UPLOAD_FOLDER}/{uuid.uuid4().hex}_{safe_name(file.filename, ".pdf")}"
    file.save(pdf_path)
    try:
        doc = pymupdf.open(pdf_path)
        try:
            if len(doc) == 0:
                return jsonify({"error": "PDF has no pages"}), 400
            pix = doc[0].get_pixmap(matrix=pymupdf.Matrix(0.3, 0.3))
            thumb = base64.b64encode(pix.tobytes("png")).decode("utf-8")
            count = len(doc)
            return jsonify({ "pages": count, "thumbnail": thumb })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            doc.close()
    finally:
        cleanup(pdf_path)


@app.route("/page-thumbnail", methods=["POST"])
def page_thumbnail():
    file = request.files["file"]
    try:
        page_num = int(request.form.get("page", 1))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid page number"}), 400
    pdf_path = f"{UPLOAD_FOLDER}/{uuid.uuid4().hex}_{safe_name(file.filename, ".pdf")}"
    file.save(pdf_path)
    try:
        doc = pymupdf.open(pdf_path)
        try:
            if page_num < 1 or page_num > len(doc):
                return jsonify({"error": f"Page {page_num} out of range (PDF has {len(doc)} pages)"}), 400
            pix = doc[page_num - 1].get_pixmap(matrix=pymupdf.Matrix(0.5, 0.5))
            return jsonify({ "thumbnail": base64.b64encode(pix.tobytes("png")).decode() })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            doc.close()
    finally:
        cleanup(pdf_path)


@app.route("/merge", methods=["POST"])
def merge():
    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No files uploaded"}), 400
    rotations = request.form.getlist("rotations")
    user_id = get_user_id()
    paths = []
    for file in files:
        path = f"{UPLOAD_FOLDER}/{uuid.uuid4().hex}_{safe_name(file.filename, ".pdf")}"
        file.save(path)
        paths.append(path)
    merge_id = uuid.uuid4().hex
    output_path = f"{OUTPUT_FOLDER}/{merge_id}_merged.pdf"
    pdf_1 = None
    try:
        pdf_1 = pymupdf.open(paths[0])
        pdf_1.set_metadata({})
        try:
            rot_0 = int(rotations[0]) if rotations else 0
        except (ValueError, TypeError):
            rot_0 = 0
        if rot_0:
            for page in pdf_1:
                page.set_rotation((page.rotation + rot_0) % 360)

        for i, path in enumerate(paths[1:], 1):
            obj = pymupdf.open(path)
            try:
                obj.set_metadata({})
                try:
                    rot = int(rotations[i]) if i < len(rotations) else 0
                except (ValueError, TypeError):
                    rot = 0
                if rot:
                    for page in obj:
                        page.set_rotation((page.rotation + rot) % 360)
                pdf_1.insert_pdf(obj)
            finally:
                obj.close()

        pdf_1.set_metadata({"producer": "pdftool"})
        pdf_1.save(output_path, garbage=True)
        pdf_1.close()
        pdf_1 = None
        return finish(output_path, user_id, "merged.pdf", tool="Merge PDF")
    except Exception as e:
        cleanup(output_path)
        return jsonify({"error": str(e)}), 500
    finally:
        if pdf_1:
            pdf_1.close()
        cleanup(*paths)


@app.route("/split", methods=["POST"])
def split():
    file = request.files["file"]
    ranges = request.form.getlist("ranges")
    user_id = get_user_id()
    file_name = os.path.splitext(file.filename)[0]
    pdf_path = f"{UPLOAD_FOLDER}/{uuid.uuid4().hex}_{safe_name(file.filename, ".pdf")}"
    file.save(pdf_path)
    saved = []
    split_id = uuid.uuid4().hex
    if not ranges:
        return jsonify({"error": "No ranges provided"}), 400
    try:
        pdf = pymupdf.open(pdf_path)
        try:
            page_count = len(pdf)
            for n, r in enumerate(ranges, 1):
                parts = r.split("-")
                try:
                    start = int(parts[0])
                    end = int(parts[1]) if len(parts) > 1 else start
                except (ValueError, IndexError):
                    cleanup(*saved)
                    return jsonify({"error": f"Invalid range format: '{r}'. Expected '1-3' or '2'."}), 400
                if start < 1 or end < start or end > page_count:
                    cleanup(*saved)
                    return jsonify({"error": f"Range '{r}' is out of bounds (PDF has {page_count} pages)."}), 400
                pdf2 = pymupdf.open()
                pdf2.insert_pdf(pdf, from_page=start - 1, to_page=end - 1)
                out = f"{OUTPUT_FOLDER}/{split_id}_{file_name}_part_{n}.pdf"
                pdf2.set_metadata({})
                pdf2.save(out)
                pdf2.close()
                saved.append(out)
        finally:
            pdf.close()
        if len(saved) == 1:
            # Return with a clean user-facing filename (no uuid prefix)
            clean_name = f"{file_name}_part_1.pdf"
            return finish(saved[0], user_id, clean_name, tool="Split PDF")
        zip_name = f"{file_name}_split.zip"
        zip_path = f"{OUTPUT_FOLDER}/{split_id}_{zip_name}"
        try:
            with zipfile.ZipFile(zip_path, "w") as zipf:
                for f in saved:
                    # Write with clean name (strip split_id prefix) inside the zip
                    clean = os.path.basename(f).replace(f"{split_id}_", "", 1)
                    zipf.write(f, clean)
        except Exception:
            cleanup(zip_path, *saved)
            raise
        cleanup(*saved)
        return finish(zip_path, user_id, zip_name, tool="Split PDF")
    except Exception as e:
        cleanup(*saved)
        return jsonify({"error": str(e)}), 500
    finally:
        cleanup(pdf_path)


@app.route("/remove-pages", methods=["POST"])
def remove_pages():
    file = request.files["file"]
    user_id = get_user_id()
    file_name = os.path.splitext(file.filename)[0]
    pdf_path = f"{UPLOAD_FOLDER}/{uuid.uuid4().hex}_{safe_name(file.filename, ".pdf")}"
    file.save(pdf_path)
    remove_id = uuid.uuid4().hex
    output_path = f"{OUTPUT_FOLDER}/{remove_id}_{file_name}_removed.pdf"
    try:
        pages_raw = request.form.getlist("pages")
        try:
            pages_to_remove = set(int(p) for p in pages_raw)
        except ValueError:
            return jsonify({"error": "Invalid page numbers"}), 400
        doc = pymupdf.open(pdf_path)
        try:
            page_count = len(doc)
            invalid = [p for p in pages_to_remove if p < 1 or p > page_count]
            if invalid:
                return jsonify({"error": f"Page numbers out of range: {invalid} (PDF has {page_count} pages)"}), 400
            if len(pages_to_remove) >= page_count:
                return jsonify({"error": "Cannot remove all pages — the resulting PDF would be empty."}), 400
            for p in sorted(pages_to_remove, reverse=True):
                del doc[p - 1]
            doc.set_metadata({})
            doc.save(output_path)
        finally:
            doc.close()
        return finish(output_path, user_id, f"{file_name}_removed.pdf", tool="Remove Pages")
    except Exception as e:
        cleanup(output_path)
        return jsonify({"error": str(e)}), 500
    finally:
        cleanup(pdf_path)


def _recompress_images(pdf_path: str, output_path: str, quality: int = 80, target_dpi: int = 150):
    import pymupdf as fitz
    from PIL import Image
    import io

    fitz.TOOLS.mupdf_display_errors(False)

    src = fitz.open(pdf_path)
    dst = fitz.open()

    for page in src:
        page_width_inch  = page.rect.width  / 72
        page_height_inch = page.rect.height / 72

        dst.insert_pdf(src, from_page=page.number, to_page=page.number)
        dst_page = dst[-1]

        annot_obj = src.xref_get_key(page.xref, "Annots")
        if annot_obj[0] != "null":
            dst.xref_set_key(dst_page.xref, "Annots", annot_obj[1])

        seen = set()
        for img in dst_page.get_images(full=True):
            xref = img[0]
            if xref in seen:
                continue
            seen.add(xref)

            try:
                base      = dst.extract_image(xref)
                raw_bytes = base["image"]
                orig_w    = base["width"]
                orig_h    = base["height"]
                is_jpeg   = base["ext"] in ("jpeg", "jpg")

                if orig_w * orig_h < 200 * 200:
                    continue

                img_dpi    = max(orig_w / page_width_inch, orig_h / page_height_inch)
                scale      = 1.0
                downscaled = False
                if img_dpi > target_dpi:
                    scale      = target_dpi / img_dpi
                    downscaled = True

                pil_img = Image.open(io.BytesIO(raw_bytes))
                pil_img.load()

                # CMYK: PyMuPDF for correct conversion, hand to Pillow for compression
                if pil_img.mode == "CMYK":
                    pix     = fitz.Pixmap(dst, xref)
                    pix_rgb = fitz.Pixmap(fitz.csRGB, pix)
                    pil_img = Image.frombytes("RGB", (pix_rgb.width, pix_rgb.height), pix_rgb.samples)
                # Flatten transparency
                elif pil_img.mode in ("RGBA", "LA", "P"):
                    bg = Image.new("RGB", pil_img.size, (255, 255, 255))
                    pil_img = pil_img.convert("RGBA")
                    bg.paste(pil_img, mask=pil_img.split()[3])
                    pil_img = bg
                elif pil_img.mode not in ("RGB", "L"):
                    pil_img = pil_img.convert("RGB")

                if downscaled:
                    pil_img = pil_img.resize(
                        (int(orig_w * scale), int(orig_h * scale)), Image.LANCZOS
                    )

                # Detect grayscale stored as RGB
                if pil_img.mode == "RGB":
                    r, g, b = pil_img.split()
                    if r.tobytes() == g.tobytes() == b.tobytes():
                        pil_img = pil_img.convert("L")

                buf = io.BytesIO()
                pil_img.save(buf, format="JPEG", quality=quality, optimize=True)
                new_bytes = buf.getvalue()

                if is_jpeg and not downscaled and len(new_bytes) >= len(raw_bytes):
                    continue

                dst.update_stream(xref, new_bytes, compress=False)
                dst.xref_set_key(xref, "Filter",           "/DCTDecode")
                dst.xref_set_key(xref, "Width",            str(pil_img.width))
                dst.xref_set_key(xref, "Height",           str(pil_img.height))
                dst.xref_set_key(xref, "BitsPerComponent", "8")
                dst.xref_set_key(xref, "ColorSpace",
                    "/DeviceGray" if pil_img.mode == "L" else "/DeviceRGB"
                )

            except Exception as e:
                pass

    dst.save(
        output_path,
        garbage=4,
        deflate=True,
        deflate_images=True,
        deflate_fonts=True,
        clean=True,
        incremental=False,
    )
    src.close()
    dst.close()


# Compress preset mappings — controlled via deployment.config.json advanced.compressPresets
# or env vars. Falls back to sensible defaults if not set.
_COMPRESS_PRESETS = get_compress_presets()


@app.route("/compress", methods=["POST"])
def compress():
    file = request.files["file"]
    user_id = get_user_id()
    file_name = os.path.splitext(file.filename)[0]
    preset = request.form.get("preset", "ebook").strip().lower()
    if preset not in _COMPRESS_PRESETS:
        preset = "ebook"
    q = _COMPRESS_PRESETS[preset]["quality"]
    d = _COMPRESS_PRESETS[preset]["max_dpi"]
    pdf_path = f"{UPLOAD_FOLDER}/{uuid.uuid4().hex}_{safe_name(file.filename, ".pdf")}"
    file.save(pdf_path)
    compress_id = uuid.uuid4().hex
    output_path = f"{OUTPUT_FOLDER}/{compress_id}_{file_name}_compressed.pdf"
    try:
        _recompress_images(pdf_path, output_path, quality=q, target_dpi=d)
        compressed_size = os.path.getsize(output_path)
        return finish(output_path, user_id, f"{file_name}_compressed.pdf", tool="Compress PDF",
                      extra_headers={"x-compressed-size": compressed_size})
    except Exception as e:
        # Clean output_path only on failure; finish() handles it on success.
        cleanup(output_path)
        return jsonify({"error": str(e)}), 500
    finally:
        cleanup(pdf_path)


@app.route("/clean-metadata", methods=["POST"])
def clean_metadata():
    file = request.files["file"]
    user_id = get_user_id()
    file_name = os.path.splitext(file.filename)[0]
    pdf_path = f"{UPLOAD_FOLDER}/{uuid.uuid4().hex}_{safe_name(file.filename, ".pdf")}"
    file.save(pdf_path)
    clean_id = uuid.uuid4().hex
    output_path = f"{OUTPUT_FOLDER}/{clean_id}_{file_name}_cleaned.pdf"
    try:
        doc = pymupdf.open(pdf_path)
        removed = {k: v for k, v in doc.metadata.items() if v}
        doc.set_metadata({})
        doc.save(output_path, garbage=4)
        doc.close()
        return finish(output_path, user_id, f"{file_name}_cleaned.pdf", tool="Clean Metadata", extra_headers={"x-metadata": json.dumps(removed)})
    except Exception as e:
        cleanup(output_path)
        return jsonify({"error": str(e)}), 500
    finally:
        cleanup(pdf_path)


def protect_pdf(pdf_path, output_path, user_pass, owner_pass, permissions):
    with pikepdf.open(pdf_path) as pdf:
        pdf.save(output_path, encryption=pikepdf.Encryption(
            user=user_pass,
            owner=owner_pass,
            R=6,
            allow=pikepdf.Permissions(
                print_lowres=permissions.get("printing", False),
                print_highres=permissions.get("printing", False),
                extract=permissions.get("copying", False),
                modify_other=permissions.get("editing", False),
                modify_form=permissions.get("editing", False),
                modify_annotation=permissions.get("signing", False),
                modify_assembly=permissions.get("assembly", False),
                accessibility=permissions.get("accessibility", False),
            )
        ))


@app.route("/protect", methods=["POST"])
def protect():
    file = request.files["file"]
    user_pass = request.form.get("user_pass") or ""
    owner_pass = request.form.get("owner_pass") or ""
    if not user_pass:
        return jsonify({"error": "user_pass is required"}), 400
    if not owner_pass:
        owner_pass = user_pass  # fall back to user password as owner password
    preset = request.form.get("preset", "block_all")
    user_id = get_user_id()
    file_name = os.path.splitext(file.filename)[0]
    pdf_path = f"{UPLOAD_FOLDER}/{uuid.uuid4().hex}_{safe_name(file.filename, ".pdf")}"
    file.save(pdf_path)
    protect_id = uuid.uuid4().hex
    output_path = f"{OUTPUT_FOLDER}/{protect_id}_{file_name}_protected.pdf"
    try:
        if preset == "allow_all":
            permissions = { "printing": True, "copying": True, "editing": True, "signing": True, "assembly": True, "accessibility": True }
        elif preset == "block_all":
            permissions = { "printing": False, "copying": False, "editing": False, "signing": False, "assembly": False, "accessibility": False }
        else:
            permissions = {
                "printing": request.form.get("printing") == "true",
                "copying": request.form.get("copying") == "true",
                "editing": request.form.get("editing") == "true",
                "signing": request.form.get("signing") == "true",
                "assembly": request.form.get("assembly") == "true",
                "accessibility": request.form.get("accessibility") == "true",
            }
        protect_pdf(pdf_path, output_path, user_pass, owner_pass, permissions)
        return finish(output_path, user_id, f"{file_name}_protected.pdf", tool="Protect PDF")
    except Exception as e:
        cleanup(output_path)
        return jsonify({"error": str(e)}), 500
    finally:
        cleanup(pdf_path)


def unlock_pdf(pdf_path, output_path, password):
    with pikepdf.open(pdf_path, password=password) as pdf:
        pdf.save(output_path)


@app.route("/unlock", methods=["POST"])
def unlock():
    file = request.files["file"]
    password = request.form.get("password") or ""
    user_id = get_user_id()
    file_name = os.path.splitext(file.filename)[0]
    pdf_path = f"{UPLOAD_FOLDER}/{uuid.uuid4().hex}_{safe_name(file.filename, ".pdf")}"
    file.save(pdf_path)
    unlock_id = uuid.uuid4().hex
    output_path = f"{OUTPUT_FOLDER}/{unlock_id}_{file_name}_unlocked.pdf"
    try:
        unlock_pdf(pdf_path, output_path, password)
        return finish(output_path, user_id, f"{file_name}_unlocked.pdf", tool="Unlock PDF")
    except pikepdf.PasswordError:
        cleanup(output_path)
        return jsonify({"error": "Wrong password!"}), 400
    except Exception as e:
        cleanup(output_path)
        return jsonify({"error": f"Could not unlock PDF: {e}"}), 500
    finally:
        cleanup(pdf_path)


@app.route("/pptx-convert", methods=["POST"])
def pptx_convert():
    file = request.files["file"]
    output_type = request.form.get("output", "pdf")
    img_fmt = request.form.get("img_fmt", "jpg").strip().lower()
    user_id = get_user_id()
    _orig_ext = os.path.splitext(file.filename)[1] or ".pptx"
    safe_filename = safe_name(file.filename, _orig_ext)
    file_name = os.path.splitext(file.filename)[0]         # original name for output
    safe_stem = os.path.splitext(safe_filename)[0]         # sanitised name soffice uses

    tmp_dir = f"{UPLOAD_FOLDER}/pptx_{uuid.uuid4().hex}"
    os.makedirs(tmp_dir, exist_ok=True)
    pptx_path = f"{tmp_dir}/{safe_filename}"
    file.save(pptx_path)

    try:
        # Dynamically locate soffice binary
        soffice_path = shutil.which("soffice")
        if not soffice_path:
            return jsonify({"error": "LibreOffice 'soffice' not found in PATH"}), 500

        result = subprocess.run(
            [
                soffice_path,
                "--headless",
                "--invisible",
                "--nodefault",
                "--nofirststartwizard",
                "--norestore",
                "--convert-to", "pdf",
                "--outdir", tmp_dir,
                pptx_path
            ],
            capture_output=True,
            text=True,
            timeout=get_soffice_timeout()
        )

        # soffice names the output after the INPUT file stem (safe_stem), not file_name
        pdf_path = f"{tmp_dir}/{safe_stem}.pdf"
        if not os.path.exists(pdf_path):
            return jsonify({"error": "Conversion failed. " + result.stderr}), 500

        if output_type == "pdf":
            out_name = f"{file_name}.pdf"
            final_path = f"{OUTPUT_FOLDER}/{uuid.uuid4().hex}_{out_name}"
            strip_pdf_metadata(pdf_path, final_path)
            return finish(final_path, user_id, out_name, tool="PPTX Converter")

        else:
            ext = f".{img_fmt}"
            doc = pymupdf.open(pdf_path)
            mat = render_matrix(img_fmt)
            img_paths = []
            pptx_out_id = uuid.uuid4().hex

            try:
                if len(doc) == 1:
                    pix = doc[0].get_pixmap(matrix=mat)
                    out_name = f"{file_name}{ext}"
                    out_path = f"{OUTPUT_FOLDER}/{pptx_out_id}_{out_name}"
                    save_pixmap(pix, out_path, img_fmt)
                    return finish(out_path, user_id, out_name, tool="PPTX Converter")
                else:
                    for i, page in enumerate(doc):
                        pix = page.get_pixmap(matrix=mat)
                        img_path = f"{OUTPUT_FOLDER}/{pptx_out_id}_{file_name}_slide{i+1}{ext}"
                        save_pixmap(pix, img_path, img_fmt)
                        img_paths.append(img_path)
            except Exception:
                cleanup(*img_paths)
                raise
            finally:
                doc.close()

            zip_name = f"{file_name}_slides.zip"
            zip_path = f"{OUTPUT_FOLDER}/{pptx_out_id}_{zip_name}"
            with zipfile.ZipFile(zip_path, "w") as zipf:
                for p in img_paths:
                    zipf.write(p, os.path.basename(p).replace(f"{pptx_out_id}_", "", 1))
            cleanup(*img_paths)
            return finish(zip_path, user_id, zip_name, tool="PPTX Converter")

    except subprocess.TimeoutExpired:
        return jsonify({"error": "Conversion timed out. Try a smaller file."}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cleanup(tmp_dir)



def strip_pdf_metadata(src_path: str, dst_path: str) -> None:
    """Copy src PDF to dst with all metadata cleared."""
    doc = pymupdf.open(src_path)
    try:
        doc.set_metadata({})
        doc.save(dst_path, garbage=4, deflate=True)
    finally:
        doc.close()






def libreoffice_convert(input_path, tmp_dir):
    """Convert any LibreOffice-supported file to PDF in tmp_dir. Returns path to generated PDF."""
    soffice_path = shutil.which("soffice")
    if not soffice_path:
        raise RuntimeError("LibreOffice 'soffice' not found in PATH")
    file_name = os.path.splitext(os.path.basename(input_path))[0]
    result = subprocess.run(
        [soffice_path, "--headless", "--invisible", "--nodefault",
         "--nofirststartwizard", "--norestore", "--convert-to", "pdf",
         "--outdir", tmp_dir, input_path],
        capture_output=True, text=True, timeout=get_soffice_timeout()
    )
    pdf_path = f"{tmp_dir}/{file_name}.pdf"
    if not os.path.exists(pdf_path):
        raise RuntimeError("Conversion failed. " + result.stderr)
    return pdf_path


def _pdf_to_images_output(pdf_path, file_name, img_fmt, user_id, tool):
    """Convert pdf_path pages to images, zip if multi-page, return via finish()."""
    ext = f".{img_fmt}"
    doc = pymupdf.open(pdf_path)
    mat = render_matrix(img_fmt)
    img_paths = []
    out_id = uuid.uuid4().hex

    try:
        if len(doc) == 1:
            pix = doc[0].get_pixmap(matrix=mat)
            out_name = f"{file_name}{ext}"
            out_path = f"{OUTPUT_FOLDER}/{out_id}_{out_name}"
            save_pixmap(pix, out_path, img_fmt)
            return finish(out_path, user_id, out_name, tool=tool)
        else:
            for i, page in enumerate(doc):
                pix = page.get_pixmap(matrix=mat)
                img_path = f"{OUTPUT_FOLDER}/{out_id}_{file_name}_page{i+1}{ext}"
                save_pixmap(pix, img_path, img_fmt)
                img_paths.append(img_path)

            zip_name = f"{file_name}_pages.zip"
            zip_path = f"{OUTPUT_FOLDER}/{out_id}_{zip_name}"
            with zipfile.ZipFile(zip_path, "w") as zipf:
                for p in img_paths:
                    zipf.write(p, os.path.basename(p).replace(f"{out_id}_", "", 1))
            cleanup(*img_paths)
            img_paths = []
            return finish(zip_path, user_id, zip_name, tool=tool)
    except Exception:
        cleanup(*img_paths)
        raise
    finally:
        doc.close()


@app.route("/docx-convert", methods=["POST"])
def docx_convert():
    """
    Accepts:
      file       — .docx / .doc / .odt / .rtf
      output     — "pdf" (default) | "image"
      img_fmt    — "jpg" | "png"  (only when output=image)
    Returns: PDF or image/zip
    """
    file = request.files["file"]
    user_id = get_user_id()
    file_name = os.path.splitext(file.filename)[0]
    ext = os.path.splitext(file.filename)[1].lower()
    output_type = request.form.get("output", "pdf")
    img_fmt = request.form.get("img_fmt", "jpg").strip().lower()

    if ext not in (".docx", ".doc", ".odt", ".rtf"):
        return jsonify({"error": "Unsupported file. Accepted: .docx, .doc, .odt, .rtf"}), 400

    tmp_dir = f"{UPLOAD_FOLDER}/docx_{uuid.uuid4().hex}"
    os.makedirs(tmp_dir, exist_ok=True)
    input_path = f"{tmp_dir}/{safe_name(file.filename, ext)}"
    file.save(input_path)

    try:
        pdf_path = libreoffice_convert(input_path, tmp_dir)

        if output_type == "pdf":
            out_name = f"{file_name}.pdf"
            final_path = f"{OUTPUT_FOLDER}/{uuid.uuid4().hex}_{out_name}"
            strip_pdf_metadata(pdf_path, final_path)
            return finish(final_path, user_id, out_name, tool="Word Converter")
        else:
            return _pdf_to_images_output(pdf_path, file_name, img_fmt, user_id, "Word Converter")

    except subprocess.TimeoutExpired:
        return jsonify({"error": "Conversion timed out. Try a smaller file."}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cleanup(tmp_dir)


@app.route("/excel-convert", methods=["POST"])
def excel_convert():
    """
    Accepts:
      file       — .xlsx / .xls / .ods / .csv
      output     — "pdf" (default) | "image"
      img_fmt    — "jpg" | "png"  (only when output=image)
    Returns: PDF or image/zip
    """
    file = request.files["file"]
    user_id = get_user_id()
    file_name = os.path.splitext(file.filename)[0]
    ext = os.path.splitext(file.filename)[1].lower()
    output_type = request.form.get("output", "pdf")
    img_fmt = request.form.get("img_fmt", "jpg").strip().lower()

    if ext not in (".xlsx", ".xls", ".ods", ".csv"):
        return jsonify({"error": "Unsupported file. Accepted: .xlsx, .xls, .ods, .csv"}), 400

    tmp_dir = f"{UPLOAD_FOLDER}/excel_{uuid.uuid4().hex}"
    os.makedirs(tmp_dir, exist_ok=True)
    input_path = f"{tmp_dir}/{safe_name(file.filename, ext)}"
    file.save(input_path)

    try:
        pdf_path = libreoffice_convert(input_path, tmp_dir)

        if output_type == "pdf":
            out_name = f"{file_name}.pdf"
            final_path = f"{OUTPUT_FOLDER}/{uuid.uuid4().hex}_{out_name}"
            strip_pdf_metadata(pdf_path, final_path)
            return finish(final_path, user_id, out_name, tool="Excel Converter")
        else:
            return _pdf_to_images_output(pdf_path, file_name, img_fmt, user_id, "Excel Converter")

    except subprocess.TimeoutExpired:
        return jsonify({"error": "Conversion timed out. Try a smaller file."}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cleanup(tmp_dir)


@app.route("/rotate-pdf", methods=["POST"])
def rotate_pdf():
    """
    Accepts:
      file       — PDF
      rotations  — JSON array: [{"page": 1, "angle": 90}, {"page": 3, "angle": 180}, ...]
                   page is 1-indexed, angle must be 90 | 180 | 270
    Returns: rotated PDF
    """
    file = request.files["file"]
    user_id = get_user_id()
    file_name = os.path.splitext(file.filename)[0]

    rotations_raw = request.form.get("rotations", "[]")
    try:
        rotations_list = json.loads(rotations_raw)
        rotation_map = {}
        for item in rotations_list:
            page_idx = int(item["page"]) - 1   # convert to 0-indexed
            angle = int(item["angle"])
            if angle in (90, 180, 270) and page_idx >= 0:
                rotation_map[page_idx] = angle
    except Exception as e:
        return jsonify({"error": f"Invalid rotations format: {e}"}), 400

    if not rotation_map:
        return jsonify({"error": "No valid rotations provided"}), 400

    pdf_path = f"{UPLOAD_FOLDER}/{uuid.uuid4().hex}_{safe_name(file.filename, ".pdf")}"
    file.save(pdf_path)
    rotate_id = uuid.uuid4().hex
    output_path = f"{OUTPUT_FOLDER}/{rotate_id}_{file_name}_rotated.pdf"

    try:
        doc = pymupdf.open(pdf_path)
        try:
            for page_idx, angle in rotation_map.items():
                if 0 <= page_idx < len(doc):
                    page = doc[page_idx]
                    page.set_rotation((page.rotation + angle) % 360)
            doc.set_metadata({})
            doc.save(output_path)
        finally:
            doc.close()
        return finish(output_path, user_id, f"{file_name}_rotated.pdf", tool="Rotate PDF")
    except Exception as e:
        cleanup(output_path)
        return jsonify({"error": str(e)}), 500
    finally:
        cleanup(pdf_path)


@app.route("/config", methods=["GET"])
def server_config():
    return jsonify(public_config())


@app.route("/download/<file_id>", methods=["GET"])
def download_file(file_id):
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    if USE_LOCAL_STORAGE:
        resolved = resolve_download(file_id, user_id)
        if not resolved:
            return jsonify({"error": "File not found"}), 404
        path, name = resolved
        return send_file(path, as_attachment=True, download_name=name)

    resolved = resolve_supabase_download(file_id, user_id)
    if not resolved:
        return jsonify({"error": "File not found"}), 404
    data, name = resolved
    return send_file(
        BytesIO(data),
        as_attachment=True,
        download_name=name,
        mimetype="application/octet-stream",
    )


@app.route("/files", methods=["GET"])
def list_files():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    files = get_user_files(user_id, base_url=request.host_url.rstrip("/"))
    return jsonify({"files": files})


# ---------------------------------------------------------------------------
# Paper size table — (width_pt, height_pt) in portrait orientation
# 1 mm = 2.83465 pt
# ---------------------------------------------------------------------------
_PAPER_SIZES = {
    "a4":     (595.28,  841.89),
    "a3":     (841.89, 1190.55),
    "a2":    (1190.55, 1683.78),
    "letter": (612.0,   792.0),
}
_MARGIN_PT = {
    "none":  0.0,
    "small": 28.35,   # 10 mm
    "large": 56.70,   # 20 mm
}


def _build_img_pdf(img_paths, paper_size, orientation, margin_name, output_path):
    """
    Convert a list of image paths to a single PDF.
    - Small/already-compressed JPEGs → raw bytes fed to img2pdf (zero re-encoding)
    - Large images (>1200px) or non-JPEG → Pillow resize+compress → img2pdf
    Page layout (paper size, orientation, margin) applied via img2pdf layout functions.

    paper_size  : "a4" | "a3" | "a2" | "letter" | "fit"
    orientation : "portrait" | "landscape"
    margin_name : "none" | "small" | "large"
    """
    import img2pdf
    from PIL import Image as PilImage

    JPEG_EXTS = {".jpg", ".jpeg"}
    margin_mm = {"none": 0, "small": 10, "large": 20}.get(margin_name, 0)

    # Paper size lookup (mm)
    PAPER_MM = {
        "a4":     (210, 297),
        "a3":     (297, 420),
        "a2":     (420, 594),
        "letter": (216, 279),
    }

    # Build list of JPEG bytes in order
    jpeg_bufs = []

    for img_path in img_paths:
        try:
            pil = PilImage.open(img_path)
            # Normalize mode
            if pil.mode not in ("RGB", "L", "CMYK"):
                if pil.mode in ("RGBA", "LA", "P"):
                    bg = PilImage.new("RGB", pil.size, (255, 255, 255))
                    pil = pil.convert("RGBA")
                    bg.paste(pil, mask=pil.split()[3])
                    pil = bg
                else:
                    pil = pil.convert("RGB")
            buf = io.BytesIO()
            if pil.mode == "CMYK":
                pil.save(buf, format="JPEG")  # CMYK — no color shift
            else:
                # subsampling=2 (4:2:0) + optimize — same trick ilovePDF uses
                pil.save(buf, format="JPEG", quality=75, subsampling=2, optimize=True)
            jpeg_bufs.append(buf.getvalue())
        except Exception:
            with open(img_path, "rb") as f:
                jpeg_bufs.append(f.read())

    if not jpeg_bufs:
        return

    # Build img2pdf layout function
    if paper_size == "fit":
        # Each image defines its own page size
        layout_fun = img2pdf.get_layout_fun(
            pagesize=None,
            fit=img2pdf.FitMode.into,
            auto_orient=(orientation == "landscape"),
        )
    else:
        pw_mm, ph_mm = PAPER_MM.get(paper_size, PAPER_MM["a4"])
        if orientation == "landscape":
            pw_mm, ph_mm = ph_mm, pw_mm
        pw_pt = img2pdf.mm_to_pt(pw_mm)
        ph_pt = img2pdf.mm_to_pt(ph_mm)
        border_pt = img2pdf.mm_to_pt(margin_mm) if margin_mm else None
        layout_fun = img2pdf.get_layout_fun(
            pagesize=(pw_pt, ph_pt),
            border=border_pt,
            fit=img2pdf.FitMode.into,
            auto_orient=False,
        )

    with open(output_path, "wb") as f:
        f.write(img2pdf.convert(jpeg_bufs, layout_fun=layout_fun))


@app.route("/image-to-pdf", methods=["POST"])
def image_to_pdf():
    """
    Accepts:
      files[]      — image files (JPG / PNG / WEBP / BMP / GIF / TIFF)
      paper_size   — a4 | a3 | a2 | letter | fit  (default: a4)
      orientation  — portrait | landscape           (default: portrait)
      margin       — none | small | large           (default: none)
      output_mode  — merged | separate              (default: merged)
      user_id
    Returns:
      merged  → single PDF
      separate → ZIP of individual PDFs
    """
    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No images uploaded"}), 400

    paper_size  = request.form.get("paper_size",  "a4").strip().lower()
    orientation = request.form.get("orientation", "portrait").strip().lower()
    margin      = request.form.get("margin",      "none").strip().lower()
    output_mode = request.form.get("output_mode", "merged").strip().lower()
    user_id     = get_user_id()

    ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tiff", ".tif"}

    # Save all uploaded images to a temp directory
    tmp_dir = f"{UPLOAD_FOLDER}/img2pdf_{uuid.uuid4().hex}"
    os.makedirs(tmp_dir, exist_ok=True)
    saved_img_paths = []

    try:
        for f in files:
            ext = os.path.splitext(f.filename)[1].lower()
            if ext not in ALLOWED_EXTS:
                continue
            img_path = os.path.join(tmp_dir, f"{uuid.uuid4().hex}{ext}")
            f.save(img_path)
            saved_img_paths.append((f.filename, img_path))

        if not saved_img_paths:
            return jsonify({"error": "No valid image files found. Accepted: JPG, PNG, WEBP, BMP, GIF, TIFF"}), 400

        if output_mode == "merged":
            out_name = "images.pdf"
            out_path = f"{OUTPUT_FOLDER}/{uuid.uuid4().hex}_{out_name}"
            _build_img_pdf(
                [p for _, p in saved_img_paths],
                paper_size, orientation, margin, out_path
            )
            return finish(out_path, user_id, out_name, tool="Image to PDF")

        else:  # separate → one PDF per image, zipped
            pdf_paths = []
            try:
                for orig_name, img_path in saved_img_paths:
                    base = os.path.splitext(orig_name)[0]
                    pdf_name = f"{base}.pdf"
                    pdf_out  = f"{OUTPUT_FOLDER}/{uuid.uuid4().hex}_{pdf_name}"
                    _build_img_pdf([img_path], paper_size, orientation, margin, pdf_out)
                    pdf_paths.append((pdf_name, pdf_out))

                zip_name = "images_to_pdf.zip"
                zip_path = f"{OUTPUT_FOLDER}/{uuid.uuid4().hex}_{zip_name}"
                with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                    for pdf_name, pdf_path in pdf_paths:
                        zf.write(pdf_path, pdf_name)
                return finish(zip_path, user_id, zip_name, tool="Image to PDF")
            finally:
                cleanup(*[p for _, p in pdf_paths])

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cleanup(tmp_dir)

#deploy
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "").lower() in ("1", "true", "yes")
    app.run(debug=debug, host="0.0.0.0", port=port)