from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from .services import AIService

class AIRoadmapTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    # User Prompt Specific Semantic Classification Test
    def test_21_user_semantic_classification(self):
        text = """Target: AI Engineer

Level: Intermediate

Estimated duration: 8–12 months

Recommended study time: 10–15 hours/week

If your goal is to become a production-ready AI engineer, you don't need to learn everything in a strict linear order.

## Python

Learn:

* Variables
* Functions
* OOP

Project:
Build a CLI application.

## Backend

You should learn backend development after understanding Python.

Topics:

* Django
* FastAPI
* REST APIs

Resource:
https://docs.djangoproject.com/"""

        res = AIService.analyze_roadmap_text(text)
        
        # Title & Metadata assertions
        self.assertEqual(res["title"], "AI Engineer")
        self.assertEqual(res["metadata"]["target"], "AI Engineer")
        self.assertEqual(res["metadata"]["level"], "Intermediate")
        self.assertEqual(res["metadata"]["estimated_duration"], "8–12 months")
        self.assertEqual(res["metadata"]["recommended_study_time"], "10–15 hours/week")

        # Modules assertions
        self.assertEqual(len(res["modules"]), 2)
        mod1 = res["modules"][0]
        self.assertEqual(mod1["title"], "Python")
        self.assertEqual([t["title"] for t in mod1["topics"]], ["Variables", "Functions", "OOP"])

        mod2 = res["modules"][1]
        self.assertEqual(mod2["title"], "Backend")
        self.assertEqual([t["title"] for t in mod2["topics"]], ["Django", "FastAPI", "REST APIs"])

        # Supporting content assertions
        self.assertIn("Build a CLI application.", res["supporting_content"]["projects"])
        self.assertIn("https://docs.djangoproject.com/", res["supporting_content"]["resources"])

        # Non-topic assertions: Verify metadata/projects/resources NEVER became topic titles
        all_topic_titles = [t["title"] for m in res["modules"] for t in m["topics"]]
        for forbidden in ["Target", "Level", "Estimated duration", "Recommended study time", "Project", "Build a CLI application", "Resource", "https://docs.djangoproject.com/"]:
            self.assertNotIn(forbidden, all_topic_titles)

    # 1. Clean numbered roadmap
    def test_01_clean_numbered_roadmap(self):
        text = "Python Roadmap\n1. Python Fundamentals\n2. Advanced Python\n3. Web Development"
        res = AIService.analyze_roadmap_text(text)
        self.assertEqual(res["title"], "Python Roadmap")
        self.assertTrue(len(res["modules"]) >= 1)

    # 2. Markdown roadmap
    def test_02_markdown_roadmap(self):
        text = "# Web Development Roadmap\n## Frontend\n- HTML\n- CSS\n- JavaScript\n## Backend\n- Python\n- Node.js"
        res = AIService.analyze_roadmap_text(text)
        self.assertEqual(res["title"], "Web Development Roadmap")
        self.assertEqual(len(res["modules"]), 2)

    # 3. Nested Markdown
    def test_03_nested_markdown_roadmap(self):
        text = "# Full Stack\n## Backend\n### Python\n- Syntax\n- Functions\n### Django\n- Views\n- Models"
        res = AIService.analyze_roadmap_text(text)
        self.assertTrue(len(res["modules"]) >= 2)

    # 4. Phase roadmap
    def test_04_phase_roadmap(self):
        text = "Phase 1: Foundations\n- Python\n- Git\nPhase 2: Advanced\n- Asyncio\n- Multiprocessing"
        res = AIService.analyze_roadmap_text(text)
        self.assertEqual(len(res["modules"]), 2)

    # 5. Arrow roadmap
    def test_05_arrow_roadmap(self):
        text = "Python → Django → REST APIs → PostgreSQL → AWS"
        res = AIService.analyze_roadmap_text(text)
        self.assertTrue(len(res["modules"]) >= 1)

    # 6. Table roadmap
    def test_06_table_roadmap(self):
        text = "| Focus Area | Enhancements |\n|---|---|\n| Modern UI | Fluent UI controls |\n| Mobile | Dataverse sync |"
        res = AIService.analyze_roadmap_text(text)
        self.assertTrue(len(res["modules"]) >= 1)

    # 7. Timeline roadmap
    def test_07_timeline_roadmap(self):
        text = "Week 1: Python Basics\n- Variables\n- Loops\nWeek 2: OOP\n- Classes\n- Objects"
        res = AIService.analyze_roadmap_text(text)
        self.assertEqual(len(res["modules"]), 2)

    # 8. Prerequisite-heavy roadmap
    def test_08_prerequisite_heavy_roadmap(self):
        text = "Prerequisites:\n- Basic Algebra\n- Logic\nModule 1: Machine Learning\n- Linear Regression"
        res = AIService.analyze_roadmap_text(text)
        self.assertTrue(len(res["modules"]) >= 1)

    # 9. Project-heavy roadmap
    def test_09_project_heavy_roadmap(self):
        text = "Module 1: Python\n- Variables\nProject: Build a CLI Calculator\nHands-on Project: Weather App"
        res = AIService.analyze_roadmap_text(text)
        self.assertTrue(len(res["modules"]) >= 1)

    # 10. Resource-heavy roadmap
    def test_10_resource_heavy_roadmap(self):
        text = "Module 1: Python\n- Variables\nResources:\n- https://docs.python.org\n- Fluent Python book"
        res = AIService.analyze_roadmap_text(text)
        self.assertTrue(len(res["modules"]) >= 1)

    # 11. Specialization roadmap
    def test_11_specialization_roadmap(self):
        text = "Choose a specialization:\nA. Backend Engineering\nB. Data Science\nC. AI Engineering"
        res = AIService.analyze_roadmap_text(text)
        self.assertTrue(len(res["modules"]) >= 1)

    # 12. Emoji-heavy roadmap
    def test_12_emoji_heavy_roadmap(self):
        text = "🚀 Python Developer Roadmap\n⭐ Phase 1: Core Python\n🔥 Variables\n📚 Functions"
        res = AIService.analyze_roadmap_text(text)
        self.assertTrue(len(res["modules"]) >= 1)

    # 13. Code-heavy roadmap
    def test_13_code_heavy_roadmap(self):
        text = "Module 1: Python Functions\n- Function syntax\n```python\ndef hello():\n    print('Hello World')\n```"
        res = AIService.analyze_roadmap_text(text)
        self.assertTrue(len(res["modules"]) >= 1)

    # 14. Prose-heavy roadmap
    def test_14_prose_heavy_roadmap(self):
        text = "If your goal is Python developer, learn it in layers.\n\nModule 1: Fundamentals\n- Variables\n- Data types"
        res = AIService.analyze_roadmap_text(text)
        self.assertTrue(len(res["modules"]) >= 1)

    # 15. Mixed-format roadmap
    def test_15_mixed_format_roadmap(self):
        text = "# Python Roadmap\nPhase 1: Basics\n1. Variables\n- Functions\n| Topic | Duration |\n|---|---|\n| OOP | 2 weeks |\nPython → Django → APIs"
        res = AIService.analyze_roadmap_text(text)
        self.assertTrue(len(res["modules"]) >= 1)

    # 16. Messy indentation
    def test_16_messy_indentation_roadmap(self):
        text = "Module 1: Python\n   -   Variables\n      * Data Types\n 1. Functions"
        res = AIService.analyze_roadmap_text(text)
        self.assertTrue(len(res["modules"]) >= 1)

    # 17. Duplicate topics
    def test_17_duplicate_topics_roadmap(self):
        text = "Module 1: Basics\n- Functions\nModule 2: Advanced\n- Functions"
        res = AIService.analyze_roadmap_text(text)
        self.assertEqual(len(res["modules"]), 2)

    # 18. Empty sections
    def test_18_empty_sections_roadmap(self):
        text = "Module 1: Python\n\n\n- Variables\n- Functions\n\nModule 2: Django\n- Models"
        res = AIService.analyze_roadmap_text(text)
        self.assertEqual(len(res["modules"]), 2)

    # 19. Missing headings
    def test_19_missing_headings_roadmap(self):
        text = "Variables\nData Types\nFunctions\nClasses\nDecorators"
        res = AIService.analyze_roadmap_text(text)
        self.assertTrue(len(res["modules"]) >= 1)

    # 20. Multiple roadmap sections in one response
    def test_20_multiple_roadmap_sections(self):
        text = "## 1. Backend Roadmap\n- Python\n- Django\n\n## 2. Frontend Roadmap\n- HTML\n- React"
        res = AIService.analyze_roadmap_text(text)
        self.assertEqual(len(res["modules"]), 2)
