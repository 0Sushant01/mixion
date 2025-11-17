from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import (
    BottleSlot,
    DrinkRecipe,
    RecipeIngredient,
    Purchase,
    PurchaseBottle,
    DailyCount,
    Telemetry,
    WalletTransaction,
)


User = get_user_model()


class BottleSlotSerializer(serializers.ModelSerializer):
    percent_full = serializers.FloatField(source="percent_full", read_only=True)

    class Meta:
        model = BottleSlot
        fields = ["id", "slot_number", "bottle_name", "current_volume_ml", "capacity_ml", "percent_full", "is_enabled", "last_refill_at", "calibration"]


class RecipeIngredientSerializer(serializers.ModelSerializer):
    slot = BottleSlotSerializer(read_only=True)

    class Meta:
        model = RecipeIngredient
        fields = ["slot", "percent"]


class DrinkRecipeSerializer(serializers.ModelSerializer):
    ingredients = RecipeIngredientSerializer(source="recipeingredient_set", many=True, read_only=True)

    class Meta:
        model = DrinkRecipe
        fields = ["id", "name", "description", "price_cents", "estimated_volume_ml", "is_active", "ingredients"]


class PurchaseBottleSerializer(serializers.ModelSerializer):
    slot = BottleSlotSerializer(read_only=True)

    class Meta:
        model = PurchaseBottle
        fields = ["slot", "volume_ml"]


class PurchaseSerializer(serializers.ModelSerializer):
    bottles = PurchaseBottleSerializer(source="purchasebottle_set", many=True, read_only=True)
    recipe = DrinkRecipeSerializer(read_only=True)

    class Meta:
        model = Purchase
        fields = ["id", "user", "recipe", "amount_paid_cents", "price_at_purchase_cents", "quantity", "timestamp", "payment_method", "status", "transaction_metadata", "bottles"]


class DailyCountSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyCount
        fields = ["date", "owner", "total_sales_count", "total_revenue_cents", "per_recipe_counts", "updated_at"]


class TelemetrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Telemetry
        fields = ["id", "device_id", "timestamp", "type", "value"]


class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = ["id", "user", "amount_cents", "type", "timestamp", "metadata"]
