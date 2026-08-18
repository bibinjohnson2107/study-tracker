import json
from django.db import models
from django.contrib.auth.models import User

class StudyGoal(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
        ('ARCHIVED', 'Archived'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='study_goals')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} ({self.user.username})"

class Module(models.Model):
    study_goal = models.ForeignKey(StudyGoal, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.study_goal.title} - {self.title}"

class Topic(models.Model):
    STATUS_NOT_STARTED = 'NOT_STARTED'
    STATUS_IN_PROGRESS = 'IN_PROGRESS'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_CHOICES = (
        (STATUS_NOT_STARTED, 'Not Started'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
    )
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='topics')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_NOT_STARTED)
    order = models.IntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.module.title} - {self.title}"

class Subtopic(models.Model):
    STATUS_NOT_STARTED = 'NOT_STARTED'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_CHOICES = (
        (STATUS_NOT_STARTED, 'Not Started'),
        (STATUS_COMPLETED, 'Completed'),
    )
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='subtopics')
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_NOT_STARTED)
    order = models.IntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.topic.title} -> {self.title}"

class Note(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notes')
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, null=True, blank=True, related_name='notes')
    study_goal = models.ForeignKey(StudyGoal, on_delete=models.CASCADE, null=True, blank=True, related_name='general_notes')
    content = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        if self.topic:
            return f"Note {self.id} for Topic {self.topic.title}"
        elif self.study_goal:
            return f"General Note {self.id} for Goal {self.study_goal.title}"
        return f"Note {self.id}"

class Resource(models.Model):
    TYPE_CHOICES = (
        ('LINK', 'Link / Website'),
        ('IMAGE', 'Image'),
        ('VIDEO', 'Video'),
        ('DOCUMENT', 'Document'),
    )
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='resources')
    title = models.CharField(max_length=255)
    resource_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='LINK')
    url = models.URLField(max_length=1000, blank=True, default='')
    file = models.FileField(upload_to='resources/%Y/%m/%d/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.resource_type})"

class StudySession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='study_sessions')
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='study_sessions')
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField()
    duration_seconds = models.IntegerField(default=0)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Session {self.duration_seconds}s on {self.topic.title}"

class RoadmapImport(models.Model):
    SOURCE_CHOICES = (
        ('PASTE', 'Pasted Text'),
        ('UPLOAD', 'Uploaded File'),
    )
    STATUS_CHOICES = (
        ('PENDING', 'Pending Analysis'),
        ('SUCCESS', 'Analysis Complete'),
        ('FAILED', 'Analysis Failed'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='roadmap_imports')
    study_goal = models.ForeignKey(StudyGoal, on_delete=models.SET_NULL, null=True, blank=True, related_name='imports')
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='PASTE')
    file_name = models.CharField(max_length=255, blank=True, default='')
    original_content = models.TextField()
    parsed_json_str = models.TextField(default='{}', blank=True)
    analysis_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def parsed_json(self):
        try:
            return json.loads(self.parsed_json_str or '{}')
        except Exception:
            return {}

    @parsed_json.setter
    def parsed_json(self, value):
        self.parsed_json_str = json.dumps(value or {})

    def __str__(self):
        return f"Import {self.id} ({self.source_type}) by {self.user.username}"
