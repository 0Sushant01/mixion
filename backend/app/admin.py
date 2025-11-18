from django.contrib import admin
from .models import Owner, Customer, DailyCount
from .models import BottleSlot, Recipe


@admin.register(Owner)
class OwnerAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "email")
    search_fields = ("name", "email")


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "email")
    search_fields = ("name", "email")


@admin.register(DailyCount)
class DailyCountAdmin(admin.ModelAdmin):
    list_display = ("id", "timestamp", "customer", "amount")
    readonly_fields = ("timestamp",)


@admin.register(BottleSlot)
class BottleSlotAdmin(admin.ModelAdmin):
    list_display = ("bottle_number", "liquid_name")
    list_editable = ("liquid_name",)
    ordering = ("bottle_number",)


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ("recipe_name", "price")
    search_fields = ("recipe_name",)
    readonly_fields = ()

