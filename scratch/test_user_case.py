import sys
import os

sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'studytracker.settings')
import django
django.setup()

from apps.ai_roadmap.services import AIService

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
print("Title:", res.get("title"))
print("Metadata:", res.get("metadata"))
print("Supporting Content:", res.get("supporting_content"))
print("Modules:")
for m in res.get("modules", []):
    print(f"  Module '{m['title']}':", [t['title'] for t in m.get("topics", [])])
