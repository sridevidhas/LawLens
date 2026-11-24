from pypdf import PdfReader

def extract_pdf_pages(path):
    reader=PdfReader(str(path)); pages=[]
    for number, page in enumerate(reader.pages, start=1):
        text=(page.extract_text() or '').strip()
        if text: pages.append({'page':number,'text':text})
    return pages

def chunk_pages(pages, chunk_size=1000, overlap=180):
    """Create overlapping character chunks while retaining PDF page/source metadata."""
    chunks=[]
    for page in pages:
        text=' '.join(page['text'].split())
        start=0
        while start < len(text):
            end=min(start+chunk_size, len(text))
            piece=text[start:end].strip()
            if piece: chunks.append({'text':piece,'page':page['page']})
            if end >= len(text): break
            start=max(0, end-overlap)
    return chunks
