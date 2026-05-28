"""Google OAuth2 helpers (import-only flow)."""
from __future__ import annotations

from urllib.parse import parse_qs, urlencode, urlparse

from google_auth_oauthlib.flow import Flow

from app.core.config import get_settings

SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]


def _client_config(settings) -> dict:
    return {
        "web": {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.google_redirect_uri],
        }
    }


def build_flow() -> Flow:
    settings = get_settings()
    flow = Flow.from_client_config(
        _client_config(settings),
        scopes=SCOPES,
        redirect_uri=settings.google_redirect_uri,
    )
    return flow


# state → code_verifier mapping for PKCE-free flow
_state_store: dict[str, str] = {}


def get_auth_url(state: str) -> str:
    flow = build_flow()
    url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=state,
        code_challenge=None,        # disable PKCE — server-side flow doesn't need it
        code_challenge_method=None,
    )
    # Strip any code_challenge params the library may have injected
    parsed = urlparse(url)
    params = {k: v[0] for k, v in parse_qs(parsed.query).items()
              if k not in ("code_challenge", "code_challenge_method")}
    clean_url = parsed._replace(query=urlencode(params)).geturl()
    return clean_url


def exchange_code(code: str) -> dict:
    """Exchange auth code → token dict with access_token, refresh_token, expiry."""
    flow = build_flow()
    flow.fetch_token(code=code)
    creds = flow.credentials
    return {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "expires_at": creds.expiry,
    }
