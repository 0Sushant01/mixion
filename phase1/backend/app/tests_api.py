from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from .models import Bottle

class BottleAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.bottle1 = Bottle.objects.create(bottle_type='Wine', ingredient='Grapes')
        self.bottle2 = Bottle.objects.create(bottle_type='Beer', ingredient='Barley')

    def test_get_bottles(self):
        response = self.client.get('/api/bottles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should contain b1 and b2 (assuming test db is fresh for each test)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]['id'], 'b1')

    def test_create_bottle(self):
        data = {'bottle_type': 'Juice', 'ingredient': 'Orange'}
        response = self.client.post('/api/bottles/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['id'], 'b3')
