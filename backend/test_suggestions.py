import sys
import os
sys.path.append(os.getcwd())

from app.utils.ai_enhance import ai_suggestions

cv_data = {
    "experiences": [{"company": "Test", "description": "test"}],
    "projects": [],
    "skills": []
}

try:
    res = ai_suggestions(cv_data, "Software Engineer", [], 0)
    print("RESULT:", res)
except Exception as e:
    print("ERROR:", str(e))
