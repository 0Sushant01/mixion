from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes

from .models import Owner, Customer, DailyCount, BottleSlot, Recipe
from .serializers import (
    OwnerSerializer,
    CustomerSerializer,
    DailyCountSerializer,
    BottleSlotSerializer,
    RecipeSerializer,
)


class OwnerViewSet(viewsets.ModelViewSet):
    queryset = Owner.objects.all().order_by("name")
    serializer_class = OwnerSerializer
    permission_classes = [permissions.AllowAny]


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by("name")
    serializer_class = CustomerSerializer
    permission_classes = [permissions.AllowAny]


class DailyCountViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DailyCount.objects.all().order_by("-timestamp")
    serializer_class = DailyCountSerializer
    permission_classes = [permissions.AllowAny]


class BottleSlotViewSet(viewsets.ModelViewSet):
    queryset = BottleSlot.objects.all().order_by("bottle_number")
    serializer_class = BottleSlotSerializer
    permission_classes = [permissions.AllowAny]


class RecipeViewSet(viewsets.ModelViewSet):
    queryset = Recipe.objects.all().order_by("recipe_name")
    serializer_class = RecipeSerializer
    permission_classes = [permissions.AllowAny]


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register_user(request):
    """Register a new customer. Expects 'name', 'email', 'password'."""
    serializer = CustomerSerializer(data=request.data)
    if serializer.is_valid():
        customer = serializer.save()
        data = CustomerSerializer(customer).data
        return Response(data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_customer(request):
    """Simple login that verifies email + password and returns customer data (no token)."""
    email = request.data.get("email")
    password = request.data.get("password")
    if not email or not password:
        return Response({"detail": "email and password required"}, status=status.HTTP_400_BAD_REQUEST)
    # First try Customer
    from django.contrib.auth.hashers import check_password

    try:
        cust = Customer.objects.get(email=email)
        # compare hashed password
        if not check_password(password, cust.password):
            return Response({"detail": "invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)
        data = CustomerSerializer(cust).data
        data["role"] = "customer"
        return Response(data)
    except Customer.DoesNotExist:
        # try Owner as a fallback (owner and customer are distinct models)
        try:
            owner = Owner.objects.get(email=email)
            # Owner.password may be hashed or plain (legacy). Try check_password first,
            # then fall back to plain equality for backward compatibility.
            if check_password(password, owner.password) or owner.password == password:
                data = OwnerSerializer(owner).data
                data["role"] = "owner"
                return Response(data)
            return Response({"detail": "invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)
        except Owner.DoesNotExist:
            return Response({"detail": "invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)
