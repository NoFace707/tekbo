"""
ViewSet del catálogo de productos.

Single Responsibility: exponer CRUD REST sobre Product.
La lógica de validación vive en serializers; la de autorización en
permissions; la de filtrado en get_queryset. El viewset solo orquesta.

Open/Closed:
    - Para añadir un endpoint custom (p. ej. /agotados/) se usa @action
      sin tocar los métodos estándar.
"""
from rest_framework import viewsets

from .models import Product
from .permissions import IsAdminOrReadOnlyCatalog
from .serializers import ProductReadSerializer, ProductWriteSerializer


class ProductViewSet(viewsets.ModelViewSet):
    """CRUD de productos.

    - GET    /api/products/         → lista (admin, supervisor, vendedor)
    - GET    /api/products/<id>/    → detalle
    - POST   /api/products/         → solo admin
    - PATCH  /api/products/<id>/    → solo admin
    - DELETE /api/products/<id>/    → solo admin
    """

    queryset = Product.objects.all().order_by("nombre")
    permission_classes = [IsAdminOrReadOnlyCatalog]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ProductWriteSerializer
        return ProductReadSerializer

    def get_queryset(self):
        qs = super().get_queryset()

        # Filtro opcional por búsqueda de texto (nombre o detalle).
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(nombre__icontains=search) | qs.filter(
                detalle__icontains=search
            )

        # Filtro opcional por stock disponible.
        in_stock = self.request.query_params.get("in_stock")
        if in_stock is not None:
            only_in_stock = in_stock.lower() in ("1", "true", "yes")
            if only_in_stock:
                qs = qs.filter(stock__gt=0)
            else:
                qs = qs.filter(stock=0)

        # Orden opcional.
        ordering = self.request.query_params.get("ordering")
        if ordering in ("nombre", "-nombre", "costo", "-costo", "stock", "-stock"):
            qs = qs.order_by(ordering)

        return qs
