from rest_framework.routers import DefaultRouter
from django.urls import path, include
from . import views

router = DefaultRouter()
router.register(r"owners", views.OwnerViewSet, basename="owners")
router.register(r"customers", views.CustomerViewSet, basename="customers")
router.register(r"dailycounts", views.DailyCountViewSet, basename="dailycounts")
router.register(r"bottles", views.BottleSlotViewSet, basename="bottles")
router.register(r"recipes", views.RecipeViewSet, basename="recipes")

urlpatterns = [
    path("", include(router.urls)),
    path("auth/register/", views.register_user, name="auth-register"),
    path("auth/login/", views.login_customer, name="auth-login"),
]
