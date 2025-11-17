from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


# Custom user to store wallet and role info
class User(AbstractUser):
	ROLE_CHOICES = [
		("customer", "Customer"),
		("owner", "Owner"),
		("admin", "Admin"),
	]

	display_name = models.CharField(max_length=150, blank=True)
	role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="customer")
	wallet_balance_cents = models.BigIntegerField(default=0)

	def __str__(self):
		return self.get_username() or self.display_name or str(self.pk)


class BottleSlot(models.Model):
	slot_number = models.PositiveSmallIntegerField(unique=True)
	bottle_name = models.CharField(max_length=200, blank=True)
	current_volume_ml = models.FloatField(default=0.0)
	capacity_ml = models.FloatField(default=1000.0)
	is_enabled = models.BooleanField(default=True)
	last_refill_at = models.DateTimeField(null=True, blank=True)
	calibration = models.JSONField(null=True, blank=True)

	def percent_full(self):
		if not self.capacity_ml:
			return 0
		return max(0.0, min(100.0, (self.current_volume_ml / self.capacity_ml) * 100.0))

	def __str__(self):
		return f"Slot {self.slot_number}: {self.bottle_name or 'Empty'}"


class DrinkRecipe(models.Model):
	name = models.CharField(max_length=200)
	description = models.TextField(blank=True)
	price_cents = models.BigIntegerField(default=0)
	estimated_volume_ml = models.FloatField(default=250.0)
	created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(default=timezone.now)
	updated_at = models.DateTimeField(auto_now=True)

	slots = models.ManyToManyField(BottleSlot, through="RecipeIngredient", related_name="recipes")

	def __str__(self):
		return self.name


class RecipeIngredient(models.Model):
	recipe = models.ForeignKey(DrinkRecipe, on_delete=models.CASCADE)
	slot = models.ForeignKey(BottleSlot, on_delete=models.CASCADE)
	# percentage of the total recipe volume contributed by this slot (0-100)
	percent = models.FloatField()

	class Meta:
		unique_together = ("recipe", "slot")


class Purchase(models.Model):
	PAYMENT_METHODS = [
		("card", "Card"),
		("cash", "Cash"),
		("wallet", "Wallet"),
		("mobile", "MobilePay"),
	]

	STATUS_CHOICES = [
		("pending", "Pending"),
		("completed", "Completed"),
		("failed", "Failed"),
		("refunded", "Refunded"),
	]

	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
	recipe = models.ForeignKey(DrinkRecipe, on_delete=models.PROTECT)
	amount_paid_cents = models.BigIntegerField()
	price_at_purchase_cents = models.BigIntegerField()
	quantity = models.PositiveSmallIntegerField(default=1)
	timestamp = models.DateTimeField(default=timezone.now)
	payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
	transaction_metadata = models.JSONField(null=True, blank=True)

	slots = models.ManyToManyField(BottleSlot, through="PurchaseBottle", related_name="purchases")

	def __str__(self):
		return f"Purchase {self.pk} - {self.recipe.name} @ {self.timestamp.isoformat()}"


class PurchaseBottle(models.Model):
	purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE)
	slot = models.ForeignKey(BottleSlot, on_delete=models.PROTECT)
	volume_ml = models.FloatField()

	class Meta:
		unique_together = ("purchase", "slot")


class DailyCount(models.Model):
	date = models.DateField()
	owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
	total_sales_count = models.PositiveIntegerField(default=0)
	total_revenue_cents = models.BigIntegerField(default=0)
	per_recipe_counts = models.JSONField(default=dict, blank=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ("date", "owner")

	def __str__(self):
		return f"DailyCount {self.date} - sales {self.total_sales_count}"


class Telemetry(models.Model):
	device_id = models.CharField(max_length=200, blank=True)
	timestamp = models.DateTimeField(default=timezone.now, db_index=True)
	type = models.CharField(max_length=50)
	value = models.JSONField()

	def __str__(self):
		return f"Telemetry {self.type} @ {self.timestamp.isoformat()}"


class WalletTransaction(models.Model):
	TRANSACTION_TYPES = [
		("topup", "Top Up"),
		("charge", "Charge"),
		("refund", "Refund"),
	]

	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
	amount_cents = models.BigIntegerField()
	type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
	timestamp = models.DateTimeField(default=timezone.now)
	metadata = models.JSONField(null=True, blank=True)

	def __str__(self):
		return f"WalletTransaction {self.type} {self.amount_cents} for {self.user_id}"

