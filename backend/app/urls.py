from rest_framework.routers import DefaultRouter
from django.urls import path, include
from . import views

router = DefaultRouter()
router.register(r"slots", views.BottleSlotViewSet, basename="slots")
router.register(r"recipes", views.DrinkRecipeViewSet, basename="recipes")
router.register(r"purchases", views.PurchaseViewSet, basename="purchases")
router.register(r"dailycounts", views.DailyCountViewSet, basename="dailycounts")
router.register(r"telemetry", views.TelemetryViewSet, basename="telemetry")
router.register(r"wallet", views.WalletTransactionViewSet, basename="wallet")

urlpatterns = [
    path("", include(router.urls)),
]
