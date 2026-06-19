import re

with open('app/utils/ai_enhance.py', 'r') as f:
    content = f.read()

# Replace get_ai_config logic
new_imports = """import os
import re
import json
from app.config_store import get_config
import logging
from typing import Dict, Any, List, Optional, Tuple
import litellm
from app.utils.ai_integration import get_ai_config
"""

content = re.sub(r'import os\nimport re\nimport json\nfrom app\.config_store import get_config\nimport logging\nfrom typing import Dict, Any, List, Optional, Tuple', new_imports, content, flags=re.DOTALL)

# Update generate_enhanced_experience_for_suggestion
content = re.sub(r'''    api_key = os\.getenv\("GROQ_API_KEY", ""\)\.strip\(\)\n    if not api_key:\n        logger\.info\("GROQ_API_KEY not set — cannot generate enhanced content"\)\n        return None\n    \n    try:\n        from groq import Groq\n        client = Groq\(api_key=api_key\)''',
'''    ai_config = get_ai_config()
    if not ai_config:
        logger.info("AI config not set — cannot generate enhanced content")
        return None
    
    try:''', content, flags=re.DOTALL)

content = re.sub(r'''        response = client\.chat\.completions\.create\(\n            model="llama-3\.1-8b-instant",\n            messages=\[\{"role": "user", "content": prompt\}\],\n            temperature=0\.7,\n            max_tokens=800,\n            timeout=20,\n        \)''',
'''        response = litellm.completion(
            model=ai_config["model"],
            api_key=ai_config["api_key"],
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=800,
            timeout=20,
        )''', content, flags=re.DOTALL)

# Update groq_suggestions
content = re.sub(r'def groq_suggestions\(', 'def ai_suggestions(', content)
content = re.sub(r'''    api_key = os\.getenv\("GROQ_API_KEY", ""\)\.strip\(\)\n    if not api_key:\n        logger\.info\("GROQ_API_KEY not set — skipping AI suggestions"\)\n        return None\n\n    try:\n        from groq import Groq\n        client = Groq\(api_key=api_key\)''',
'''    ai_config = get_ai_config()
    if not ai_config:
        logger.info("AI config not set — skipping AI suggestions")
        return None

    try:''', content, flags=re.DOTALL)

content = re.sub(r'''        chat = client\.chat\.completions\.create\(\n            model="llama-3\.1-8b-instant",   # Free tier model on Groq\n            messages=\[\{"role": "user", "content": prompt\}\],\n            temperature=0\.7,\n            max_tokens=1500,\n            timeout=25,\n        \)''',
'''        chat = litellm.completion(
            model=ai_config["model"],
            api_key=ai_config["api_key"],
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1500,
            timeout=25,
        )''', content, flags=re.DOTALL)

# Also rename the call to groq_suggestions inside generate_suggestions
content = re.sub(r'ai_suggestions = groq_suggestions\(', 'ai_suggestions = ai_suggestions(', content)


with open('app/utils/ai_enhance.py', 'w') as f:
    f.write(content)

