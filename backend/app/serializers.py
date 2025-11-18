from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import Owner, Customer, DailyCount, BottleSlot, Recipe


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

    class Meta:
        model = DailyCount
        fields = ["id", "timestamp", "customer", "amount"]


class BottleSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = BottleSlot
        fields = ["bottle_number", "liquid_name"]


class RecipeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recipe
        fields = [
            "recipe_name",
            "bottle_1",
            "bottle_2",
            "bottle_3",
            "bottle_4",
            "bottle_5",
            "bottle_6",
            "bottle_7",
            "bottle_8",
            "bottle_9",
            "bottle_10",
            "bottle_11",
            "bottle_12",
            "price",
            "video_url",
        ]
