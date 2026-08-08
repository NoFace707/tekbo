"""Rutas mínimas usadas por las pruebas unitarias."""

from django.urls import include, path


urlpatterns = [
    path("api/dashboard/", include("dashboard.urls")),
    path("api/sales/", include("sales.urls")),
]
