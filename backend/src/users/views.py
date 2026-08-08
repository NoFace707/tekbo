from django.contrib.auth import authenticate
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .firebase_service import get_or_create_user_by_email, verify_firebase_id_token
from .permissions import IsAdmin, IsAdminOrReadOnlySelf
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)


def _tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


def _get_user_from_firebase_token(id_token):
    payload = verify_firebase_id_token(id_token)
    email = payload.get("email")
    if not email:
        raise ValueError("El token de Firebase no contiene un correo válido.")
    return get_or_create_user_by_email(email)


class MeView(APIView):
    """Devuelve el usuario autenticado."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class LoginView(APIView):
    """Login con correo o Firebase ID token, devuelve tokens JWT."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = None
        if data.get("id_token"):
            try:
                user = _get_user_from_firebase_token(data["id_token"])
            except ValueError:
                user = None
        else:
            user = authenticate(
                request,
                email=data["email"],
                password=data["password"],
            )

        if not user:
            return Response(
                {"detail": "Credenciales invalidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if not user.is_active:
            return Response(
                {"detail": "El usuario esta inactivo."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": _tokens_for(user),
            }
        )


class LogoutView(APIView):
    """Logout: blacklista el refresh token (sin estado, el access sigue hasta expirar)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh = request.data.get("refresh")
            if refresh:
                RefreshToken(refresh).blacklist()
        except Exception:
            # blacklist puede fallar si no esta configurado; igual devolvemos 200
            pass
        return Response({"detail": "Sesion cerrada."})


class RefreshTokenView(APIView):
    """Refresca el access token a partir del refresh."""

    permission_classes = [AllowAny]

    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            return Response(
                {"detail": "Falta el refresh token."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh)
            return Response(
                {
                    "access": str(token.access_token),
                    "refresh": str(token),
                }
            )
        except Exception:
            return Response(
                {"detail": "Refresh token invalido."},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class ChangePasswordView(APIView):
    """Cambio de contraseña para el propio usuario."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user
        if not user.check_password(data["current_password"]):
            return Response(
                {"current_password": "La contrasena actual es incorrecta."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(data["new_password"])
        user.save()
        return Response({"detail": "Contrasena actualizada."})


class UserViewSet(viewsets.ModelViewSet):
    """CRUD de usuarios. Solo admin puede crear/editar/eliminar.
    El propio usuario puede editar su perfil.
    """

    queryset = User.objects.all().order_by("-date_joined")

    def get_permissions(self):
        if self.action in ["list", "create", "destroy"]:
            return [IsAdmin()]
        # retrieve / update / partial_update: admin o el propio usuario
        return [IsAdminOrReadOnlySelf()]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action in ["update", "partial_update"]:
            return UserUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Filtros opcionales
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() in ["true", "1", "yes"])
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(username__icontains=search) | qs.filter(
                email__icontains=search
            ) | qs.filter(first_name__icontains=search) | qs.filter(
                last_name__icontains=search
            )
        return qs

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.pk == instance.pk:
            return Response(
                {"detail": "No puedes eliminar tu propia cuenta."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)
