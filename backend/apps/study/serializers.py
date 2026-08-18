from rest_framework import serializers
from .models import StudyGoal, Module, Topic, Subtopic, Note, Resource, StudySession, RoadmapImport

class SubtopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subtopic
        fields = ('id', 'topic', 'title', 'status', 'order', 'completed_at', 'created_at', 'updated_at')

class ResourceSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Resource
        fields = ('id', 'topic', 'title', 'resource_type', 'url', 'file', 'file_url', 'created_at', 'updated_at')

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ('id', 'user', 'topic', 'study_goal', 'content', 'created_at', 'updated_at')
        read_only_fields = ('user',)

class StudySessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudySession
        fields = ('id', 'user', 'topic', 'started_at', 'ended_at', 'duration_seconds', 'notes', 'created_at')
        read_only_fields = ('user',)

class TopicSerializer(serializers.ModelSerializer):
    subtopics = SubtopicSerializer(many=True, read_only=True)
    completed_subtopics_count = serializers.SerializerMethodField()
    total_subtopics_count = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()
    total_study_time_seconds = serializers.SerializerMethodField()
    module_title = serializers.ReadOnlyField(source='module.title')
    goal_title = serializers.ReadOnlyField(source='module.study_goal.title')
    goal_id = serializers.ReadOnlyField(source='module.study_goal.id')

    class Meta:
        model = Topic
        fields = (
            'id', 'module', 'module_title', 'goal_id', 'goal_title', 'title', 'description', 'status', 
            'order', 'completed_at', 'subtopics', 'completed_subtopics_count', 
            'total_subtopics_count', 'progress_percentage', 'total_study_time_seconds',
            'created_at', 'updated_at'
        )

    def get_completed_subtopics_count(self, obj):
        return obj.subtopics.filter(status=Subtopic.STATUS_COMPLETED).count()

    def get_total_subtopics_count(self, obj):
        return obj.subtopics.count()

    def get_progress_percentage(self, obj):
        subtopics = obj.subtopics.all()
        if subtopics.exists():
            completed = subtopics.filter(status=Subtopic.STATUS_COMPLETED).count()
            return int((completed / subtopics.count()) * 100)
        return 100 if obj.status == Topic.STATUS_COMPLETED else (50 if obj.status == Topic.STATUS_IN_PROGRESS else 0)

    def get_total_study_time_seconds(self, obj):
        sessions = obj.study_sessions.all()
        return sum(s.duration_seconds for s in sessions)

class ModuleSerializer(serializers.ModelSerializer):
    topics = TopicSerializer(many=True, read_only=True)
    completed_topics_count = serializers.SerializerMethodField()
    total_topics_count = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = (
            'id', 'study_goal', 'title', 'description', 'order', 'topics',
            'completed_topics_count', 'total_topics_count', 'progress_percentage',
            'created_at', 'updated_at'
        )

    def get_completed_topics_count(self, obj):
        return obj.topics.filter(status=Topic.STATUS_COMPLETED).count()

    def get_total_topics_count(self, obj):
        return obj.topics.count()

    def get_progress_percentage(self, obj):
        topics = obj.topics.all()
        if not topics.exists():
            return 0
        completed = topics.filter(status=Topic.STATUS_COMPLETED).count()
        return int((completed / topics.count()) * 100)

class StudyGoalSerializer(serializers.ModelSerializer):
    modules = ModuleSerializer(many=True, read_only=True)
    completed_topics_count = serializers.SerializerMethodField()
    total_topics_count = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()
    original_text = serializers.SerializerMethodField()

    class Meta:
        model = StudyGoal
        fields = (
            'id', 'user', 'title', 'description', 'status', 'modules',
            'completed_topics_count', 'total_topics_count', 'progress_percentage',
            'original_text', 'created_at', 'updated_at'
        )
        read_only_fields = ('user',)

    def get_original_text(self, obj):
        imp = obj.imports.order_by('-created_at').first()
        if imp:
            return imp.original_content
        return None


    def get_completed_topics_count(self, obj):
        return Topic.objects.filter(module__study_goal=obj, status=Topic.STATUS_COMPLETED).count()

    def get_total_topics_count(self, obj):
        return Topic.objects.filter(module__study_goal=obj).count()

    def get_progress_percentage(self, obj):
        total = self.get_total_topics_count(obj)
        if total == 0:
            return 0
        completed = self.get_completed_topics_count(obj)
        return int((completed / total) * 100)

class RoadmapImportSerializer(serializers.ModelSerializer):
    parsed_json = serializers.JSONField()

    class Meta:
        model = RoadmapImport
        fields = (
            'id', 'user', 'study_goal', 'source_type', 'file_name', 
            'original_content', 'parsed_json', 'analysis_status', 'created_at', 'updated_at'
        )
        read_only_fields = ('user',)

