from django.urls import path
from .views import ProcessMixView

urlpatterns = [
    path('mix/', ProcessMixView.as_view(), name='process_mix'),
]
