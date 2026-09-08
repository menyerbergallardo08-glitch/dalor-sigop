# GUIA DE DESPLIEGUE EN LA NUBE - DALOR SIGO-P

Este repositorio contiene todo lo necesario para desplegar el sistema en un enlace permanente 24/7 de alta disponibilidad.

## Opciones Recomendadas para Despliegue Fijo

### 1. Render.com (Recomendado - Facil y Rapido)
1. Sube este proyecto a un repositorio privado en GitHub / GitLab.
2. Inicia sesion en [Render.com](https://render.com).
3. Haz clic en **New +** -> **Blueprint**.
4. Selecciona tu repositorio. Render detectara automaticamente el archivo ender.yaml y configurara el servicio Web con Docker y almacenamiento persistente para la base de datos y fotografias.
5. Obtendras una URL permanente tipo: https://dalor-sigop.onrender.com o puedes vincular un dominio personalizado (ej. sigo.dalor.com.ve).

### 2. Railway.app
1. Inicia sesion en [Railway.app](https://railway.app).
2. Haz clic en **New Project** -> **Deploy from GitHub repo**.
3. Railway compilara el Dockerfile automaticamente.
4. En 'Settings' -> 'Networking', genera un dominio publico permanente.

### 3. Servidor VPS Propio (Ubuntu / Debian / Docker)
`ash
# Clonar repositorio
git clone <tu-repo-url>
cd dalor-sigop

# Construir imagen Docker
docker build -t dalor-sigop .

# Ejecutar contenedor permanente con reinicio automatico
docker run -d --name dalor_erp -p 8005:8005 --restart always dalor-sigop
`

---
*DALOR SIGO-P - Sistema Integrado de Gestion Operativa y Proyectos*
