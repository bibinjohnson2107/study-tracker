from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from apps.study.models import StudyGoal, RoadmapImport
from apps.study.serializers import StudyGoalSerializer, RoadmapImportSerializer
from .extractors import extract_text_from_file
from .services import AIService

class ImportRoadmapView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def post(self, request):
        source_type = request.data.get('source_type', 'PASTE')
        pasted_text = request.data.get('text', '')
        uploaded_file = request.FILES.get('file')
        file_name = ''

        extracted_text = ''

        if source_type == 'UPLOAD' or uploaded_file:
            if not uploaded_file:
                return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)
            file_name = uploaded_file.name
            try:
                extracted_text = extract_text_from_file(uploaded_file, file_name)
            except Exception as e:
                return Response({"error": f"Failed to extract file text: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            extracted_text = pasted_text

        if not extracted_text or not extracted_text.strip():
            return Response({"error": "No roadmap content provided or extracted text was empty."}, status=status.HTTP_400_BAD_REQUEST)

        # Run AI/Heuristic Analysis
        try:
            parsed_structure = AIService.analyze_roadmap_text(extracted_text)
        except Exception as e:
            return Response({
                "error": f"We couldn't understand this roadmap structure: {str(e)}. Try editing the text manually or try again."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Create Draft Goal
        goal_title = parsed_structure.get('title', 'My Study Goal')
        goal = StudyGoal.objects.create(
            user=request.user,
            title=goal_title,
            status='ACTIVE'
        )

        # Record RoadmapImport
        roadmap_import = RoadmapImport.objects.create(
            user=request.user,
            study_goal=goal,
            source_type=source_type,
            file_name=file_name,
            original_content=extracted_text,
            parsed_json=parsed_structure,
            analysis_status='SUCCESS'
        )

        return Response({
            "goal_id": goal.id,
            "import_id": roadmap_import.id,
            "structure": parsed_structure,
            "original_text": extracted_text
        }, status=status.HTTP_201_CREATED)

class AnalyzeRoadmapView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        text = request.data.get('text', '')
        if not text:
            return Response({"error": "Text is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            parsed_structure = AIService.analyze_roadmap_text(text)
            return Response({"structure": parsed_structure})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
