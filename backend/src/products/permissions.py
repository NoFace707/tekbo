"""
Permissions del catálogo de productos.

Single Responsibility: definir quién puede leer / escribir productos.

Reglas:
    - Lectura (list/retrieve): cualquier usuario autenticado
      (admin, supervisor y vendedor necesitan ver el catálogo para
      construir proformas/recibos).
    - Escritura (create/update/delete): solo admin.

Liskov Substitution: estas clases cumplen el contrato de DRF
(has_permission / has_object_permission) y pueden sustituirse en
cualquier viewset.
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrReadOnlyCatalog(BasePermission):
    """Admin escribe; cualquiera autenticado lee."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return bool(getattr(user, "is_admin", False))

    def has_object_permission(self, request, view, obj):
        # La regla a nivel objeto es la misma que a nivel vista.
        return self.has_permission(request, view)
