"""
sales app.

Aplicación responsable del ciclo de vida de ventas Tekbo:
proformas, recibos de anticipo y recibos finales de entrega.

Single Responsibility (a nivel de app Django):
    - Define los modelos de dominio: Document, DocumentItem,
      StockReservation y CashEntry.
    - Expone la API REST y los servicios de transición de estado.
    - No conoce detalles del catálogo de productos (solo lo referencia
      por id) ni de autenticación (solo referencia al usuario vendedor).

Open/Closed:
    - El modelo Document admite nuevos estados agregando un valor al
      TextChoices sin tocar la lógica de transición existente.
"""
default_app_config = "sales.apps.SalesConfig"
