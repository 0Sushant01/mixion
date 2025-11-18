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

    def __str__(self):
        return f"{self.timestamp} - {self.customer.name} - {self.amount}"


# -------------------------
# Bottle Slot Table
# -------------------------
class BottleSlot(models.Model):
    """Represents a physical bottle slot (1..12) and the liquid stored inside it.

    Owners can update `liquid_name` at any time; recipes refer to bottle numbers.
    """
    bottle_number = models.PositiveSmallIntegerField(primary_key=True)
    liquid_name = models.CharField(max_length=200, default="Empty")

    class Meta:
        ordering = ["bottle_number"]

    def __str__(self):
        return f"{self.bottle_number}: {self.liquid_name}"


# -------------------------
# Recipe Table
# -------------------------
class Recipe(models.Model):
    """Simple recipe that stores ml volumes per bottle slot (1..12).

    Primary key is `recipe_name`. Each `bottle_X` field holds an integer (ml).
    If a recipe does not use a particular bottle, that field is 0.
    """
    recipe_name = models.CharField(max_length=200, primary_key=True)
    bottle_1 = models.PositiveIntegerField(default=0)
    bottle_2 = models.PositiveIntegerField(default=0)
    bottle_3 = models.PositiveIntegerField(default=0)
    bottle_4 = models.PositiveIntegerField(default=0)
    bottle_5 = models.PositiveIntegerField(default=0)
    bottle_6 = models.PositiveIntegerField(default=0)
    bottle_7 = models.PositiveIntegerField(default=0)
    bottle_8 = models.PositiveIntegerField(default=0)
    bottle_9 = models.PositiveIntegerField(default=0)
    bottle_10 = models.PositiveIntegerField(default=0)
    bottle_11 = models.PositiveIntegerField(default=0)
    bottle_12 = models.PositiveIntegerField(default=0)
    # price in smallest currency unit (e.g., rupees as integer). Default 10.
    price = models.PositiveIntegerField(default=10)
    # video preview URL (store as plain URL, do not embed HTML)
    video_url = models.URLField(blank=True, default="")

    def bottles(self):
        """Return a list of (bottle_number, ml) tuples for this recipe."""
        return [(i, getattr(self, f"bottle_{i}")) for i in range(1, 13)]

    def used_bottles(self):
        """Return a list of (bottle_number, ml) for non-zero bottles."""
        return [(i, ml) for i, ml in self.bottles() if ml > 0]

    def __str__(self):
        return self.recipe_name
