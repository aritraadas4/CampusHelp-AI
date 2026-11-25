import os
import uuid
from pathlib import Path
from typing import Dict, Any
from fastapi import UploadFile, HTTPException, status
from backend.config import UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_EXTENSIONS

def validate_magic_bytes(header: bytes, ext: str) -> bool:
    """Validates file magic numbers to ensure genuine file types."""
    if ext in {".jpg", ".jpeg"}:
        return header.startswith(b"\xff\xd8\xff")
    elif ext == ".png":
        return header.startswith(b"\x89PNG\r\n\x1a\n")
    elif ext == ".webp":
        return len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP"
    elif ext == ".pdf":
        return header.startswith(b"%PDF")
    return False

async def save_upload_file(file: UploadFile) -> Dict[str, Any]:
    """
    Safely saves an uploaded file with strict validation (Requirement #6):
    - Extension checking
    - File size limits (Max 5MB)
    - Magic number / binary header verification
    - UUID filename sanitization to eliminate path traversal
    """
    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # Read binary header for magic byte verification
    header = await file.read(16)
    if not validate_magic_bytes(header, ext):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File header mismatch. The file content does not match extension '{ext}'."
        )

    # Read remainder and verify size
    rest_of_file = await file.read()
    file_bytes = header + rest_of_file
    file_size = len(file_bytes)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of 5 MB (received {file_size / (1024*1024):.2f} MB)."
        )

    # Generate unique nonces to prevent collision and path traversal
    safe_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = UPLOAD_DIR / safe_name

    with open(dest_path, "wb") as f:
        f.write(file_bytes)

    return {
        "filename": safe_name,
        "original_name": filename,
        "file_url": f"/api/uploads/{safe_name}",
        "size_bytes": file_size
    }
