"""
Production relay for Traceloop trace export.

Browsers cannot POST to https://api.traceloop.com directly (no CORS headers on
the ingest endpoint), and the API key must never ship in the client bundle.
This same-origin function forwards the OTLP payload upstream with the
Authorization header injected from the TRACELOOP_API_KEY environment variable.
"""
import os
import requests
from flask import Flask, Response, request

app = Flask(__name__)

UPSTREAM_URL = "https://api.traceloop.com/v1/traces"


@app.route("/api/traceloop", methods=["POST", "OPTIONS"])
def relay():
    if request.method == "OPTIONS":
        return Response(status=204)

    api_key = os.environ.get("TRACELOOP_API_KEY")
    if not api_key:
        return Response(
            '{"error": "TRACELOOP_API_KEY is not configured"}',
            status=500,
            mimetype="application/json",
        )

    upstream = requests.post(
        UPSTREAM_URL,
        data=request.get_data(),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": request.headers.get("Content-Type", "application/json"),
        },
        timeout=15,
    )
    return Response(upstream.content, status=upstream.status_code, mimetype=upstream.headers.get("Content-Type", "application/json"))
