"""Thin async wrapper around any OpenAI-compatible LLM endpoint."""
from __future__ import annotations

import httpx

from app.core.config import get_settings

_TIMEOUT = httpx.Timeout(60.0)


async def chat(messages: list[dict], *, temperature: float = 0.7, max_tokens: int = 2048) -> str:
    """Send a chat request and return the assistant content string."""
    settings = get_settings()
    if not settings.llm_api_key:
        raise RuntimeError("LLM_API_KEY is not configured")

    payload = {
        "model": settings.llm_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    headers = {
        "Authorization": f"Bearer {settings.llm_api_key}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(
            f"{settings.llm_base_url}/chat/completions",
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
