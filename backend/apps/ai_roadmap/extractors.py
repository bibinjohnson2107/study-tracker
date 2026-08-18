import os
from pypdf import PdfReader
import docx

def extract_text_from_file(file_obj, filename: str) -> str:
    """Extract plain text from uploaded TXT, MD, PDF, or DOCX files."""
    ext = os.path.splitext(filename)[1].lower()
    
    if ext in ['.txt', '.md']:
        return file_obj.read().decode('utf-8', errors='ignore')
        
    elif ext == '.pdf':
        reader = PdfReader(file_obj)
        extracted = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted.append(text)
        return "\n".join(extracted)
        
    elif ext == '.docx':
        doc = docx.Document(file_obj)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paragraphs)
        
    else:
        # Fallback to UTF-8 decoding
        try:
            return file_obj.read().decode('utf-8', errors='ignore')
        except Exception:
            raise ValueError(f"Unsupported file format: {ext}")
