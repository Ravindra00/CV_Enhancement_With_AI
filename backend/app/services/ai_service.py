import litellm
from app.services.settings_service import get_setting

async def call_ai(prompt: str, db) -> str:
    # Get Anthropic key from settings
    anthropic_key = get_setting("ANTHROPIC_API_KEY", db)
    if not anthropic_key:
        raise ValueError("Anthropic API key is not set")
    
    # We use litellm.acompletion to call anthropic
    response = await litellm.acompletion(
        model="claude-3-haiku-20240307", 
        api_key=anthropic_key,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content
