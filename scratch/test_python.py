import sys
import os

sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'studytracker.settings')
import django
django.setup()

from apps.ai_roadmap.services import AIService

print("_clean_portion_name('Python'):", AIService._clean_portion_name("Python"))
print("_clean_portion_name('## Python'):", AIService._clean_portion_name("## Python"))
