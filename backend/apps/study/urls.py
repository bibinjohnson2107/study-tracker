from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StudyGoalViewSet, ModuleViewSet, TopicViewSet, SubtopicViewSet,
    NoteViewSet, ResourceViewSet, StudySessionViewSet, GlobalSearchView
)

router = DefaultRouter()
router.register('goals', StudyGoalViewSet, basename='goal')
router.register('modules', ModuleViewSet, basename='module')
router.register('topics', TopicViewSet, basename='topic')
router.register('subtopics', SubtopicViewSet, basename='subtopic')
router.register('notes', NoteViewSet, basename='note')
router.register('resources', ResourceViewSet, basename='resource')
router.register('sessions', StudySessionViewSet, basename='session')

urlpatterns = [
    path('search/', GlobalSearchView.as_view(), name='global_search'),
    path('', include(router.urls)),
]
