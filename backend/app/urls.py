from rest_framework.routers import DefaultRouter
from django.urls import path, include
from . import views

router = DefaultRouter()
router.register(r"owners", views.OwnerViewSet, basename="owners")
router.register(r"customers", views.CustomerViewSet, basename="customers")
router.register(r"dailycounts", views.DailyCountViewSet, basename="dailycounts")
router.register(r"bottles", views.BottleSlotViewSet, basename="bottles")
router.register(r"recipes", views.RecipeViewSet, basename="recipes")
router.register(r"ingredients", views.IngredientViewSet, basename="ingredients")
router.register(r"recipe-ingredients", views.RecipeIngredientViewSet, basename="recipe-ingredients")
router.register(r"machines", views.MachineViewSet, basename="machines")

urlpatterns = [
    path("", include(router.urls)),
    path("record_sale/", views.record_sale, name="record-sale"),
    path("auth/register/", views.register_user, name="auth-register"),
    path("auth/login/", views.login_customer, name="auth-login"),
]
