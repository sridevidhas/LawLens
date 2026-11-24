import re
from .store import get_collection, get_embedder
_RERANKER=None

def exact_ipc_lookup(question):
    """Find chunks mentioning an explicitly named IPC section; retrieval remains document-grounded."""
    match=re.search(r'(?:IPC\s*)?(?:section|sec\.?|s\.)\s*(\d+[A-Z]?)', question, re.I)
    if not match: return []
    section=match.group(1)
    try:
        result=get_collection().get(where_document={'$contains':section}, include=['documents','metadatas'])
    except Exception:
        return []
    hits=[]
    for text, meta in zip(result.get('documents') or [], result.get('metadatas') or []):
        if re.search(rf'(?:section|sec\.?|s\.)\s*{re.escape(section)}', text, re.I):
            hits.append({'text':text,'metadata':meta,'score':1.0,'retrieval':'exact-section'})
    return hits[:8]

def retrieve(question, k=12):
    collection=get_collection()
    if collection.count() == 0: return []
    vector=get_embedder().encode([question], normalize_embeddings=True).tolist()[0]
    result=collection.query(query_embeddings=[vector], n_results=min(k, collection.count()), include=['documents','metadatas','distances'])
    hits=[]
    for doc, meta, distance in zip(result['documents'][0], result['metadatas'][0], result['distances'][0]):
        hits.append({'text':doc,'metadata':meta,'score':1-float(distance),'retrieval':'semantic'})
    return hits

def rerank(question, hits, top_n=5):
    global _RERANKER
    if not hits: return []
    try:
        if _RERANKER is None:
            from sentence_transformers import CrossEncoder
            _RERANKER=CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
        scores=_RERANKER.predict([(question,h['text']) for h in hits])
        for hit, score in zip(hits,scores): hit['rerank_score']=float(score)
        return sorted(hits,key=lambda h:h.get('rerank_score',h['score']),reverse=True)[:top_n]
    except Exception:
        # Keeps the app usable if cross-encoder download is unavailable; semantic ordering is fallback.
        return sorted(hits,key=lambda h:h['score'],reverse=True)[:top_n]

def get_relevant_sources(question):
    exact=exact_ipc_lookup(question)
    semantic=retrieve(question)
    seen=set(); merged=[]
    for hit in exact+semantic:
        key=(hit['metadata'].get('source'),hit['metadata'].get('page'),hit['text'][:80])
        if key not in seen: seen.add(key); merged.append(hit)
    return rerank(question, merged)
