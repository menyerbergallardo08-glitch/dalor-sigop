import time
import threading
from typing import Dict, List
from fastapi import Request, HTTPException

# Lock to guarantee thread safety in multi-threaded Uvicorn workers
_login_lock = threading.Lock()
_login_failures: Dict[str, List[float]] = {}

_ocr_lock = threading.Lock()
_ocr_requests: Dict[str, List[float]] = {}

# Security settings
LOGIN_WINDOW_SECONDS = 60
MAX_LOGIN_FAILURES = 5

OCR_WINDOW_SECONDS = 60
MAX_OCR_REQUESTS = 30  # Max 30 scans per minute per IP to protect Gemini quotas


def get_client_ip(request: Request) -> str:
    """
    Extracts real client IP resolving reverse proxy headers (Render, Cloudflare, Nginx).
    """
    if not request:
        return "127.0.0.1"

    # Cloudflare header
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()

    # Standard proxy forwarding (first IP is the real client)
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        parts = forwarded_for.split(",")
        if parts:
            return parts[0].strip()

    # Real IP header
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    # Direct client connection
    if request.client and request.client.host:
        return request.client.host

    return "127.0.0.1"


def check_login_rate_limit(request: Request) -> None:
    """
    Checks if client IP has exceeded failed login attempts within the sliding window.
    Raises HTTPException(429) if exceeded.
    """
    ip = get_client_ip(request)
    now = time.time()

    with _login_lock:
        timestamps = _login_failures.get(ip, [])
        # Keep only attempts within the window
        valid_timestamps = [t for t in timestamps if now - t < LOGIN_WINDOW_SECONDS]
        _login_failures[ip] = valid_timestamps

        if len(valid_timestamps) >= MAX_LOGIN_FAILURES:
            wait_time = int(LOGIN_WINDOW_SECONDS - (now - valid_timestamps[0])) + 1
            raise HTTPException(
                status_code=429,
                detail=f"Demasiados intentos fallidos. Por seguridad, espere {max(1, wait_time)} segundos antes de intentar nuevamente."
            )


def record_login_failure(request: Request) -> None:
    """
    Records a failed login attempt for the client IP.
    """
    ip = get_client_ip(request)
    now = time.time()

    with _login_lock:
        if ip not in _login_failures:
            _login_failures[ip] = []
        _login_failures[ip].append(now)

        # Cleanup if table grows excessively
        if len(_login_failures) > 10000:
            expired_keys = [k for k, v in _login_failures.items() if not v or (now - v[-1] >= LOGIN_WINDOW_SECONDS)]
            for k in expired_keys:
                _login_failures.pop(k, None)


def record_login_success(request: Request) -> None:
    """
    Resets the failed login counter upon successful authentication.
    """
    ip = get_client_ip(request)
    with _login_lock:
        _login_failures.pop(ip, None)


def check_ocr_rate_limit(request: Request) -> None:
    """
    Guards Gemini Vision API and R2 uploads from burst spamming / denial of wallet.
    Raises HTTPException(429) if exceeded.
    """
    ip = get_client_ip(request)
    now = time.time()

    with _ocr_lock:
        timestamps = _ocr_requests.get(ip, [])
        valid_timestamps = [t for t in timestamps if now - t < OCR_WINDOW_SECONDS]

        if len(valid_timestamps) >= MAX_OCR_REQUESTS:
            wait_time = int(OCR_WINDOW_SECONDS - (now - valid_timestamps[0])) + 1
            raise HTTPException(
                status_code=429,
                detail=f"Límite de solicitudes de escaneo OCR alcanzado ({MAX_OCR_REQUESTS}/min). Por favor espere {max(1, wait_time)} segundos."
            )

        valid_timestamps.append(now)
        _ocr_requests[ip] = valid_timestamps

        # Cleanup table if too many tracked IPs
        if len(_ocr_requests) > 10000:
            expired_keys = [k for k, v in _ocr_requests.items() if not v or (now - v[-1] >= OCR_WINDOW_SECONDS)]
            for k in expired_keys:
                _ocr_requests.pop(k, None)
