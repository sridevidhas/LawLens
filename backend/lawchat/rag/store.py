import os
from pathlib import Path
import chromadb
from sentence_transformers import SentenceTransformer
from django.conf import settings
_EMBEDDER=None
_CLIENT=None
_COLLECTION=None

def get_embedder():
    global _EMBEDDER
    if _EMBEDDER is None: _EMBEDDER=SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    return _EMBEDDER

def get_collection():
    global _CLIENT, _COLLECTION
    if _COLLECTION is None:
        path=Path(settings.BASE_DIR)/os.getenv('CHROMA_PATH','chroma_db'); path.mkdir(parents=True, exist_ok=True)
        _CLIENT=chromadb.PersistentClient(path=str(path))
        _COLLECTION=_CLIENT.get_or_create_collection('lawlens_legal_chunks', metadata={'hnsw:space':'cosine'})
    return _COLLECTION

def ingest_chunks(source_name, chunks):
    if not chunks: return 0
    collection=get_collection(); embedder=get_embedder()
    # Replace existing chunks for the same source to avoid duplicates on re-ingestion.
    old=collection.get(where={'source':source_name}, include=['metadatas'])
    if old.get('ids'): collection.delete(ids=old['ids'])
    ids=[f"{source_name}::p{c['page']}::c{i}" for i,c in enumerate(chunks)]
    texts=[c['text'] for c in chunks]
    vectors=embedder.encode(texts, normalize_embeddings=True).tolist()
    metadatas=[{'source':source_name,'page':int(c['page']),'chunk_index':i} for i,c in enumerate(chunks)]
    collection.add(ids=ids, documents=texts, embeddings=vectors, metadatas=metadatas)
    return len(chunks)
