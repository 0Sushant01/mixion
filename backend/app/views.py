from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes

from .models import Owner, Customer, DailyCount, BottleSlot, Recipe
from .serializers import (
    OwnerSerializer,
    CustomerSerializer,
    DailyCountSerializer,
    BottleSlotSerializer,
    RecipeSerializer,
)
from .models import Ingredient, RecipeIngredient
from .serializers import IngredientSerializer, RecipeIngredientSerializer
from .models import Machine
from .serializers import BottleSlotSerializer


class OwnerViewSet(viewsets.ModelViewSet):
    queryset = Owner.objects.all().order_by("name")
    serializer_class = OwnerSerializer
    permission_classes = [permissions.AllowAny]


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by("name")
    serializer_class = CustomerSerializer
    permission_classes = [permissions.AllowAny]


class DailyCountViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DailyCount.objects.all().order_by("-timestamp")
    serializer_class = DailyCountSerializer
    permission_classes = [permissions.AllowAny]


class BottleSlotViewSet(viewsets.ModelViewSet):
    queryset = BottleSlot.objects.all().order_by("machine", "bottle_number")
    serializer_class = BottleSlotSerializer

    def get_queryset(self):
        """Allow filtering bottle slots by machine identifier.

        Query params supported:
        - machine: matches Machine.machine_id (string) or Machine.pk (int)
        - machine_id: same as machine
        """
        qs = BottleSlot.objects.all().order_by("machine", "bottle_number")
        req = getattr(self, 'request', None)
        if not req:
            return qs
        mval = req.query_params.get('machine') or req.query_params.get('machine_id')
        if not mval:
            return qs
        # try to interpret as PK
        try:
            mpk = int(mval)
        except Exception:
            mpk = None

        if mpk is not None:
            return qs.filter(machine__pk=mpk).order_by('bottle_number')

        # otherwise filter by machine_id field
        return qs.filter(machine__machine_id=str(mval)).order_by('bottle_number')

    def create(self, request, *args, **kwargs):
        # Allow clients to pass `machine` as the machine_id (string) or pk.
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        mval = data.get('machine')
        if mval:
            # try numeric pk first
            try:
                mpk = int(mval)
            except Exception:
                mpk = None

            machine_obj = None
            if mpk is not None:
                try:
                    machine_obj = Machine.objects.get(pk=mpk)
                except Machine.DoesNotExist:
                    machine_obj = None

            if machine_obj is None:
                # try by machine_id string
                try:
                    machine_obj = Machine.objects.get(machine_id=str(mval))
                except Machine.DoesNotExist:
                    # create a lightweight Machine record so BottleSlot can be created
                    machine_obj = Machine.objects.create(machine_id=str(mval), label=str(mval))

            # set the machine field to the PK value the serializer expects
            data['machine'] = machine_obj.pk

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    permission_classes = [permissions.AllowAny]


class MachineViewSet(viewsets.ModelViewSet):
    queryset = Machine.objects.all().order_by("machine_id")
    permission_classes = [permissions.AllowAny]
    serializer_class = None
    # Use MachineSerializer if available
    from .serializers import MachineSerializer
    serializer_class = MachineSerializer


class RecipeViewSet(viewsets.ModelViewSet):
    queryset = Recipe.objects.all().order_by("recipe_name")
    serializer_class = RecipeSerializer
    permission_classes = [permissions.AllowAny]

    def perform_legacy_ingredient_sync(self, recipe_obj, data):
        """If request data contains legacy `bottle_1..bottle_12` fields, convert
        them into RecipeIngredient rows using the current BottleSlot -> liquid_name mapping.
        This keeps compatibility with older frontend that posts bottle_N fields.
        """
        # delete existing recipe ingredients for a clean sync
        RecipeIngredient.objects.filter(recipe=recipe_obj).delete()

        # helper to get bottle value
        for i in range(1, 13):
            key = f"bottle_{i}"
            if key in data:
                try:
                    ml = int(data.get(key) or 0)
                except Exception:
                    ml = 0
                if ml > 0:
                    # find BottleSlot mapping for slot i
                    try:
                        slot = BottleSlot.objects.get(bottle_number=i)
                        liquid_name = slot.liquid_name
                    except BottleSlot.DoesNotExist:
                        liquid_name = None

                    # find or create Ingredient by name (fallback to liquid_name)
                    ingredient = None
                    if liquid_name:
                        ingredient, _ = Ingredient.objects.get_or_create(name=liquid_name)

                    # if we couldn't determine ingredient, skip
                    if ingredient is None:
                        continue

                    RecipeIngredient.objects.create(recipe=recipe_obj, ingredient=ingredient, amount_ml=ml)

    def perform_ingredient_sync(self, recipe_obj, data):
        """If request data contains `recipe_ingredients` as a list of
        { ingredient: id_or_name, amount_ml: int } objects, sync them into
        RecipeIngredient rows. Ingredient may be supplied as an integer id
        or a string name; names will create missing Ingredient rows.
        """
        items = data.get("recipe_ingredients")
        if not items:
            return
        # remove existing
        RecipeIngredient.objects.filter(recipe=recipe_obj).delete()
        for entry in items:
            try:
                amt = int(entry.get("amount_ml") or 0)
            except Exception:
                amt = 0
            if amt <= 0:
                continue

            ing = entry.get("ingredient")
            ingredient = None
            # if numeric id provided, try to fetch
            if isinstance(ing, int) or (isinstance(ing, str) and ing.isdigit()):
                try:
                    ingredient = Ingredient.objects.get(pk=int(ing))
                except Ingredient.DoesNotExist:
                    ingredient = None

            # if not found, treat as name and get_or_create
            if ingredient is None and isinstance(ing, str):
                name = ing.strip()
                if name:
                    ingredient, _ = Ingredient.objects.get_or_create(name=name)

            if ingredient is None:
                continue

            RecipeIngredient.objects.create(recipe=recipe_obj, ingredient=ingredient, amount_ml=amt)

    def create(self, request, *args, **kwargs):
        # allow creating Recipe from legacy bottle_N fields
        resp = super().create(request, *args, **kwargs)
        try:
            # retrieve created recipe instance
            recipe_name = resp.data.get("recipe_name")
            if recipe_name:
                recipe_obj = Recipe.objects.get(recipe_name=recipe_name)
                # support both legacy bottle_N and new recipe_ingredients payloads
                self.perform_legacy_ingredient_sync(recipe_obj, request.data)
                self.perform_ingredient_sync(recipe_obj, request.data)
        except Exception:
            pass
        return resp

    def update(self, request, *args, **kwargs):
        resp = super().update(request, *args, **kwargs)
        try:
            recipe_name = resp.data.get("recipe_name") or kwargs.get("pk")
            if recipe_name:
                recipe_obj = Recipe.objects.get(recipe_name=recipe_name)
                # handle legacy and new ingredient payloads
                self.perform_legacy_ingredient_sync(recipe_obj, request.data)
                self.perform_ingredient_sync(recipe_obj, request.data)
        except Exception:
            pass
        return resp


