import sys
import os
import socket
import uvicorn

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
sys.path.insert(0, backend_dir)

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == "__main__":
    local_ip = get_local_ip()
    print(f"Starting DALOR server from {backend_dir} on http://0.0.0.0:8000 (Local Wi-Fi: http://{local_ip}:8000) ...", flush=True)
    try:
        uvicorn.run("app.main:app", host="0.0.0.0", port=8000, log_level="info", reload=False)
    except Exception as e:
        import traceback
        with open("server_crash.log", "w", encoding="utf-8") as f:
            traceback.print_exc(file=f)
        print(f"CRASH: {e}", flush=True)
