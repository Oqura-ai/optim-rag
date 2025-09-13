import os
import hashlib
from pathlib import Path
from docx2pdf import convert
from pdf_ocr import extract_text_from_pdf

# ---------------------- HASH GENERATION ----------------------
def generate_chunk_hash(filename, extension, chunk_id, content):
    hash_input = f"{filename}-{extension}-{chunk_id}-{content}".encode("utf-8")
    return hashlib.sha256(hash_input).hexdigest()

def build_chunk_metadata(filename, extension, chunk_id, page_number, content, previous_hash=None):
    return {
        "filename": filename,
        "extension": extension,
        "chunk_id": f"{filename}_{extension}_{chunk_id}",  # Hybrid ID
        "page_number": page_number,
        "page_content": content,
        "chunk_hash": generate_chunk_hash(filename, extension, chunk_id, content),
        "previous_chunk_hash": previous_hash,
    }

# ---------------------- DOCX CHUNKER ----------------------
def chunk_docx(file_path, chunk_size=None):
    file_path = Path(file_path)
    filename = file_path.stem
    extension = file_path.suffix.lower().lstrip(".")
    temp_pdf_path = file_path.with_suffix(".pdf")

    # Convert DOCX → PDF
    convert(str(file_path), str(temp_pdf_path))
    print(f"[DOCX CHUNKER] Converted {file_path} → {temp_pdf_path}")

    with open(temp_pdf_path, "rb") as f:
        file_bytes = f.read()

    chunks = []
    chunk_id = 1
    previous_hash = None

    if chunk_size:
        print(f"[DOCX CHUNKER] Splitting by custom size: {chunk_size} chars")
        pages = extract_text_from_pdf(file_bytes)
        full_text = "".join(pages)

        for i in range(0, len(full_text), chunk_size):
            chunk_data = full_text[i:i + chunk_size]
            page_number = (i // chunk_size) + 1
            metadata = build_chunk_metadata(filename, extension, chunk_id, page_number, chunk_data, previous_hash)
            chunks.append(metadata)
            chunk_id += 1
    else:
        print(f"[DOCX CHUNKER] Splitting by real PDF pages (OCR extraction)")
        pages = extract_text_from_pdf(file_bytes)

        for idx, page in enumerate(pages):
            page_number = idx + 1
            metadata = build_chunk_metadata(filename, extension, chunk_id, page_number, page, previous_hash)
            chunks.append(metadata)
            chunk_id += 1

    if temp_pdf_path.exists():
        temp_pdf_path.unlink()

    return chunks

# ---------------------- PDF CHUNKER ----------------------
def chunk_pdf(file_path, chunk_size=None):
    file_path = Path(file_path)
    filename = file_path.stem
    extension = file_path.suffix.lower().lstrip(".")

    with open(file_path, "rb") as f:
        file_bytes = f.read()

    chunks = []
    chunk_id = 1
    previous_hash = None

    if chunk_size:
        print(f"[PDF CHUNKER] Splitting by custom size: {chunk_size} chars")
        pages = extract_text_from_pdf(file_bytes)
        full_text = "".join(pages)

        for i in range(0, len(full_text), chunk_size):
            chunk_data = full_text[i:i + chunk_size]
            page_number = (i // chunk_size) + 1
            metadata = build_chunk_metadata(filename, extension, chunk_id, page_number, chunk_data, previous_hash)
            chunks.append(metadata)
            chunk_id += 1
    else:
        print(f"[PDF CHUNKER] Splitting by real PDF pages (OCR extraction)")
        pages = extract_text_from_pdf(file_bytes)

        for idx, page in enumerate(pages):
            page_number = idx + 1
            metadata = build_chunk_metadata(filename, extension, chunk_id, page_number, page, previous_hash)
            chunks.append(metadata)
            chunk_id += 1

    return chunks

# ---------------------- MD CHUNKER ----------------------
def chunk_md(file_path, delimiter=None, chunk_size=512):
    file_path = Path(file_path)
    filename = file_path.stem
    extension = file_path.suffix.lower().lstrip(".")

    print(f"[MD CHUNKER] Processing {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    chunks = []
    chunk_id = 1
    previous_hash = None

    if delimiter:
        parts = content.split(delimiter)
        for idx, part in enumerate(parts):
            part = part.strip()
            if part:
                page_number = idx + 1
                metadata = build_chunk_metadata(filename, extension, chunk_id, page_number, f"{delimiter} {part}", previous_hash)
                chunks.append(metadata)
                chunk_id += 1
    else:
        for i in range(0, len(content), chunk_size):
            chunk_data = content[i:i + chunk_size]
            page_number = (i // chunk_size) + 1
            metadata = build_chunk_metadata(filename, extension, chunk_id, page_number, chunk_data, previous_hash)
            chunks.append(metadata)
            chunk_id += 1

    print(f"[MD CHUNKER] Split into {len(chunks)} chunks")
    return chunks

# ---------------------- TXT CHUNKER ----------------------
def chunk_txt(file_path, delimiter=None, chunk_size=512):
    file_path = Path(file_path)
    filename = file_path.stem
    extension = file_path.suffix.lower().lstrip(".")

    print(f"[TXT CHUNKER] Processing {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    chunks = []
    chunk_id = 1
    previous_hash = None

    if delimiter:
        parts = content.split(delimiter)
        for idx, part in enumerate(parts):
            part = part.strip()
            if part:
                page_number = idx + 1
                metadata = build_chunk_metadata(filename, extension, chunk_id, page_number, part, previous_hash)
                chunks.append(metadata)
                chunk_id += 1
    else:
        for i in range(0, len(content), chunk_size):
            chunk_data = content[i:i + chunk_size]
            page_number = (i // chunk_size) + 1
            metadata = build_chunk_metadata(filename, extension, chunk_id, page_number, chunk_data, previous_hash)
            chunks.append(metadata)
            chunk_id += 1

    print(f"[TXT CHUNKER] Split into {len(chunks)} chunks")
    return chunks

# ---------------------- FILE CATEGORIZATION ----------------------
def categorize_files(folder_path):
    categorized = {"docx": [], "pdf": [], "md": [], "txt": []}
    folder = Path(folder_path)

    for file in folder.iterdir():
        if file.is_file():
            ext = file.suffix.lower()
            if ext == ".docx":
                categorized["docx"].append(file)
            elif ext == ".pdf":
                categorized["pdf"].append(file)
            elif ext == ".md":
                categorized["md"].append(file)
            elif ext == ".txt":
                categorized["txt"].append(file)

    return categorized

# ---------------------- PROCESS FILES ----------------------
def process_chunks(directory_path, chunk_size=None):
    categorized = categorize_files(directory_path)
    results = []

    for ext, files in categorized.items():
        for file in files:
            if ext == "docx":
                results.extend(chunk_docx(file, chunk_size=chunk_size))
            elif ext == "pdf":
                results.extend(chunk_pdf(file, chunk_size=chunk_size))
            elif ext == "md":
                if chunk_size is not None:
                    results.extend(chunk_md(file, chunk_size=chunk_size))
                else:
                    results.extend(chunk_md(file))
            elif ext == "txt":
                if chunk_size is not None:
                    results.extend(chunk_md(file, chunk_size=chunk_size))
                else:
                    results.extend(chunk_md(file))

    return results

# ---------------------- MAIN ----------------------
if __name__ == "__main__":
    folder = "../data-source"
    output = process_chunks(folder, chunk_size=None)  # Set chunk_size=int or None
    print("\nFinal processed results:")
    print(output[2])