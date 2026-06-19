import sys
import os
sys.path.append(os.getcwd())
from app.utils.ai_integration import get_ai_config
print("AI_CONFIG:", get_ai_config())
