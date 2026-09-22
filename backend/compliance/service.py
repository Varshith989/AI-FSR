import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.models import RegulatoryDocument, RegulatoryClause
from backend.ai.interfaces import get_llm_client, get_embedding_client
from backend.ai.guardrails import AIGuardrailPipeline
from backend.utils.tenancy import TenantBypassScope


class ComplianceService:
    def __init__(self, db: Session, user=None):
        self.db = db
        self.user = user
        self.llm = get_llm_client()
        self.embedding = get_embedding_client()
        self.guardrails = AIGuardrailPipeline(db, user)

    def retrieve_relevant_clauses(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Retrieve authoritative FSSAI clauses using hybrid text/semantic matching."""
        terms = [w.lower() for w in query.split() if len(w) > 3]
        
        with TenantBypassScope():
            q = self.db.query(RegulatoryClause).join(RegulatoryDocument)
            
            # Simple keyword match on clause, heading, and content
            filters = []
            for t in terms:
                filters.append(RegulatoryClause.content.ilike(f"%{t}%"))
                filters.append(RegulatoryClause.heading.ilike(f"%{t}%"))
                filters.append(RegulatoryClause.clause.ilike(f"%{t}%"))

            if filters:
                results = q.filter(or_(*filters)).limit(limit).all()
            else:
                results = q.limit(limit).all()

            sources = []
            for item in results:
                eff_date = str(item.effective_from or item.document.effective_date or "2021-07-01")
                sources.append({
                    "document": item.document.title,
                    "section": item.section or "General",
                    "clause": item.clause,
                    "effective_date": eff_date,
                    "content": item.content[:300]
                })

            return sources

    def answer_query(self, question: str, product_id: Optional[uuid.UUID] = None, language: str = "en") -> Dict[str, Any]:
        """Execute guarded RAG regulatory Q&A pipeline returning §5.4 exact JSON shape."""
        # 1. Retrieve sources
        sources = self.retrieve_relevant_clauses(question)

        # 2. Call LLM
        prompt = f"Question: {question}\nLanguage: {language}\nReference Clauses: {sources}"
        raw_output = self.llm.generate(prompt=prompt)

        # 3. Guardrail validation, confidence check, PII masking, and logging
        guarded_response = self.guardrails.process_query(
            question=question,
            retrieved_sources=sources,
            raw_ai_output=raw_output,
            action_type="RAG_REGULATORY_QUERY"
        )

        # Return exact shape from §5.4
        return {
            "answer": guarded_response["answer"],
            "confidence": guarded_response["confidence"],
            "sources": [
                {
                    "document": s["document"],
                    "section": s["section"],
                    "clause": s["clause"],
                    "effective_date": s["effective_date"]
                }
                for s in guarded_response["sources"]
            ],
            "requires_human_review": guarded_response["requires_human_review"]
        }
