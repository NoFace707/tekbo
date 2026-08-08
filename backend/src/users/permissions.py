from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    """Solo administradores."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "is_admin", False)
        )


class IsAdminOrSupervisor(BasePermission):
    """Admin o supervisor (por ejemplo, lectura de usuarios)."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.is_admin or request.user.is_supervisor


class IsAdminOrReadOnlySelf(BasePermission):
    """Permite al admin todo; al propio usuario editar su perfil."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_admin:
            return True
        # No-admins solo pueden actuar sobre su propio ID
        target_pk = view.kwargs.get("pk")
        return str(request.user.pk) == str(target_pk) if target_pk else False
