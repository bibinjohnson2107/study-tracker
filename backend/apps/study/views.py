import os
import uuid
from django.conf import settings
from django.core.files.storage import default_storage
from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import StudyGoal, Module, Topic, Subtopic, Note, Resource, StudySession, RoadmapImport
from .serializers import (
    StudyGoalSerializer, ModuleSerializer, TopicSerializer, SubtopicSerializer,
    NoteSerializer, ResourceSerializer, StudySessionSerializer, RoadmapImportSerializer
)

class UserOwnerQuerysetMixin:
    """Mixin ensuring users can only access their own data."""
    permission_classes = [permissions.IsAuthenticated]

class StudyGoalViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = StudyGoalSerializer

    def get_queryset(self):
        return StudyGoal.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def confirm_roadmap(self, request, pk=None):
        """
        Accepts structured JSON representation from the Review Roadmap stage
        and creates/replaces the Goal, Modules, Topics, and Subtopics.
        """
        goal = self.get_object()
        roadmap_data = request.data.get('structure')
        if not roadmap_data:
            return Response({"error": "Structure field is required."}, status=status.HTTP_400_BAD_REQUEST)

        title = roadmap_data.get('title', goal.title)
        goal.title = title
        goal.save()

        # Re-build hierarchy
        goal.modules.all().delete()

        modules_data = roadmap_data.get('modules', [])
        for m_idx, m_data in enumerate(modules_data):
            module = Module.objects.create(
                study_goal=goal,
                title=m_data.get('title', f'Module {m_idx+1}'),
                description=m_data.get('description', ''),
                order=m_idx
            )
            topics_data = m_data.get('topics', [])
            for t_idx, t_data in enumerate(topics_data):
                topic = Topic.objects.create(
                    module=module,
                    title=t_data.get('title', f'Topic {t_idx+1}'),
                    description=t_data.get('description', ''),
                    status=t_data.get('status', Topic.STATUS_NOT_STARTED),
                    order=t_idx
                )
                subtopics_data = t_data.get('subtopics', [])
                for s_idx, s_item in enumerate(subtopics_data):
                    s_title = s_item if isinstance(s_item, str) else s_item.get('title', f'Subtopic {s_idx+1}')
                    Subtopic.objects.create(
                        topic=topic,
                        title=s_title,
                        order=s_idx
                    )

        serializer = self.get_serializer(goal)
        return Response(serializer.data)

class ModuleViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ModuleSerializer

    def get_queryset(self):
        return Module.objects.filter(study_goal__user=self.request.user)

class TopicViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TopicSerializer

    def get_queryset(self):
        queryset = Topic.objects.filter(module__study_goal__user=self.request.user)
        goal_id = self.request.query_params.get('goal_id')
        if goal_id:
            queryset = queryset.filter(module__study_goal_id=goal_id)
        return queryset

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        topic = self.get_object()
        new_status = request.data.get('status')
        if new_status not in [Topic.STATUS_NOT_STARTED, Topic.STATUS_IN_PROGRESS, Topic.STATUS_COMPLETED]:
            return Response({"error": "Invalid status value."}, status=status.HTTP_400_BAD_REQUEST)

        topic.status = new_status
        if new_status == Topic.STATUS_COMPLETED:
            topic.completed_at = timezone.now()
            # Mark all subtopics complete as well
            topic.subtopics.update(status=Subtopic.STATUS_COMPLETED, completed_at=timezone.now())
        elif new_status == Topic.STATUS_IN_PROGRESS:
            topic.completed_at = None
        else:
            topic.completed_at = None
            topic.subtopics.update(status=Subtopic.STATUS_NOT_STARTED, completed_at=None)

        topic.save()
        serializer = self.get_serializer(topic)
        return Response(serializer.data)

class SubtopicViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SubtopicSerializer

    def get_queryset(self):
        return Subtopic.objects.filter(topic__module__study_goal__user=self.request.user)

    @action(detail=True, methods=['post'])
    def toggle_complete(self, request, pk=None):
        subtopic = self.get_object()
        if subtopic.status == Subtopic.STATUS_COMPLETED:
            subtopic.status = Subtopic.STATUS_NOT_STARTED
            subtopic.completed_at = None
        else:
            subtopic.status = Subtopic.STATUS_COMPLETED
            subtopic.completed_at = timezone.now()

        subtopic.save()

        # Update parent topic status if all or some subtopics are done
        topic = subtopic.topic
        subtopics = topic.subtopics.all()
        completed_count = subtopics.filter(status=Subtopic.STATUS_COMPLETED).count()
        total_count = subtopics.count()

        if completed_count == total_count and total_count > 0:
            topic.status = Topic.STATUS_COMPLETED
            topic.completed_at = timezone.now()
        elif completed_count > 0:
            topic.status = Topic.STATUS_IN_PROGRESS
            topic.completed_at = None
        topic.save()

        serializer = self.get_serializer(subtopic)
        return Response(serializer.data)

class NoteViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NoteSerializer

    def get_queryset(self):
        return Note.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get', 'post'], url_path='by-topic/(?P<topic_id>\d+)')
    def by_topic(self, request, topic_id=None):
        topic = Topic.objects.filter(id=topic_id, module__study_goal__user=request.user).first()
        if not topic:
            return Response({"error": "Topic not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'POST':
            content = request.data.get('content', '')
            note = Note.objects.create(user=request.user, topic=topic, content=content)
            serializer = self.get_serializer(note)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        notes = Note.objects.filter(user=request.user, topic=topic).order_by('created_at')
        serializer = self.get_serializer(notes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get', 'post'], url_path='by-goal/(?P<goal_id>\d+)')
    def by_goal(self, request, goal_id=None):
        goal = StudyGoal.objects.filter(id=goal_id, user=request.user).first()
        if not goal:
            return Response({"error": "Study goal not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'POST':
            content = request.data.get('content', '')
            note = Note.objects.create(user=request.user, study_goal=goal, content=content)
            serializer = self.get_serializer(note)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        notes = Note.objects.filter(user=request.user, study_goal=goal).order_by('created_at')
        serializer = self.get_serializer(notes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='upload-media')
    def upload_media(self, request):
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        ext = os.path.splitext(uploaded_file.name)[1]
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join('notes_media', unique_filename)

        saved_path = default_storage.save(file_path, uploaded_file)
        file_url = f"{settings.MEDIA_URL}{saved_path}".replace('\\', '/')

        return Response({
            "url": file_url,
            "file_name": uploaded_file.name,
            "file_size": uploaded_file.size,
            "mime_type": getattr(uploaded_file, 'content_type', 'application/octet-stream')
        }, status=status.HTTP_201_CREATED)

class ResourceViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ResourceSerializer

    def get_queryset(self):
        queryset = Resource.objects.filter(topic__module__study_goal__user=self.request.user)
        topic_id = self.request.query_params.get('topic_id')
        if topic_id:
            queryset = queryset.filter(topic_id=topic_id)
        return queryset

class StudySessionViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = StudySessionSerializer

    def get_queryset(self):
        queryset = StudySession.objects.filter(user=self.request.user)
        topic_id = self.request.query_params.get('topic_id')
        if topic_id:
            queryset = queryset.filter(topic_id=topic_id)
        return queryset

    def perform_create(self, serializer):
        session = serializer.save(user=self.request.user)
        # Set topic to IN_PROGRESS if NOT_STARTED
        topic = session.topic
        if topic.status == Topic.STATUS_NOT_STARTED:
            topic.status = Topic.STATUS_IN_PROGRESS
            topic.save()

class GlobalSearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        goal_id = request.query_params.get('goal_id')
        if not query:
            return Response({"modules": [], "topics": [], "subtopics": [], "notes": [], "resources": []})

        user = request.user
        
        modules = Module.objects.filter(study_goal__user=user, title__icontains=query)
        topics = Topic.objects.filter(module__study_goal__user=user, title__icontains=query)
        subtopics = Subtopic.objects.filter(topic__module__study_goal__user=user, title__icontains=query)
        notes = Note.objects.filter(user=user, content__icontains=query)
        resources = Resource.objects.filter(topic__module__study_goal__user=user, title__icontains=query)

        if goal_id:
            modules = modules.filter(study_goal_id=goal_id)
            topics = topics.filter(module__study_goal_id=goal_id)
            subtopics = subtopics.filter(topic__module__study_goal_id=goal_id)
            notes = notes.filter(topic__module__study_goal_id=goal_id)
            resources = resources.filter(topic__module__study_goal_id=goal_id)

        return Response({
            "modules": ModuleSerializer(modules[:10], many=True, context={'request': request}).data,
            "topics": TopicSerializer(topics[:15], many=True, context={'request': request}).data,
            "subtopics": SubtopicSerializer(subtopics[:15], many=True, context={'request': request}).data,
            "notes": NoteSerializer(notes[:10], many=True, context={'request': request}).data,
            "resources": ResourceSerializer(resources[:10], many=True, context={'request': request}).data,
        })
