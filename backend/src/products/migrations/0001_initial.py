from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Product",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "nombre",
                    models.CharField(
                        db_index=True,
                        max_length=200,
                        verbose_name="Nombre",
                    ),
                ),
                (
                    "detalle",
                    models.TextField(
                        blank=True,
                        default="",
                        verbose_name="Detalle",
                    ),
                ),
                (
                    "stock",
                    models.PositiveIntegerField(
                        default=0,
                        verbose_name="Stock",
                    ),
                ),
                (
                    "costo",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("0.00"),
                        max_digits=12,
                        validators=[],
                        verbose_name="Costo (Bs)",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Producto",
                "verbose_name_plural": "Productos",
                "ordering": ["nombre"],
            },
        ),
    ]
