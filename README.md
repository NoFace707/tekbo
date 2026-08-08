# Proyecto: Login + Gestion de Usuarios + Productos + Generador Tekbo (React + Django + PostgreSQL + Docker)

Sistema con:

- **Login** con JWT (access + refresh) + Firebase ID token opcional.
- **Gestion de usuarios** donde el rol `admin` puede crear, editar y eliminar usuarios.
- **Roles**: `admin`, `supervisor`, `vendedor`.
- **Dashboard simple** en la home de cada rol con KPIs basicos.
- **CRUD de productos** (solo admin): nombre, detalle, stock y costo (Bs).
- **Generador Tekbo V17** para el rol `vendedor`: recibo/proforma con
  historial de clientes, asistente rapido, **seleccion de productos del
  catalogo** e impresion a PDF. El monto a pagar se calcula automaticamente.
  El descuento de stock al vender **aun no** esta implementado (pendiente de
  discusion).
  Ver `TEKBO_README.md` para el detalle de arquitectura SOLID.

## Stack

| Capa       | Tecnologia                                   |
|------------|----------------------------------------------|
| Frontend   | React 18 + Vite + TailwindCSS + React Router |
| Backend    | Django 5 + DRF + SimpleJWT                   |
| Base datos | PostgreSQL 16                                |
| Orquestacion| Docker Compose                              |

## Estructura

```
.
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── requirements.txt
│   └── src/
│       ├── manage.py
│       ├── config/            # settings del proyecto Django
│       ├── users/             # app: usuarios, roles, auth (con Firebase)
│       ├── products/          # app: catálogo de productos (CRUD admin)
│       └── dashboard/         # app: KPIs por rol
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── App.jsx
        ├── context/AuthContext.jsx
        ├── services/          # apiClient, authService, usersService, dashboardService, productsService, tekbo/*
        ├── components/        # layout, routing, ui, tekbo/*
        ├── hooks/             # products/*, tekbo/*
        └── pages/             # LoginPage, HomePage, AdminUsersPage, AdminProductsPage, VendedorPanelPage, ProfilePage
```

## Puesta en marcha

1. Copia el env:
   ```bash
   cp .env.example .env
   ```
2. Levanta todo:
   ```bash
   docker compose up --build
   ```
3. En el primer arranque el backend crea las migraciones, aplica migrations y
   crea un superusuario inicial con los datos definidos en `.env`
   (`DJANGO_SUPERUSER_*`).

## Usuarios por defecto

| Usuario | Clave       | Rol      |
|---------|-------------|----------|
| admin   | admin123456 | admin    |

Una vez dentro, el admin puede crear usuarios `vendedor` y `supervisor` desde
la pantalla **Usuarios**.

## Puertos

- Frontend (Vite): `http://localhost:5173`
- Backend (Django): `http://localhost:8000`
- PostgreSQL: `localhost:5432`
