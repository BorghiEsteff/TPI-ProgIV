from rest_framework import permissions


def is_admin_user(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and (getattr(user, "role", None) == "ADMIN" or user.is_superuser)
    )


class IsAdminRole(permissions.BasePermission):
    """Permite acceso exclusivamente a usuarios autenticados con rol ADMIN."""

    def has_permission(self, request, view):
        return is_admin_user(request.user)


class IsAdminOrReadOnly(permissions.BasePermission):
    """Lectura pública (SAFE_METHODS); escritura exclusiva para ADMIN."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return is_admin_user(request.user)
