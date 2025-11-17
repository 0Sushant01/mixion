from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import (
    User,
    BottleSlot,
    DrinkRecipe,
    RecipeIngredient,
    Purchase,
    PurchaseBottle,
    DailyCount,
    Telemetry,
    WalletTransaction,
)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Additional", {"fields": ("display_name", "role", "wallet_balance_cents")} ),
    )


@admin.register(BottleSlot)
class BottleSlotAdmin(admin.ModelAdmin):
    list_display = ("slot_number", "bottle_name", "percent_full", "is_enabled", "last_refill_at")
    list_editable = ("is_enabled",)
    ordering = ("slot_number",)


class RecipeIngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 1


@admin.register(DrinkRecipe)
class DrinkRecipeAdmin(admin.ModelAdmin):
    list_display = ("name", "price_cents", "estimated_volume_ml", "is_active")
    list_filter = ("is_active",)
    inlines = (RecipeIngredientInline,)


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ("id", "recipe", "user", "amount_paid_cents", "payment_method", "status", "timestamp")
    list_filter = ("status", "payment_method")
    readonly_fields = ("timestamp",)


@admin.register(DailyCount)
class DailyCountAdmin(admin.ModelAdmin):
    list_display = ("date", "owner", "total_sales_count", "total_revenue_cents")
    readonly_fields = ("updated_at",)


@admin.register(Telemetry)
class TelemetryAdmin(admin.ModelAdmin):
    list_display = ("device_id", "type", "timestamp")
    readonly_fields = ("timestamp",)


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ("user", "type", "amount_cents", "timestamp")


@admin.register(PurchaseBottle)
class PurchaseBottleAdmin(admin.ModelAdmin):
    list_display = ("purchase", "slot", "volume_ml")
from django.contrib import admin

# Register your models here.
