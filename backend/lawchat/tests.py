from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
class ApiTests(APITestCase):
    def test_health_is_public(self):
        response=self.client.get('/api/health/')
        self.assertEqual(response.status_code,status.HTTP_200_OK)
        self.assertEqual(response.data['status'],'ok')
    def test_user_can_create_and_list_conversations(self):
        user=get_user_model().objects.create_user(username='tester',password='TestPassword123!')
        self.client.force_authenticate(user=user)
        response=self.client.post('/api/conversations/',{'title':'My legal question'},format='json')
        self.assertEqual(response.status_code,status.HTTP_201_CREATED)
        listing=self.client.get('/api/conversations/')
        self.assertEqual(listing.status_code,status.HTTP_200_OK)
        self.assertEqual(len(listing.data),1)
