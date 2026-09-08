import time
import sys
from pycloudflared import try_cloudflare

def main():
    print("Iniciando túnel seguro Cloudflare hacia http://127.0.0.1:8000 ...", flush=True)
    tunnel_url = try_cloudflare(port=8000)
    print("=" * 60, flush=True)
    print(">>> TU SISTEMA ESTÁ EN LÍNEA A NIVEL MUNDIAL <<<", flush=True)
    print(f"URL PÚBLICA SEGURA (HTTPS): {tunnel_url.tunnel}", flush=True)
    print("=" * 60, flush=True)
    
    with open("public_url.txt", "w", encoding="utf-8") as f:
        f.write(f"{tunnel_url.tunnel}\n")
    
    with open(r"C:\Users\GATEWAY\.gemini\antigravity\scratch\dalor-sigop\backend\public_url.txt", "w", encoding="utf-8") as f:
        f.write(f"{tunnel_url.tunnel}\n")
    
    # Mantener el proceso vivo indefinidamente
    while True:
        time.sleep(3600)

if __name__ == "__main__":
    main()
