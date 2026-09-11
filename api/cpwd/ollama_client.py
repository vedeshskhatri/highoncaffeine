"""
Local Ollama Integration Client for Grounded CPWD AI System.
Communicates strictly with local Ollama instance (http://localhost:11434).
Zero cloud API calls. Configurable models, deterministic temperature, health checks,
and fallback synthesis when models are not installed.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger("cpwd.ollama")

# Configurable environment settings
DEFAULT_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_CHAT_MODEL = os.environ.get("OLLAMA_CHAT_MODEL", "llama3.2")
DEFAULT_EMBED_MODEL = os.environ.get("OLLAMA_EMBED_MODEL", "nomic-embed-text")
DEFAULT_TEMPERATURE = float(os.environ.get("OLLAMA_TEMPERATURE", "0.0"))

SYSTEM_PROMPT = """You are the official CPWD (Central Public Works Department) Knowledge Assistant for Horticulture & Landscaping.
Your primary objective is to provide 100% grounded answers based ONLY on the provided CPWD DSR/DAR & Specifications records.

CRITICAL RULES:
1. Grounding: Answer using ONLY the retrieved source records.
2. No Inventions: Never invent, assume, or fabricate any CPWD item code, description, unit, rate, or specification.
3. Insufficient Info: If the retrieved records do not contain the answer, explicitly state:
   "The provided CPWD DSR/DAR documents do not contain sufficient information to answer this."
4. Distinguish Categories:
   - SOURCE FACT: Directly stated values from CPWD books (rates, units, pages).
   - CALCULATION: Deterministic arithmetic computed by the backend (e.g. Quantity × Rate, % Change).
   - INFERENCE: Factual contextual explanation based on the text.
