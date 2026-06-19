import sys
import os
sys.path.append(os.getcwd())

from app.utils.ai_integration import groq_enhance_sections

cv_data = {
    "experiences": [{"company": "Test", "description": "test"}],
    "projects": [],
    "skills": []
}

res = groq_enhance_sections(cv_data, "Software Engineer")
print("RESULT:", res)
