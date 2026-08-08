---
name: fullstack-secure-context
description: Arquitectura, convenciones y políticas estrictas de seguridad para un proyecto full-stack con React, Django, PostgreSQL y Docker.
---

# Contexto Full-Stack y Seguridad (React + Django + Postgres + Docker)

Utiliza esta skill al crear componentes, endpoints, modelos o configuraciones de despliegue para este proyecto.

## 1. Arquitectura y Estructura del Proyecto
- **Frontend (`/frontend`)**: React con Vite y TypeScript. Componentes en `src/components/`, páginas en `src/pages/`, lógica y llamadas a API en `src/services/`.
- **Backend (`/backend`)**: Django / Django REST Framework (DRF). Apps organizadas por dominios de negocio, serializers en `serializers.py`, lógica de negocio en `services.py` o `selectors.py` (evitar vistas o modelos gordos).
- **Contenedores (`/docker`)**: Entorno multi-contenedor gestionado con Docker Compose (`docker-compose.yml`) separando servicios de frontend, backend y base de datos.

## 2. Convenciones de Código y Estándares
- **Tipado estricto**: En React, prohibido el uso de `any`. En Django, tipado opcional pero recomendado usando type hints de Python.
- **Formato**: Seguir PEP 8 para Python/Django y Prettier/ESLint para React.

## 3. Seguridad y Datos Sensibles (Crítico)
- **Cero secretos en código**: Ninguna credencial de base de datos, `SECRET_KEY` de Django, tokens JWT o claves de API debe estar hardcodeada. Todo se gestiona estrictamente mediante variables de entorno (`.env`).
- **Configuración de Django (`settings.py`)**: 
  - `DEBUG` debe estar configurado dinámicamente mediante variables de entorno (nunca `True` en producción).
  - Configurar correctamente `ALLOWED_HOSTS`, CORS y cabeceras de seguridad HTTP.
- **Base de Datos (PostgreSQL)**: Las consultas deben realizarse mediante el ORM de Django usando parámetros seguros para prevenir inyecciones SQL. Evitar consultas RAW (`1.raw()`) a menos que sea estrictamente necesario y sanitizadas.
- **Autenticación y Validación**: 
  - Usar autenticación basada en tokens (ej. SimpleJWT en DRF).
  - Validar rigurosamente los datos de entrada tanto en los serializers de Django como en el frontend (usar Zod en React).
- **Docker**: Las imágenes base deben ser oficiales y actualizadas. No incluir archivos `.env` ni credenciales dentro de las imágenes de Docker (usar volúmenes o variables de entorno en tiempo de ejecución).