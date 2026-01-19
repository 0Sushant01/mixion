from django.test import TestCase
from .models import Bottle

# Create your tests here.
class BottleModelTest(TestCase):
    def test_bottle_id_generation(self):
        b1 = Bottle.objects.create()
        self.assertEqual(b1.id, 'b1')
        
        b2 = Bottle.objects.create()
        self.assertEqual(b2.id, 'b2')
        
        b3 = Bottle.objects.create()
        self.assertEqual(b3.id, 'b3')

    def test_bottle_id_with_deletion(self):
        b1 = Bottle.objects.create() # b1
        b2 = Bottle.objects.create() # b2
        b2.delete()
        b3 = Bottle.objects.create() 
        # Logic says max_num + 1. max is 1 (from b1). So b2?
        # Or max_num is from ALL existing? 
        # Existing: b1. max=1. Next -> b2.
        # This behavior reuses IDs if tail is deleted?
        # If I have b1, b3 (b2 deleted manually). max=3. Next -> b4.
        
        # Let's test the gap scenario.
        Bottle.objects.all().delete()
        b1 = Bottle.objects.create() # b1
        b2 = Bottle.objects.create() # b2
        b3 = Bottle.objects.create() # b3
        b2.delete()
        # Existing: b1, b3. max=3. Next should be b4.
        b4 = Bottle.objects.create()
        self.assertEqual(b4.id, 'b4')
