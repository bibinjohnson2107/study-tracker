import sys
import os

sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'studytracker.settings')
import django
django.setup()

from apps.ai_roadmap.services import AIService

test_cases = {
    "test_02": "# Web Development Roadmap\n## Frontend\n- HTML\n- CSS\n- JavaScript\n## Backend\n- Python\n- Node.js",
    "test_03": "# Full Stack\n## Backend\n### Python\n- Syntax\n- Functions\n### Django\n- Views\n- Models",
    "test_04": "Phase 1: Foundations\n- Python\n- Git\nPhase 2: Advanced\n- Asyncio\n- Multiprocessing",
    "test_05": "Python → Django → REST APIs → PostgreSQL → AWS"
}

for name, text in test_cases.items():
    print(f"=== {name} ===")
    parsed = AIService.analyze_roadmap_text(text)
    print("Title:", parsed.get("title"))
    print("Modules:", [m["title"] for m in parsed.get("modules", [])])
    for m in parsed.get("modules", []):
        print(f"  Module '{m['title']}':", [t['title'] for t in m.get("topics", [])])
    print()
