"""
Permissions del módulo de ventas.

Single Responsibility: definir quién puede operar sobre documentos.

Reglas:
    - Cualquier usuario autenticado puede listar/ver documentos propios.
    - Admin puede ver todos.
    - Crear/Editar/Transicionar: el propio vendedor dueño o admin.

Liskov Substitution: cumple el contrato de DRF.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrDocumentOwner(BasePermission):
    """Lectura gerencial; escritura limitada a admin o propietario."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        # Una venta solo nace desde un vendedor o por intervención admin.
        if getattr(view, "action", None) == "create":
            return getattr(user, "is_admin", False) or getattr(
                user, "is_vendedor", False
            )
        return True  # la restricción por objeto se aplica abajo

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS and (
            getattr(user, "is_admin", False)
            or getattr(user, "is_supervisor", False)
        ):
            return True
        if getattr(user, "is_admin", False):
            return True
        # Documento propio.
        return getattr(obj, "vendedor_id", None) == user.id