5. Traceability: Always cite the source: Document, Edition Year, Page Number, Section, and Item Code.
6. Units: Never alter official units (e.g. cum, sqm, day, each).
"""


class OllamaClient:
    """Interface to local Ollama inference engine."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        chat_model: Optional[str] = None,
        embed_model: Optional[str] = None,
        temperature: Optional[float] = None,
    ):
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        self.chat_model = chat_model or DEFAULT_CHAT_MODEL
        self.embed_model = embed_model or DEFAULT_EMBED_MODEL
        self.temperature = temperature if temperature is not None else DEFAULT_TEMPERATURE

    def check_health(self) -> Dict[str, Any]:
        """Check Ollama service status and available models."""
        try:
            with httpx.Client(timeout=3.0) as client:
                res = client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    chat_model_available = any(self.chat_model in m for m in models)
                    embed_model_available = any(self.embed_model in m for m in models)

                    return {
                        "running": True,
                        "base_url": self.base_url,
                        "configured_chat_model": self.chat_model,
                        "configured_embed_model": self.embed_model,
                        "models_installed": models,
                        "chat_model_available": chat_model_available,
                        "embed_model_available": embed_model_available,
                        "instructions": None if chat_model_available else f"Run: ollama pull {self.chat_model}",
                    }
        except Exception as e:
            return {
                "running": False,
                "base_url": self.base_url,
                "configured_chat_model": self.chat_model,
                "configured_embed_model": self.embed_model,
                "models_installed": [],
                "chat_model_available": False,
                "embed_model_available": False,
                "error": str(e),
                "instructions": "Ollama service is not responding. Start Ollama with 'ollama serve'.",
            }

        return {
            "running": False,
            "base_url": self.base_url,
            "configured_chat_model": self.chat_model,
            "configured_embed_model": self.embed_model,
            "models_installed": [],
            "chat_model_available": False,
            "embed_model_available": False,
            "instructions": "Start Ollama with 'ollama serve'.",
        }

    def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate text embedding vector using local Ollama model."""
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(
                    f"{self.base_url}/api/embeddings",
                    json={"model": self.embed_model, "prompt": text},
                )
                if res.status_code == 200:
                    return res.json().get("embedding")
        except Exception as e:
            logger.debug(f"Local embedding generation skipped ({e})")
        return None

    def generate_grounded_response(
        self,
        query: str,
        context_text: str,
        structured_records: List[Dict[str, Any]],
        calculations: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Generate response grounded in retrieved CPWD records.

        If Ollama is offline or model is missing, gracefully constructs a formatted
        grounded answer directly from the structured records.
        """
        health = self.check_health()

        # Build prompt for LLM
        calc_str = f"\nCALCULATIONS (Precomputed by backend):\n{calculations}\n" if calculations else ""
        user_prompt = f"""USER QUESTION:
{query}

RETRIEVED CPWD SOURCE DATA:
{context_text}
{calc_str}

Please answer the user question using ONLY the retrieved CPWD data above.
Include exact item codes, rates, units, and page citations.
"""

        if health["running"] and health["chat_model_available"]:
            try:
                with httpx.Client(timeout=25.0) as client:
                    payload = {
                        "model": self.chat_model,
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt},
                        ],
                        "options": {
                            "temperature": self.temperature,
                            "top_k": 5,
                        },
                        "stream": False,
                    }
                    res = client.post(f"{self.base_url}/api/chat", json=payload)
                    if res.status_code == 200:
                        llm_text = res.json().get("message", {}).get("content", "").strip()
                        return {
                            "answer": llm_text,
                            "engine": f"ollama/{self.chat_model}",
                            "ollama_available": True,
                        }
            except Exception as e:
                logger.warning(f"Ollama chat error: {e}")

        # Deterministic Grounded Fallback (zero hallucinations, pure DB facts)
        return {
            "answer": self._build_deterministic_response(query, structured_records, calculations),
            "engine": "cpwd_deterministic_engine (Ollama offline/model pending)",
            "ollama_available": health["running"],
            "ollama_note": health.get("instructions"),
        }

    def _build_deterministic_response(
        self,
        query: str,
        records: List[Dict[str, Any]],
        calculations: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Construct deterministic grounded response when Ollama is offline."""
        if not records and not calculations:
            return "The provided CPWD DSR/DAR documents do not contain sufficient information to answer this."

        parts = []

        if calculations:
            if "total_amount" in calculations:
                parts.append(
                    f"### [CALCULATION]\n"
                    f"**Item Code:** {calculations.get('item_code')}\n"
                    f"**Formula:** {calculations.get('calculation_formula')}\n"
                    f"**Total Estimate:** ₹{calculations.get('total_amount'):,.2f}\n"
                )
            elif "percentage_change" in calculations:
                parts.append(
                    f"### [CALCULATION: ITEM RATE COMPARISON]\n"
                    f"**Item Code:** {calculations.get('item_code')}\n"
                    f"**Description:** {calculations.get('description')}\n"
                    f"- {calculations.get('year_old')} Rate: ₹{calculations.get('rate_old')} / {calculations.get('unit_old')}\n"
                    f"- {calculations.get('year_new')} Rate: ₹{calculations.get('rate_new')} / {calculations.get('unit_new')}\n"
                    f"- **Absolute Change:** {'+' if calculations.get('absolute_change', 0) > 0 else ''}₹{calculations.get('absolute_change')}\n"
                    f"- **Percentage Change:** {'+' if calculations.get('percentage_change', 0) > 0 else ''}{calculations.get('percentage_change')}%\n"
                )
            elif "total_compared" in calculations:
                parts.append(
                    f"### [CALCULATION: MULTI-YEAR EDITION COMPARISON]\n"
                    f"**Comparing CPWD {calculations.get('year_old')} vs CPWD {calculations.get('year_new')}**\n"
                    f"- **Total Common Items Analyzed:** {calculations.get('total_compared')}\n"
                    f"- **Items with Rate Escalation:** {calculations.get('items_increased')}\n"
                    f"- **Items with Rate Reduction/Steady:** {calculations.get('items_decreased')}\n"
                    f"- **New Items Added in {calculations.get('year_new')}:** {calculations.get('new_items_count')}\n"
                    f"- **Items Discontinued from {calculations.get('year_old')}:** {calculations.get('removed_items_count')}\n\n"
                    f"**Top Rate Increases:**\n"
                )
                for top in calculations.get("top_rate_increases", [])[:5]:
                    parts.append(
                        f"  • Item {top['item_code']} ({top['description'][:40]}...): "
                        f"₹{top['rate_old']} → ₹{top['rate_new']} (+{top['percentage_change']}%)\n"
                    )

        if records:
            parts.append("### [SOURCE FACT: OFFICIAL CPWD RECORDS]")
            for r in records[:5]:
                code = r.get("item_code") or r.get("code") or "N/A"
                desc = r.get("description") or r.get("trade_name") or r.get("title") or ""
                unit = r.get("unit") or "N/A"
                rate = r.get("rate")
                rate_str = f"₹{rate:,.2f}" if rate is not None else "N/A"
                year = r.get("rate_year") or r.get("year") or r.get("document_year") or "N/A"
                page = r.get("page") or "N/A"
                doc = r.get("source_document") or f"CPWD DSR {year}"

                parts.append(
                    f"- **Item {code} ({year}):** {desc}\n"
                    f"  - **Unit:** {unit} | **Official Rate:** {rate_str}\n"
                    f"  - **Source:** {doc}, Page {page}\n"
                )

        return "\n".join(parts)
