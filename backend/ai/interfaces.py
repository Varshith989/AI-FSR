import abc
import hashlib
from typing import List, Dict, Any, Optional
from backend.config import settings


class BaseLLMClient(abc.ABC):
    @abc.abstractmethod
    def generate(self, prompt: str, system_prompt: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """Generate text and return answer, confidence, and metadata."""
        pass


class BaseEmbeddingClient(abc.ABC):
    @abc.abstractmethod
    def embed_text(self, text: str) -> List[float]:
        """Generate dense vector embedding of dimension settings.EMBEDDING_DIMENSION."""
        pass

    @abc.abstractmethod
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        pass


class MockEmbeddingClient(BaseEmbeddingClient):
    """Deterministic embedding client for fast, reliable local execution without external API keys."""
    def __init__(self, dim: int = 1536):
        self.dim = dim

    def embed_text(self, text: str) -> List[float]:
        # Generate pseudo-embedding vector derived from SHA-256 hash of the normalized text
        h = hashlib.sha256(text.lower().strip().encode("utf-8")).digest()
        vec = []
        for i in range(self.dim):
            byte_val = h[i % len(h)]
            norm_val = (byte_val / 255.0) * 2.0 - 1.0
            vec.append(round(norm_val, 6))
        # Normalize to unit length
        norm = sum(x * x for x in vec) ** 0.5
        if norm > 0:
            vec = [round(x / norm, 6) for x in vec]
        return vec

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        return [self.embed_text(t) for t in texts]


class MockLLMClient(BaseLLMClient):
    """High-fidelity regulatory and compliance LLM mock generator."""
    def generate(self, prompt: str, system_prompt: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        lower_prompt = prompt.lower()
        confidence = 0.94
        requires_human_review = False
        flags = []

        # Check for ambiguous or conflicting triggers
        if "conflict" in lower_prompt or "differing" in lower_prompt or "amended" in lower_prompt:
            confidence = 0.65
            requires_human_review = True
            flags.append("CONFLICTING_REGULATIONS")

        # Check for high impact action triggers
        if "quarantine" in lower_prompt or "recall" in lower_prompt or "release" in lower_prompt:
            requires_human_review = True
            flags.append("HIGH_IMPACT_ACTION")

        if "pasteuriz" in lower_prompt or "milk" in lower_prompt:
            answer = (
                "Under FSSAI Licensing and Registration Regulations 2011 (Schedule 4, Part 3), "
                "pasteurized milk must be stored and transported at or below 4°C throughout the cold chain. "
                "Facilities must maintain automated temperature logging, continuous flow diversion valves, and CIP cycles."
            )
        elif "allergen" in lower_prompt:
            answer = (
                "Under FSSAI (Packaging and Labelling) Regulations 2020 (Regulation 5(3)), packaged food must "
                "distinctly declare common allergens including cereals containing gluten, crustaceans, milk, and nuts "
                "both in the ingredients list and with explicit label warnings."
            )
        elif "petty" in lower_prompt or "registration" in lower_prompt:
            answer = (
                "Petty food business operators with an annual turnover up to Rs. 12 Lakhs are required to obtain "
                "an FSSAI Registration under Regulation 2.1.1 rather than an FSSAI State or Central License."
            )
        else:
            answer = (
                f"FSSAI statutory regulations mandate strict compliance with Good Hygienic Practices (GHP) and "
                f"Hazard Analysis and Critical Control Points (HACCP) under Schedule 4."
            )

        return {
            "answer": answer,
            "confidence": confidence,
            "requires_human_review": requires_human_review,
            "flags": flags,
            "model_version": "safefood-llm-v1.0"
        }


def get_llm_client() -> BaseLLMClient:
    return MockLLMClient()


def get_embedding_client() -> BaseEmbeddingClient:
    return MockEmbeddingClient(dim=settings.EMBEDDING_DIMENSION)