class IngredientViewSet(viewsets.ModelViewSet):
    queryset = Ingredient.objects.all().order_by("name")
    serializer_class = IngredientSerializer
    permission_classes = [permissions.AllowAny]


class RecipeIngredientViewSet(viewsets.ModelViewSet):
    queryset = RecipeIngredient.objects.all().select_related("ingredient", "recipe")
    serializer_class = RecipeIngredientSerializer
    permission_classes = [permissions.AllowAny]


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register_user(request):
    """Register a new customer. Expects 'name', 'email', 'password'."""
    serializer = CustomerSerializer(data=request.data)
    if serializer.is_valid():
        customer = serializer.save()
        data = CustomerSerializer(customer).data
        return Response(data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_customer(request):
    """Simple login that verifies email + password and returns customer data (no token)."""
    email = request.data.get("email")
    password = request.data.get("password")
    if not email or not password:
        return Response({"detail": "email and password required"}, status=status.HTTP_400_BAD_REQUEST)
    # First try Customer
    from django.contrib.auth.hashers import check_password

    try:
        cust = Customer.objects.get(email=email)
        # compare hashed password
        if not check_password(password, cust.password):
            return Response({"detail": "invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)
        data = CustomerSerializer(cust).data
        data["role"] = "customer"
        return Response(data)
    except Customer.DoesNotExist:
        # try Owner as a fallback (owner and customer are distinct models)
        try:
            owner = Owner.objects.get(email=email)
            # Owner.password may be hashed or plain (legacy). Try check_password first,
            # then fall back to plain equality for backward compatibility.
            if check_password(password, owner.password) or owner.password == password:
                data = OwnerSerializer(owner).data
                data["role"] = "owner"
                return Response(data)
            return Response({"detail": "invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)
        except Owner.DoesNotExist:
            return Response({"detail": "invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def record_sale(request):
    """Record a completed sale as a DailyCount entry.

    Expected POST JSON:
    - recipe_name: optional, if provided will be used to look up price
    - amount: optional numeric value (overrides recipe price)
    - customer_id: optional integer PK; defaults to 1

    Behavior: create DailyCount(timestamp=now, customer=Customer(pk=customer_id), amount=amount)
    """
    recipe_name = request.data.get("recipe_name")
    amount = request.data.get("amount")
    customer_id = request.data.get("customer_id") or 1

    # Resolve amount from recipe if not provided
    if amount is None and recipe_name:
        try:
            r = Recipe.objects.get(recipe_name=recipe_name)
            amount = r.price
        except Recipe.DoesNotExist:
            amount = 0

    # Ensure amount is numeric
    try:
        amount = float(amount)
    except Exception:
        return Response({"detail": "invalid amount"}, status=status.HTTP_400_BAD_REQUEST)

    # Lookup customer (default id=1). If missing and id==1, create a Guest customer.
    try:
        cust = Customer.objects.get(pk=customer_id)
    except Customer.DoesNotExist:
        if int(customer_id) == 1:
            # create a guest fallback customer if not present
            from django.contrib.auth.hashers import make_password

            cust, created = Customer.objects.get_or_create(
                pk=1,
                defaults={
                    "name": "Guest",
                    "email": "guest@example.com",
                    "password": make_password("guest"),
                },
            )
        else:
            return Response({"detail": f"customer id {customer_id} does not exist"}, status=status.HTTP_400_BAD_REQUEST)

    # Resolve recipe object (if provided). If not, let model default apply.
    recipe_obj = None
    if recipe_name:
        try:
            recipe_obj = Recipe.objects.get(recipe_name=recipe_name)
        except Recipe.DoesNotExist:
            recipe_obj = None

    # Create DailyCount with recipe if available
    # Resolve machine if provided
    machine_id = request.data.get("machine_id")
    machine_obj = None
    if machine_id:
        try:
            machine_obj = Machine.objects.get(machine_id=machine_id)
        except Machine.DoesNotExist:
            machine_obj = None

    if recipe_obj:
        dc = DailyCount(customer=cust, amount=amount, recipe=recipe_obj, machine=machine_obj)
    else:
        dc = DailyCount(customer=cust, amount=amount, machine=machine_obj)
    dc.save()

    return Response(DailyCountSerializer(dc).data, status=status.HTTP_201_CREATED)
