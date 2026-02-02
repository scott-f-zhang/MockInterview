# Copyright AGNTCY Contributors (https://github.com/agntcy)
# SPDX-License-Identifier: Apache-2.0

"""Extract plain text from uploaded PDF and DOCX files for resume/JD context."""

import logging
from io import BytesIO
from typing import Union

from docx import Document as DocxDocument
from fastapi import UploadFile
from pypdf import PdfReader

logger = logging.getLogger("mock_interview.exchange.document_extract")

PDF_MIME = "application/pdf"
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def extract_text_from_pdf(source: Union[str, bytes, BytesIO]) -> str:
    """Extract text from a PDF file. source can be path, bytes, or file-like."""
    if isinstance(source, bytes):
        source = BytesIO(source)
    reader = PdfReader(source)
    parts = []
    for page in reader.pages:
        try:
            text = page.extract_text()
            if text:
                parts.append(text)
        except (AttributeError, IndexError, TypeError) as e:
            logger.warning("Failed to extract text from PDF page: %s", e)
    return "\n\n".join(parts) if parts else ""


def extract_text_from_docx(source: Union[str, bytes, BytesIO]) -> str:
    """Extract text from a DOCX file. source can be path, bytes, or file-like."""
    if isinstance(source, bytes):
        source = BytesIO(source)
    doc = DocxDocument(source)
    parts = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(parts) if parts else ""


def _get_content_type_or_suffix(upload: UploadFile) -> tuple[Union[str, None], str]:
    """Return (content_type, lowercased suffix e.g. '.pdf')."""
    ct = (upload.content_type or "").strip().lower()
    name = upload.filename or ""
    suffix = ""
    if "." in name:
        suffix = name.rsplit(".", 1)[-1].lower()
        suffix = f".{suffix}"
    return ct or None, suffix


async def extract_text(upload: UploadFile) -> str:
    """
    Extract plain text from an uploaded file (PDF or DOCX).
    Raises ValueError if content type / extension is not supported or extraction fails.
    """
    content_type, suffix = _get_content_type_or_suffix(upload)
    raw = await upload.read()
    if not raw:
        raise ValueError("Empty file")

    if content_type == PDF_MIME or suffix == ".pdf":
        try:
            return extract_text_from_pdf(BytesIO(raw)).strip()
        except Exception as e:
            logger.exception("PDF extraction failed")
            raise ValueError(f"Failed to extract text from PDF: {e}") from e

    if content_type == DOCX_MIME or suffix == ".docx":
        try:
            return extract_text_from_docx(BytesIO(raw)).strip()
        except Exception as e:
            logger.exception("DOCX extraction failed")
            raise ValueError(f"Failed to extract text from DOCX: {e}") from e

    raise ValueError(
        f"Unsupported file type. Use {PDF_MIME} or {DOCX_MIME} (or .pdf / .docx)."
    )
