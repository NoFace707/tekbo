"""
products app.

Aplicación responsable del catálogo de productos vendibles por Tekbo.

Single Responsibility (a nivel de app Django):
    - Define el modelo Product y su API REST (CRUD).
    - No conoce lógica de ventas ni de stock decreciente por venta
      (esa lógica vivirá en una futura app `sales`).

Open/Closed:
    - El modelo Product es extensible mediante campos nuevos sin tocar
      los serializers existentes (ellos listan campos explícitamente).
"""
default_app_config = "products.apps.ProductsConfig"
