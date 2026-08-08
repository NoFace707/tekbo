from decimal import Decimal

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("products", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Document",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(db_index=True, max_length=40, unique=True, verbose_name="Código")),
                ("state", models.CharField(
                    choices=[("proforma", "Proforma"), ("recibo_anticipo", "Recibo de Anticipo"), ("recibo_final", "Recibo Final / Entrega"), ("cerrado", "Cerrado")],
                    db_index=True, default="proforma", max_length=30, verbose_name="Estado")),
                ("cliente", models.CharField(max_length=200, verbose_name="Cliente")),
                ("fecha", models.CharField(max_length=20, verbose_name="Fecha")),
                ("direccion", models.CharField(blank=True, default="", max_length=300, verbose_name="Dirección")),
                ("celular", models.CharField(blank=True, default="", max_length=30, verbose_name="Celular")),
                ("descuento", models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=12, validators=[], verbose_name="Descuento (Bs)")),
                ("kind", models.CharField(
                    choices=[("proforma", "Proforma"), ("recibo", "Recibo")],
                    default="proforma", max_length=20, verbose_name="Tipo")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("vendedor", models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name="documents",
                    to=settings.AUTH_USER_MODEL,
                    verbose_name="Vendedor")),
            ],
            options={
                "verbose_name": "Documento",
                "verbose_name_plural": "Documentos",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="DocumentItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("desc", models.CharField(max_length=200, verbose_name="Descripción")),
                ("qty", models.DecimalField(decimal_places=2, default=Decimal("1"), max_digits=10, validators=[], verbose_name="Cantidad")),
                ("price", models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=12, validators=[], verbose_name="P. Unit (Bs)")),
                ("document", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="items",
                    to="sales.document",
                    verbose_name="Documento")),
                ("product", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name="document_items",
                    to="products.product",
                    verbose_name="Producto")),
            ],
            options={
                "verbose_name": "Ítem de documento",
                "verbose_name_plural": "Ítems de documento",
                "ordering": ["id"],
            },
        ),
        migrations.CreateModel(
            name="StockReservation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("qty", models.DecimalField(decimal_places=2, max_digits=10, validators=[], verbose_name="Cantidad reservada")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("released_at", models.DateTimeField(blank=True, null=True, verbose_name="Liberada el")),
                ("document", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="reservations",
                    to="sales.document",
                    verbose_name="Documento")),
                ("product", models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name="reservations",
                    to="products.product",
                    verbose_name="Producto")),
            ],
            options={
                "verbose_name": "Reserva de stock",
                "verbose_name_plural": "Reservas de stock",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="CashEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("kind", models.CharField(
                    choices=[("anticipo", "Anticipo"), ("liquidacion", "Liquidación / Cobro final")],
                    default="anticipo", max_length=20, verbose_name="Tipo")),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12, validators=[], verbose_name="Monto (Bs)")),
                ("is_revoked", models.BooleanField(default=False, help_text="True si se revirtió el cobro (p. ej. al volver a proforma).", verbose_name="Anulada")),
                ("note", models.CharField(blank=True, default="", max_length=300, verbose_name="Nota")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("document", models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name="cash_entries",
                    to="sales.document",
                    verbose_name="Documento")),
            ],
            options={
                "verbose_name": "Entrada de caja",
                "verbose_name_plural": "Entradas de caja",
                "ordering": ["-created_at"],
            },
        ),
    ]
