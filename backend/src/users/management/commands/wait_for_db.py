import time

from django.core.management.base import BaseCommand
from django.db import connections
from django.db.utils import OperationalError


class Command(BaseCommand):
    """Espera a que la base de datos este disponible."""

    help = "Espera a que la base de datos este disponible."

    def handle(self, *args, **options):
        self.stdout.write("Esperando base de datos...")
        max_retries = 30
        for i in range(max_retries):
            try:
                connections["default"].ensure_connection()
                self.stdout.write(self.style.SUCCESS("Base de datos lista."))
                return
            except OperationalError:
                self.stdout.write(
                    f"  intento {i + 1}/{max_retries} - reintentando en 1s..."
                )
                time.sleep(1)
        self.stdout.write(self.style.ERROR("No se pudo conectar a la base de datos."))
        raise SystemExit(1)
