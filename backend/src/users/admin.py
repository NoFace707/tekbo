from django.contrib import admin

from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = (
        "username",
        "email",
        "role",
        "is_active",
        "is_active_employee",
        "date_joined",
    )
    list_filter = ("role", "is_active", "is_active_employee")
    search_fields = ("username", "email", "first_name", "last_name")
    list_editable = ("role", "is_active", "is_active_employee")
    ordering = ("-date_joined",)
