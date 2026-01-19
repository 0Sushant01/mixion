from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BottleViewSet

router = DefaultRouter()
router.register(r'bottles', BottleViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
