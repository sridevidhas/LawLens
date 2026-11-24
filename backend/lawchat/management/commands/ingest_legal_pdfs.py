import os
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand
from lawchat.rag.pdf import extract_pdf_pages, chunk_pages
from lawchat.rag.store import ingest_chunks
class Command(BaseCommand):
    help='Extract and index PDF files from the configured legal documents folder.'
    def handle(self, *args, **options):
        folder=Path(settings.BASE_DIR)/os.getenv('LEGAL_DOCS_PATH','legal_docs')
        folder.mkdir(parents=True,exist_ok=True)
        pdfs=sorted(folder.glob('*.pdf'))
        if not pdfs:
            self.stdout.write(self.style.WARNING(f'No PDFs found in {folder}. Add text-based legal PDFs and run this command again.')); return
        total=0
        for path in pdfs:
            pages=extract_pdf_pages(path); chunks=chunk_pages(pages)
            count=ingest_chunks(path.name,chunks); total+=count
            self.stdout.write(self.style.SUCCESS(f'{path.name}: indexed {count} chunks from {len(pages)} text pages'))
        self.stdout.write(self.style.SUCCESS(f'Finished. Indexed {total} chunks.'))
