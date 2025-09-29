import os
import hashlib
from pathlib import Path
from docx2pdf import convert
from pdf_ocr import extract_text_from_pdf
from typing import Union, List, Dict

# ---------------------- HASH GENERATION ----------------------
def generate_chunk_hash(filename, filetype, chunk_id, content):
    hash_input = f"{filename}-{filetype}-{chunk_id}-{content}".encode("utf-8")
    return hashlib.sha256(hash_input).hexdigest()

def build_chunk_metadata(filename, filetype, chunk_id, page_number, content, previous_hash=None):
    return {
        "filename": filename,
        "filetype": filetype,
        "chunk_id": f"{filename}_{filetype}_{chunk_id}",  # Hybrid ID
        "page_number": page_number,
        "page_content": content,
        "chunk_hash": generate_chunk_hash(filename, filetype, chunk_id, content),
        "previous_chunk_hash": previous_hash,
    }

# ---------------------- DOCX CHUNKER ----------------------

def chunk_docx(file_path, chunk_size=None, buffer=8):
    file_path = Path(file_path)
    filename = file_path.stem
    filetype = "docx"
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
        print(f"[DOCX CHUNKER] Splitting by {chunk_size} words with {buffer} word overlap")
        pages = extract_text_from_pdf(file_bytes)
        full_text = " ".join(pages)

        words = full_text.split()
        total_words = len(words)

        for i in range(0, total_words, chunk_size):
            start = i
            end = min(i + chunk_size + buffer, total_words)
            chunk_words = words[start:end]
            chunk_data = " ".join(chunk_words)

            page_number = (i // chunk_size) + 1
            metadata = build_chunk_metadata(filename, filetype, chunk_id, page_number, chunk_data, previous_hash)
            chunks.append(metadata)
            chunk_id += 1
    else:
        print(f"[DOCX CHUNKER] Splitting by real PDF pages (OCR extraction)")
        pages = extract_text_from_pdf(file_bytes)

        for idx, page in enumerate(pages):
            page_number = idx + 1
            metadata = build_chunk_metadata(filename, filetype, chunk_id, page_number, page, previous_hash)
            chunks.append(metadata)
            chunk_id += 1

    if temp_pdf_path.exists():
        temp_pdf_path.unlink()

    return chunks

# ---------------------- PDF CHUNKER ----------------------
def chunk_pdf(file_path, chunk_size=None, buffer=8):
    file_path = Path(file_path)
    filename = file_path.stem
    filetype = "pdf"

    with open(file_path, "rb") as f:
        file_bytes = f.read()

    chunks = []
    chunk_id = 1
    previous_hash = None

    if chunk_size:
        print(f"[PDF CHUNKER] Splitting by {chunk_size} words with {buffer} word overlap")
        pages = extract_text_from_pdf(file_bytes)
        full_text = " ".join(pages)

        words = full_text.split()
        total_words = len(words)

        for i in range(0, total_words, chunk_size):
            start = i
            end = min(i + chunk_size + buffer, total_words)
            chunk_words = words[start:end]
            chunk_data = " ".join(chunk_words)

            page_number = (i // chunk_size) + 1
            metadata = build_chunk_metadata(filename, filetype, chunk_id, page_number, chunk_data, previous_hash)
            chunks.append(metadata)
            chunk_id += 1
    else:
        print(f"[PDF CHUNKER] Splitting by real PDF pages (OCR extraction)")
        pages = extract_text_from_pdf(file_bytes)

        for idx, page in enumerate(pages):
            page_number = idx + 1
            metadata = build_chunk_metadata(filename, filetype, chunk_id, page_number, page, previous_hash)
            chunks.append(metadata)
            chunk_id += 1

    return chunks

# ---------------------- MD CHUNKER ----------------------
def chunk_md(file_path, delimiter=None, chunk_size=512, buffer=8):
    file_path = Path(file_path)
    filename = file_path.stem
    filetype = "md"

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
                metadata = build_chunk_metadata(
                    filename, filetype, chunk_id, page_number, f"{delimiter} {part}", previous_hash
                )
                chunks.append(metadata)
                chunk_id += 1
    else:
        words = content.split()
        total_words = len(words)

        print(f"[MD CHUNKER] Splitting by {chunk_size} words with {buffer} word overlap")

        for i in range(0, total_words, chunk_size):
            start = i
            end = min(i + chunk_size + buffer, total_words)
            chunk_words = words[start:end]
            chunk_data = " ".join(chunk_words)

            page_number = (i // chunk_size) + 1
            metadata = build_chunk_metadata(
                filename, filetype, chunk_id, page_number, chunk_data, previous_hash
            )
            chunks.append(metadata)
            chunk_id += 1

    print(f"[MD CHUNKER] Split into {len(chunks)} chunks")
    return chunks

# ---------------------- TXT CHUNKER ----------------------
def chunk_txt(file_path, delimiter=None, chunk_size=512, buffer=8):
    file_path = Path(file_path)
    filename = file_path.stem
    filetype = "txt"

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
                metadata = build_chunk_metadata(
                    filename, filetype, chunk_id, page_number, part, previous_hash
                )
                chunks.append(metadata)
                chunk_id += 1
    else:
        words = content.split()
        total_words = len(words)

        print(f"[TXT CHUNKER] Splitting by {chunk_size} words with {buffer} word overlap")

        for i in range(0, total_words, chunk_size):
            start = i
            end = min(i + chunk_size + buffer, total_words)
            chunk_words = words[start:end]
            chunk_data = " ".join(chunk_words)

            page_number = (i // chunk_size) + 1
            metadata = build_chunk_metadata(
                filename, filetype, chunk_id, page_number, chunk_data, previous_hash
            )
            chunks.append(metadata)
            chunk_id += 1

    print(f"[TXT CHUNKER] Split into {len(chunks)} chunks")
    return chunks

# ---------------------- FILE CATEGORIZATION ----------------------
def categorize_files(
    input_data: Union[str, Path, List[Union[str, Path]]]
) -> Dict[str, List[Path]]:
    categorized = {"docx": [], "pdf": [], "md": [], "txt": []}

    # Case 1: folder path
    if isinstance(input_data, (str, Path)):
        folder = Path(input_data)
        files = [f for f in folder.iterdir() if f.is_file()]
    
    # Case 2: list of file paths
    elif isinstance(input_data, list):
        files = [Path(f) for f in input_data if Path(f).is_file()]
    
    else:
        raise ValueError("Input must be a folder path or a list of file paths")

    # Categorize
    for file in files:
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
def process_chunks(categorized, chunk_size=None, delimeter=None, buffer=8):
    results = []

    for ext, files in categorized.items():
        for file in files:
            if ext == "docx":
                results.extend(chunk_docx(file, chunk_size=chunk_size, buffer=buffer))
            elif ext == "pdf":
                results.extend(chunk_pdf(file, chunk_size=chunk_size, buffer=buffer))
            elif ext == "md":
                if chunk_size is not None:
                    results.extend(chunk_md(file, chunk_size=chunk_size, delimeter=delimeter, buffer=buffer))
                else:
                    results.extend(chunk_md(file))
            elif ext == "txt":
                if chunk_size is not None:
                    results.extend(chunk_txt(file, chunk_size=chunk_size, delimeter=delimeter, buffer=buffer))
                else:
                    results.extend(chunk_txt(file))

    return results