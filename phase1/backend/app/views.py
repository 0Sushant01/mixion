from rest_framework import viewsets
from .models import Bottle
from .serializers import BottleSerializer

class BottleViewSet(viewsets.ModelViewSet):
    queryset = Bottle.objects.all()
    serializer_class = BottleSerializer
