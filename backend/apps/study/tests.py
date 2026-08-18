from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from .models import StudyGoal, Module, Topic, Subtopic, Note, Resource, StudySession

class StudyTrackerBackendTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password123')
        self.user2 = User.objects.create_user(username='user2', password='password123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_and_retrieve_study_goal(self):
        response = self.client.post('/api/goals/', {
            'title': 'Python GenAI Developer',
            'description': 'Master Python and LLMs'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(StudyGoal.objects.count(), 1)

    def test_user_data_isolation(self):
        goal1 = StudyGoal.objects.create(user=self.user, title="User 1 Goal")
        goal2 = StudyGoal.objects.create(user=self.user2, title="User 2 Goal")

        response = self.client.get('/api/goals/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], "User 1 Goal")

    def test_confirm_roadmap_hierarchy(self):
        goal = StudyGoal.objects.create(user=self.user, title="Draft Goal")
        roadmap_data = {
            "title": "Python GenAI Developer",
            "modules": [
                {
                    "title": "Advanced Python",
                    "topics": [
                        {
                            "title": "Decorators",
                            "subtopics": ["Function decorators", "Class decorators"]
                        }
                    ]
                }
            ]
        }
        response = self.client.post(f'/api/goals/{goal.id}/confirm_roadmap/', {
            "structure": roadmap_data
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Module.objects.count(), 1)
        self.assertEqual(Topic.objects.count(), 1)
        self.assertEqual(Subtopic.objects.count(), 2)

    def test_subtopic_toggle_and_topic_status(self):
        goal = StudyGoal.objects.create(user=self.user, title="Goal")
        module = Module.objects.create(study_goal=goal, title="Module")
        topic = Topic.objects.create(module=module, title="Topic")
        sub1 = Subtopic.objects.create(topic=topic, title="Sub 1")
        sub2 = Subtopic.objects.create(topic=topic, title="Sub 2")

        # Toggle sub1
        self.client.post(f'/api/subtopics/{sub1.id}/toggle_complete/')
        topic.refresh_from_db()
        self.assertEqual(topic.status, Topic.STATUS_IN_PROGRESS)

        # Toggle sub2
        self.client.post(f'/api/subtopics/{sub2.id}/toggle_complete/')
        topic.refresh_from_db()
        self.assertEqual(topic.status, Topic.STATUS_COMPLETED)
