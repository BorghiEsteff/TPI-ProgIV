from rest_framework import permissions


class IsCriticOrAdmin(permissions.BasePermission):
    """
    Permiso que autoriza el acceso a usuarios con rol 'CRITIC' o 'ADMIN',
    o a superusuarios de Django.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        return getattr(request.user, "role", None) in ["CRITIC", "ADMIN"]

