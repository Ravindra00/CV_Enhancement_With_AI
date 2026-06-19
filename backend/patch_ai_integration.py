import re

with open('app/utils/ai_integration.py', 'r') as f:
    content = f.read()

# Replace Groq with litellm logic
new_header = """from app.config_store import get_config
\"\"\"
AI Integration Module
Handles LLM API calls for CV enhancement and cover letter generation
Uses litellm to support any model dynamically (OpenAI, Groq, Anthropic, Ollama, etc.)
\"\"\"

import os
import json
from typing import Optional, Dict, List
from datetime import datetime

# ✅ Load environment variables
from dotenv import load_dotenv
load_dotenv()

import litellm

def get_ai_config():
    from app.config_store import get_config
    
    # 1. Check if generic AI_MODEL is set
    model_type = get_config('ai_model_type', os.getenv("AI_MODEL_TYPE", "")).strip().lower()
    api_key = get_config('ai_api_key', os.getenv("AI_API_KEY", "")).strip()
    
    # 2. Check if specific AI_MODEL is set, otherwise default based on type
    model = get_config('ai_model', os.getenv("AI_MODEL", "")).strip()
    
    if not model:
        if model_type == 'openai':
            model = 'gpt-4o-mini' # Default openai model
        elif model_type == 'anthropic':
            model = 'claude-3-haiku-20240307'
        else:
            model = ''

    if model and api_key:
        # LiteLLM format requires provider/model or just model if standard
        if model_type and model_type not in model and '/' not in model:
            if model_type == 'openai':
                pass # openai is default
            else:
                model = f"{model_type}/{model}"
        return {
            "model": model,
            "api_key": api_key
        }
        
    # 3. Fallback to Groq
    groq_key = get_config('groq_api_key', os.getenv("GROQ_API_KEY", "")).strip()
    if groq_key:
        return {
            "model": "groq/llama-3.1-8b-instant",
            "api_key": groq_key
        }
        
    print("⚠️  WARNING: No AI API keys set! AI features will not work.")
    return None
"""

content = re.sub(r'from app\.config_store import get_config\n.*?def _get_working_model\(client\):\n.*?(?=\n\n# =+)', new_header, content, flags=re.DOTALL)

# In generate_cover_letter:
content = re.sub(r'# ✅ Check if client is initialized.*?if not model:.*?return _generate_fallback_cover_letter\(user_name, job_description\)', 
'''# Get AI Config
        ai_config = get_ai_config()
        if not ai_config:
            print("⚠️  No AI config available, using fallback")
            return _generate_fallback_cover_letter(user_name, job_description)
            
        model = ai_config["model"]
        api_key = ai_config["api_key"]''', content, flags=re.DOTALL)

# Replace the Groq call in generate_cover_letter
content = re.sub(r'# ✅ Call Groq API using SDK\s*response = client\.chat\.completions\.create\([^)]+\)', 
'''# ✅ Call API using litellm
        response = litellm.completion(
            model=model,
            api_key=api_key,
            messages=[
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )''', content, flags=re.DOTALL)


# In analyze_cv:
content = re.sub(r'if not client:.*?if not model:.*?return \{.*?\}', 
'''ai_config = get_ai_config()
        if not ai_config:
            print("⚠️  No AI config available")
            return {
                'analysis': {'strengths': ['Profile complete'], 'improvements': [], 'score': 60},
                'status': 'api_error'
            }
        model = ai_config["model"]
        api_key = ai_config["api_key"]''', content, flags=re.DOTALL)

# Replace Groq call in analyze_cv
content = re.sub(r'response = client\.chat\.completions\.create\([^)]+\)',
'''response = litellm.completion(
            model=model,
            api_key=api_key,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.7
        )''', content, flags=re.DOTALL)


# In groq_enhance_sections:
content = re.sub(r'if not client:.*?if not model:.*?return \{"enhanced_cv": cv_data, "status": "api_error"\}',
'''ai_config = get_ai_config()
        if not ai_config:
            print("⚠️  No AI config available")
            return {"enhanced_cv": cv_data, "status": "api_error"}
        model = ai_config["model"]
        api_key = ai_config["api_key"]''', content, flags=re.DOTALL)

content = re.sub(r'response = client\.chat\.completions\.create\([^)]+\)',
'''response = litellm.completion(
            model=model,
            api_key=api_key,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
            temperature=0.6,
        )''', content, flags=re.DOTALL)


with open('app/utils/ai_integration.py', 'w') as f:
    f.write(content)

