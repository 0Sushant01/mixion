from django.db import models
from django.utils import timezone


# -------------------------
# Owner Table
# -------------------------
class Owner(models.Model):
    name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=200)

    def __str__(self):
        return self.name


# -------------------------
# Customer Table
# -------------------------
class Customer(models.Model):
    # Auto ID is created by Django automatically (id = PK)
    name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=200)

    def __str__(self):
        return self.name


# -------------------------
# Daily Count Table
# -------------------------
class DailyCount(models.Model):
    timestamp = models.DateTimeField(default=timezone.now)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    amount = models.FloatField()
    # store the recipe sold as a foreign key to Recipe (recipe_name is the PK)
    recipe = models.ForeignKey(
        "Recipe",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        to_field="recipe_name",
    )
    # machine identifier where the sale occurred (e.g., 'm1', 'm2')
    machine = models.ForeignKey(
        "Machine",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    def __str__(self):
        recipe_name = getattr(self.recipe, "recipe_name", "Unknown") if self.recipe else "Unknown"
        return f"{self.timestamp} - {self.customer.name} - {recipe_name} - {self.amount}"


# -------------------------
# Bottle Slot Table
# -------------------------
class BottleSlot(models.Model):
    """Represents a physical bottle slot (1..12) and the liquid stored inside it.

    Owners can update `liquid_name` at any time; recipes refer to bottle numbers.
    """
    # Changed to support multiple machines: each BottleSlot belongs to a Machine
    bottle_number = models.PositiveSmallIntegerField()
    liquid_name = models.CharField(max_length=200, default="Empty")
    machine = models.ForeignKey("Machine", on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        ordering = ["machine", "bottle_number"]
        unique_together = (("machine", "bottle_number"),)

    def __str__(self):
        return f"{self.bottle_number}: {self.liquid_name}"


# -------------------------
# Ingredient Table
# -------------------------
class Ingredient(models.Model):
    """Master list of possible ingredients (unlimited)."""
    name = models.CharField(max_length=200, unique=True)
    is_cold = models.BooleanField(default=False)

    def __str__(self):
        return self.name


# -------------------------
# Machine Table
# -------------------------
class Machine(models.Model):
    """Represents a physical machine instance (owner can have many)."""
    machine_id = models.CharField(max_length=50, primary_key=True)  # e.g., 'm1', 'm2'
    owner = models.ForeignKey(Owner, on_delete=models.CASCADE, null=True, blank=True)
    label = models.CharField(max_length=200, blank=True, default="")

    def __str__(self):
        return self.machine_id if not self.label else f"{self.machine_id} ({self.label})"


# -------------------------
# RecipeIngredient mapping
# -------------------------
class RecipeIngredient(models.Model):
    """Mapping table: which ingredient and how many ml for a recipe."""
    recipe = models.ForeignKey("Recipe", on_delete=models.CASCADE, related_name="recipe_ingredients")
    ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT)
    amount_ml = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("recipe", "ingredient")

    def __str__(self):
        return f"{self.recipe.recipe_name} - {self.ingredient.name}: {self.amount_ml}ml"


# -------------------------
# Recipe Table
# -------------------------
class Recipe(models.Model):
    """Logical recipe that stores ingredient amounts via RecipeIngredient mapping.

    Primary key is `recipe_name`. Ingredients and their ml amounts are stored
    in the `RecipeIngredient` table (related_name=`recipe_ingredients`).
    """
    recipe_name = models.CharField(max_length=200, primary_key=True)
    # price in smallest currency unit (e.g., rupees as integer). Default 10.
    price = models.PositiveIntegerField(default=10)
    # video preview URL (store as plain URL, do not embed HTML)
    video_url = models.URLField(blank=True, default="")

    def bottles(self):
        """Return a list of (ingredient_name, ml) tuples for this recipe.

        Kept the method name `bottles()` for backward compatibility; it now
        returns ingredient names instead of bottle slot numbers.
        """
        return [(ri.ingredient.name, ri.amount_ml) for ri in self.recipe_ingredients.all()]

    def used_bottles(self):
        """Return a list of (ingredient_name, ml) for non-zero ingredients."""
        return [(name, ml) for name, ml in self.bottles() if ml > 0]

    def __str__(self):
        return self.recipe_name
