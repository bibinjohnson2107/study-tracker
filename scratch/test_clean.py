import sys
import os
import re

sys.path.insert(0, os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'studytracker.settings')
import django
django.setup()

def clean_emoji(raw):
    return re.sub(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF\u2600-\u27BF]', '', raw).strip()

for text in ["Frontend", "Backend", "Python Fundamentals", "🚀 Python Developer Roadmap"]:
    print(f"Cleaned '{text}': '{clean_emoji(text)}'")
