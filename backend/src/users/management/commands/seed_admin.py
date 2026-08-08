import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    """Crea el usuario admin inicial basado en variables de entorno.

    Variables (todas opcionales, tienen defaults seguros):
      DJANGO_SUPERUSER_USERNAME (default: admin)
      DJANGO_SUPERUSER_EMAIL    (default: admin@example.com)
      DJANGO_SUPERUSER_PASSWORD (default: admin123456)
    """

    help = "Crea el usuario admin inicial si no existe."

    def handle(self, *args, **options):
        User = get_user_model()
        username = os.getenv("DJANGO_SUPERUSER_USERNAME", "admin")
        email = os.getenv("DJANGO_SUPERUSER_EMAIL", "admin@example.com")
        password = os.getenv("DJANGO_SUPERUSER_PASSWORD", "admin123456")

        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f"Usuario '{username}' ya existe. Nada que hacer.")
            )
            return

        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role=User.Role.ADMIN,
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Admin inicial creado: username='{username}' password='{password}' "
                f"(cambialo cuanto antes)."
            )
        )
