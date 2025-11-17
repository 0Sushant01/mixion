from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from .models import BottleSlot, DrinkRecipe, Purchase, DailyCount, Telemetry, WalletTransaction
from .serializers import (
    BottleSlotSerializer,
    DrinkRecipeSerializer,
    PurchaseSerializer,
    DailyCountSerializer,
    TelemetrySerializer,
    WalletTransactionSerializer,
)


User = get_user_model()


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return True

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return getattr(request.user, "role", "") in ("owner", "admin")


class BottleSlotViewSet(viewsets.ModelViewSet):
    queryset = BottleSlot.objects.all().order_by("slot_number")
    serializer_class = BottleSlotSerializer
    permission_classes = [IsOwnerOrReadOnly]


class DrinkRecipeViewSet(viewsets.ModelViewSet):
    queryset = DrinkRecipe.objects.filter(is_active=True).order_by("name")
    serializer_class = DrinkRecipeSerializer
    permission_classes = [IsOwnerOrReadOnly]


class PurchaseViewSet(viewsets.ModelViewSet):
    queryset = Purchase.objects.all().order_by("-timestamp")
    serializer_class = PurchaseSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        # Simplified create: expect recipe id, amount_paid_cents, payment_method, optional user
        data = request.data
        try:
            recipe = DrinkRecipe.objects.get(pk=data.get("recipe_id"))
        except DrinkRecipe.DoesNotExist:
            return Response({"detail": "recipe not found"}, status=status.HTTP_400_BAD_REQUEST)

        user = None
        if data.get("user_id"):
            try:
                user = User.objects.get(pk=data.get("user_id"))
            except User.DoesNotExist:
                user = None

        purchase = Purchase.objects.create(
            user=user,
            recipe=recipe,
            amount_paid_cents=data.get("amount_paid_cents", recipe.price_cents),
            price_at_purchase_cents=data.get("price_at_purchase_cents", recipe.price_cents),
            quantity=data.get("quantity", 1),
            payment_method=data.get("payment_method", "card"),
            status=data.get("status", "completed"),
            transaction_metadata=data.get("transaction_metadata", {}),
        )

        # If bottles info provided, attach PurchaseBottle records (frontend should provide volumes)
        bottles = data.get("bottles", [])
        for b in bottles:
            slot_id = b.get("slot_id")
            vol = b.get("volume_ml")
            if slot_id and vol:
                try:
                    slot = BottleSlot.objects.get(pk=slot_id)
                    purchase.purchasebottle_set.create(slot=slot, volume_ml=vol)
                    # decrement slot volume - naive update
                    slot.current_volume_ml = max(0.0, slot.current_volume_ml - float(vol))
                    slot.save()
                except BottleSlot.DoesNotExist:
                    continue

        serializer = self.get_serializer(purchase)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DailyCountViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DailyCount.objects.all().order_by("-date")
    serializer_class = DailyCountSerializer
    permission_classes = [permissions.IsAuthenticated]


class TelemetryViewSet(viewsets.ModelViewSet):
    queryset = Telemetry.objects.all().order_by("-timestamp")
    serializer_class = TelemetrySerializer
    permission_classes = [permissions.AllowAny]


class WalletTransactionViewSet(viewsets.ModelViewSet):
    queryset = WalletTransaction.objects.all().order_by("-timestamp")
    serializer_class = WalletTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def topup(self, request):
        amount = int(request.data.get("amount_cents", 0))
        if amount <= 0:
            return Response({"detail": "invalid amount"}, status=status.HTTP_400_BAD_REQUEST)
        wt = WalletTransaction.objects.create(user=request.user, amount_cents=amount, type="topup")
        request.user.wallet_balance_cents = request.user.wallet_balance_cents + amount
        request.user.save()
        return Response(WalletTransactionSerializer(wt).data, status=status.HTTP_201_CREATED)
from django.shortcuts import render

# Create your views here.
