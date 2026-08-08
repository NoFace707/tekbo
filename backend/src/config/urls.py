from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("users.urls_auth")),
    path("api/users/", include("users.urls")),
    path("api/dashboard/", include("dashboard.urls")),
    path("api/products/", include("products.urls")),
    path("api/sales/", include("sales.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
