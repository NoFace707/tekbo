from django.urls import path

from .views import DashboardView, TeamDashboardView

urlpatterns = [
    path("", DashboardView.as_view(), name="dashboard"),
    path("team/", TeamDashboardView.as_view(), name="dashboard-team"),
]
