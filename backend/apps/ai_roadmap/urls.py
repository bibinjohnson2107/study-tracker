from django.urls import path
from .views import ImportRoadmapView, AnalyzeRoadmapView

urlpatterns = [
    path('import/', ImportRoadmapView.as_view(), name='roadmap_import'),
    path('analyze/', AnalyzeRoadmapView.as_view(), name='roadmap_analyze'),
]
