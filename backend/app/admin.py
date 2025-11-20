from django.contrib import admin
from .models import Owner, Customer, DailyCount
from .models import BottleSlot, Recipe, Ingredient, RecipeIngredient, Machine


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
    list_display = ("id", "timestamp", "customer", "recipe", "amount","machine")
    readonly_fields = ("timestamp",)


@admin.register(BottleSlot)
class BottleSlotAdmin(admin.ModelAdmin):
    list_display = ("id", "machine", "bottle_number", "liquid_name")
    list_editable = ("liquid_name",)
    ordering = ("machine", "bottle_number")


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ("recipe_name", "price",'video_url')
    search_fields = ("recipe_name",)
    readonly_fields = ()


class RecipeIngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 1
    readonly_fields = ()
    autocomplete_fields = ("ingredient",)


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "is_cold")
    search_fields = ("name",)
    list_filter = ("is_cold",)


@admin.register(Machine)
class MachineAdmin(admin.ModelAdmin):
    list_display = ("machine_id", "label", "owner")
    search_fields = ("machine_id", "label", "owner__name")


@admin.register(RecipeIngredient)
class RecipeIngredientAdmin(admin.ModelAdmin):
    list_display = ("id", "recipe", "ingredient", "amount_ml")
    list_select_related = ("recipe", "ingredient")
    search_fields = ("recipe__recipe_name", "ingredient__name")


# attach inline to Recipe admin so owners can manage ingredients inside recipe
RecipeAdmin.inlines = [RecipeIngredientInline]


# Reusable admin action: open the selected object's change page when exactly one row is selected.
# This gets added to every registered ModelAdmin so an "Edit" action appears in the actions dropdown
# across all admin change lists.
from django.urls import reverse
from django.http import HttpResponseRedirect
from django.contrib import messages


def edit_selected(modeladmin, request, queryset):
    count = queryset.count()
    if count == 1:
        obj = queryset.first()
        app_label = obj._meta.app_label
        model_name = obj._meta.model_name
        url = reverse(f"admin:{app_label}_{model_name}_change", args=(obj.pk,))
        return HttpResponseRedirect(url)
    else:
        messages.info(request, "Please select exactly one item to edit.")


edit_selected.short_description = "Edit selected (open change page)"


# Attach the action to all registered ModelAdmin instances to make it available everywhere.
for _model, _admin in admin.site._registry.items():
    # ensure actions is a mutable list (it may be defined as a tuple on some ModelAdmins)
    if getattr(_admin, 'actions', None) is None:
        _admin.actions = []
    elif not isinstance(_admin.actions, list):
        _admin.actions = list(_admin.actions)
    # avoid duplicate
    if edit_selected not in _admin.actions:
        _admin.actions.append(edit_selected)

