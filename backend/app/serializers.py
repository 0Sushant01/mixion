from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import Owner, Customer, DailyCount, BottleSlot, Recipe, Machine
from .models import Ingredient, RecipeIngredient


class OwnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Owner
        fields = ["id", "name", "email"]


class CustomerSerializer(serializers.ModelSerializer):
    # accept password write-only; we'll hash it before saving
    password = serializers.CharField(write_only=True, min_length=4)

    class Meta:
        model = Customer
        fields = ["id", "name", "email", "password"]

    def validate_email(self, value):
        if Customer.objects.filter(email=value).exists():
            raise serializers.ValidationError("A customer with that email already exists")
        return value

    def create(self, validated_data):
        raw_password = validated_data.pop("password")
        # hash password before saving
        hashed = make_password(raw_password)
        customer = Customer(**validated_data)
        customer.password = hashed
        customer.save()
        return customer


class DailyCountSerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all())
    # represent recipe by its primary key (recipe_name)
    recipe = serializers.PrimaryKeyRelatedField(queryset=Recipe.objects.all())
    machine = serializers.PrimaryKeyRelatedField(queryset=Machine.objects.all(), allow_null=True, required=False)

    class Meta:
        model = DailyCount
        fields = ["id", "timestamp", "customer", "recipe", "amount", "machine"]


class BottleSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = BottleSlot
        fields = ["id", "bottle_number", "liquid_name", "machine"]


class MachineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Machine
        fields = ["machine_id", "owner", "label"]


class BottleSlotAdminSerializer(serializers.ModelSerializer):
    # helpful read-only view representation
    machine = MachineSerializer(read_only=True)

    class Meta:
        model = BottleSlot
        fields = ["id", "bottle_number", "liquid_name", "machine"]


class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = ["id", "name", "is_cold"]


class RecipeIngredientSerializer(serializers.ModelSerializer):
    ingredient = IngredientSerializer(read_only=True)

    class Meta:
        model = RecipeIngredient
        fields = ["id", "recipe", "ingredient", "amount_ml"]


class RecipeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recipe
        fields = [
            "recipe_name",
            "price",
            "video_url",
            "recipe_ingredients",
        ]

    # include read-only list of ingredients when serializing
    recipe_ingredients = RecipeIngredientSerializer(many=True, read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["ingredients"] = RecipeIngredientSerializer(instance.recipe_ingredients.all(), many=True).data
        return data
