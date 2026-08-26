import logging
from pypdf import PdfReader
from typing import Tuple

logger = logging.getLogger(__name__)

MAX_EXTRACT_CHARS = 10000  # Cap extracted text length for LLM processing

class PDFExtractionError(Exception):
    """Custom exception raised when PDF text extraction fails or yields empty text."""
    pass

def extract_text_from_pdf(filepath: str) -> Tuple[str, int]:
    """
    Extract text content from a PDF file using pypdf.
    Returns a tuple of (extracted_text, total_pages).
    Raises PDFExtractionError if file cannot be read or contains no extractable text.
    """
    try:
        reader = PdfReader(filepath)
        total_pages = len(reader.pages)
        if total_pages == 0:
            raise PDFExtractionError("PDF file contains 0 pages.")

        extracted_text_list = []
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                extracted_text_list.append(page_text.strip())

        full_text = "\n\n".join(extracted_text_list).strip()
        if not full_text:
            raise PDFExtractionError("PDF contains no extractable text. It may be scanned or image-only.")

        # Truncate text if exceeding MAX_EXTRACT_CHARS
        if len(full_text) > MAX_EXTRACT_CHARS:
            full_text = full_text[:MAX_EXTRACT_CHARS] + "\n\n[Note: Content truncated for AI summarization...]"

        return full_text, total_pages

    except PDFExtractionError:
        raise
    except Exception as e:
        logger.error(f"Error reading PDF file {filepath}: {e}")
        raise PDFExtractionError(f"Failed to process PDF file: {str(e)}")
