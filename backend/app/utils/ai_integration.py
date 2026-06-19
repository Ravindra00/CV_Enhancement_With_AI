from app.config_store import get_config
"""
AI Integration Module
Handles LLM API calls for CV enhancement and cover letter generation
Uses litellm to support any model dynamically (OpenAI, Groq, Anthropic, Ollama, etc.)
"""

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


# ============================================================================
# COVER LETTER GENERATION
# ============================================================================

def generate_cover_letter(cv_data: dict, job_description: str, user_name: str = "User", language: str = "auto") -> str:
    """
    Generate a professional cover letter using Groq API.
    Returns plain text string (not JSON object).
    
    Args:
        cv_data: Dictionary containing CV information
        job_description: Job description text
        user_name: Name of the person
        language: Language override — 'auto', 'Deutsch', 'English', 'French', 'Spanish'
    
    Returns:
        Plain text cover letter string
    """
    try:
        print(f"\n{'='*70}")
        print(f"🤖 [generate_cover_letter] Starting...")
        print(f"{'='*70}")
        
        # Get AI Config
        ai_config = get_ai_config()
        if not ai_config:
            print("⚠️  No AI config available, using fallback")
            return _generate_fallback_cover_letter(user_name, job_description)
            
        model = ai_config["model"]
        api_key = ai_config["api_key"]
        
        # Resolve language: explicit override or auto-detect
        _LANG_MAP = {
            'Deutsch': 'de',
            'deutsch': 'de',
            'german': 'de',
            'English': 'en',
            'english': 'en',
            'French': 'fr',
            'french': 'fr',
            'Spanish': 'es',
            'spanish': 'es',
        }
        if language and language.lower() not in ('auto', 'auto-detect', ''):
            language_code = _LANG_MAP.get(language, language[:2].lower())
            language_name = language
            print(f"   Language override: {language_name} ({language_code})")
        else:
            from app.utils.language_detect import detect_language, get_language_name
            language_code = detect_language(job_description)
            language_name = get_language_name(language_code)
            print(f"   Language detected: {language_name} ({language_code})")

        # Inject mandatory language instruction into each prompt
        _lang_instruction = ''
        if language_code == 'de':
            _lang_instruction = 'Write the cover letter in German (Deutsch). Do not use any other language.'
        elif language_code == 'fr':
            _lang_instruction = 'Write the cover letter in French (Français). Do not use any other language.'
        elif language_code == 'es':
            _lang_instruction = 'Write the cover letter in Spanish (Español). Do not use any other language.'
        elif language_code == 'en':
            _lang_instruction = 'Write the cover letter in English. Do not use any other language.'
        else:
            _lang_instruction = f'Write the cover letter in {language_name}. Do not use any other language.'
        
        # Build CV summary
        name = cv_data.get('full_name', user_name)
        summary = cv_data.get('summary', '')
        
        print(f"   Name: {name}")
        print(f"   Summary: {summary[:50]}..." if summary else "   Summary: (empty)")
        
        # Build skills list
        skills = cv_data.get('skills', [])
        skills_text = ""
        if skills:
            if isinstance(skills, list):
                skill_names = [
                    s.get('name', str(s)) if isinstance(s, dict) else str(s)
                    for s in skills
                ]
                skills_text = ", ".join(skill_names[:10])
            else:
                skills_text = str(skills)
        
        print(f"   Skills: {skills_text[:80]}...")
        
        # Build experience summary
        experiences = cv_data.get('experiences', [])
        experience_text = ""
        if experiences and isinstance(experiences, list) and len(experiences) > 0:
            exp = experiences[0]
            if isinstance(exp, dict):
                company = exp.get('company', 'my previous company')
                position = exp.get('position', exp.get('role', 'position'))
                experience_text = f"As a {position} at {company}, I"
            else:
                experience_text = "In my previous roles, I"
        else:
            experience_text = "In my professional experience, I"
        
        print(f"   Experience: {experience_text}")
        
        # Language-specific prompts
        language_prompts = {  # noqa: these are kept for fallback
            'de': f"""Du bist ein professioneller Bewerbungsschreiber. 

Schreibe ein professionelles und überzeugendes Anschreiben basierend auf diesen Informationen:

**Kandidateninformationen:**
- Name: {name}
- Professionelle Zusammenfassung: {summary}
- Wichtige Fähigkeiten: {skills_text}
- Hintergrund: {experience_text}

**Stellenbeschreibung:**
{job_description}

Schreibe ein professionelles Anschreiben, das:
1. Mit einem starken Hook beginnt
2. Relevante Fähigkeiten hervorhebt, die dem Job entsprechen
3. Begeisterung für die Rolle zeigt
4. Mit einer Handlungsaufforderung endet
5. 3-4 Absätze lang ist
6. Einen professionellen aber persönlichen Ton verwendet

Geben Sie NUR den Anschreiben-Text zurück, keine Kopfzeilen oder Metadaten. Beginnen Sie direkt mit "Sehr geehrte Damen und Herren," oder ähnlich.""",
            
            'fr': f"""Vous êtes un rédacteur professionnel de lettres de motivation.

Rédigez une lettre de motivation professionnelle et convaincante basée sur ces informations :

**Informations sur le candidat :**
- Nom : {name}
- Résumé professionnel : {summary}
- Compétences clés : {skills_text}
- Contexte : {experience_text}

**Description du poste :**
{job_description}

Rédigez une lettre de motivation professionnelle qui :
1. Commence par un accroche puissante
2. Met en évidence les compétences pertinentes qui correspondent au poste
3. Montre l'enthousiasme pour le rôle
4. Se termine par un appel à l'action
5. Fait 3-4 paragraphes
6. Utilise un ton professionnel mais personnel

Retournez UNIQUEMENT le texte de la lettre, pas d'en-têtes ni de métadonnées. Commencez directement par "Madame, Monsieur," ou similaire.""",
            
            'es': f"""Eres un redactor profesional de cartas de presentación.

Redacta una carta de presentación profesional y convincente basada en esta información:

**Información del candidato:**
- Nombre: {name}
- Resumen profesional: {summary}
- Habilidades clave: {skills_text}
- Antecedentes: {experience_text}

**Descripción del puesto:**
{job_description}

Redacta una carta de presentación profesional que:
1. Comience con un gancho fuerte
2. Destaque habilidades relevantes que coincidan con el trabajo
3. Muestre entusiasmo por el puesto
4. Cierre con una llamada a la acción
5. Tenga 3-4 párrafos
6. Use un tono profesional pero personalizado

Devuelve SOLO el texto de la carta, sin encabezados ni metadatos. Comienza directamente con "Estimado Señor/Señora," o similar.""",
            
            'it': f"""Sei uno scrittore professionale di lettere di presentazione.

Scrivi una lettera di presentazione professionale e convincente basata su queste informazioni:

**Informazioni sul candidato:**
- Nome: {name}
- Riepilogo professionale: {summary}
- Competenze chiave: {skills_text}
- Background: {experience_text}

**Descrizione del lavoro:**
{job_description}

Scrivi una lettera di presentazione professionale che:
1. Inizi con un aggancio forte
2. Evidenzi competenze rilevanti che corrispondono al lavoro
3. Mostri entusiasmo per il ruolo
4. Chiuda con un invito all'azione
5. Sia lunga 3-4 paragrafi
6. Usi un tono professionale ma personale

Ritorna SOLO il testo della lettera, nessun intestazione o metadati. Inizia direttamente con "Spett.le Signore," o simile.""",
            
            'pt': f"""Você é um escritor profissional de cartas de apresentação.

Escreva uma carta de apresentação profissional e convincente com base nestas informações:

**Informações do candidato:**
- Nome: {name}
- Resumo profissional: {summary}
- Habilidades principais: {skills_text}
- Antecedentes: {experience_text}

**Descrição do trabalho:**
{job_description}

Escreva uma carta de apresentação profissional que:
1. Comece com um gancho forte
2. Destaque habilidades relevantes que correspondem ao trabalho
3. Mostre entusiasmo pelo cargo
4. Termine com um apelo à ação
5. Tenha 3-4 parágrafos
6. Use um tom profissional mas personalizado

Retorne APENAS o texto da carta, sem cabeçalhos ou metadados. Comece diretamente com "Prezado Senhor/Senhora," ou similar.""",
        }
        
        # Build unified prompt with explicit language instruction
        prompt = f"""{_lang_instruction}

You are a professional cover letter writer.

Generate a professional, compelling cover letter based on this information:

**Candidate Information:**
- Name: {name}
- Professional Summary: {summary}
- Key Skills: {skills_text}
- Background: {experience_text}

**Job Description:**
{job_description}

Write a FULL, properly formatted formal cover letter that:
1. Includes a formal header (Sender's placeholder address, Date, Recipient's placeholder address).
2. Uses a proper formal salutation (e.g., "Dear Hiring Manager,").
3. Opens with a strong hook in the first paragraph.
4. Highlights relevant skills that match the job in the body paragraphs.
5. Shows enthusiasm for the role and closes with a call to action in the final paragraph.
6. Ends with a formal sign-off (e.g., "Sincerely, {name}").
7. Is at least 3 to 4 distinct paragraphs long (make sure to separate paragraphs with blank lines).

{_lang_instruction}

Return the complete, properly formatted cover letter text. Do not wrap it in markdown blocks or output anything else."""

        print(f"\n📤 Sending to Groq API...")
        print(f"   Model: {model}")
        print(f"   Max tokens: 1000")
        
        # ✅ Call API using litellm
        response = litellm.completion(
            model=model,
            api_key=api_key,
            messages=[
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )
        
        print(f"\n✅ Response from Groq!")
        
        # Extract text from response
        if response.choices and len(response.choices) > 0:
            letter_text = response.choices[0].message.content
            
            if letter_text:
                letter_text = letter_text.strip()
                print(f"   Generated text: {len(letter_text)} chars")
                print(f"   Tokens used: {response.usage.total_tokens}")
                print(f"\n✅ SUCCESS! Generated {len(letter_text)} chars")
                print(f"   First 100 chars: {letter_text[:100]}...")
                print(f"{'='*70}\n")
                return letter_text
            else:
                print(f"⚠️  Empty response from API, using fallback")
                return _generate_fallback_cover_letter(name, job_description)
        else:
            print(f"❌ No choices in response!")
            return _generate_fallback_cover_letter(name, job_description)
    
    except Exception as e:
        print(f"❌ ERROR in generate_cover_letter:")
        print(f"   Type: {type(e).__name__}")
        print(f"   Message: {str(e)[:200]}")
        return _generate_fallback_cover_letter(user_name, job_description)


def _generate_fallback_cover_letter(name: str, job_description: str) -> str:
    """
    Generate a basic cover letter template when AI is unavailable.
    Returns plain text string.
    """
    from datetime import datetime
    date = datetime.now().strftime("%B %d, %Y")
    
    fallback = f"""[Your Name]
[Your Address]
[Your Phone]
[Your Email]

{date}

Hiring Manager
[Company Name]
[Company Address]

Dear Hiring Manager,

I am writing to express my strong interest in the position outlined in your job description. With my professional background and comprehensive skill set, I am confident that I can contribute meaningfully to your team.

My experience has equipped me with a deep understanding of the key responsibilities and requirements you're seeking. I am particularly drawn to this opportunity because of your organization's commitment to excellence and innovation in the industry.

I would welcome the opportunity to discuss how my background, skills, and enthusiasm align with your team's needs. Thank you for considering my application, and I look forward to hearing from you.

Sincerely,

{name}
"""
    
    print(f"\n📝 Using fallback cover letter ({len(fallback)} chars)")
    return fallback


# ============================================================================
# JOB DESCRIPTION EXTRACTION
# ============================================================================

def extract_job_description(url: str) -> Optional[str]:
    """
    Extract job description from URL using web scraping.
    Uses cookie-reject headers to bypass cookie consent dialogs.
    """
    try:
        import requests
        from bs4 import BeautifulSoup

        print(f"\n🔍 Extracting job description from: {url}")

        session = requests.Session()

        # Browser-like headers that reject cookies / consent walls
        headers = {
            'User-Agent': (
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/122.0.0.0 Safari/537.36'
            ),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            # Reject all non-essential cookies automatically
            'Cookie': 'cookieConsent=rejected; OptanonConsent=isGpcEnabled=0&datestamp=&version=&isIABGlobal=false&hosts=&consentId=&interactionCount=1&landingPath=&groups=C0001:0,C0002:0,C0003:0,C0004:0; euconsent-v2=rejected',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'no-cache',
            'DNT': '1',
        }

        response = session.get(url, headers=headers, timeout=15, allow_redirects=True)
        if response.status_code != 200:
            print(f"❌ Failed to fetch URL (status {response.status_code})")
            return None

        soup = BeautifulSoup(response.content, 'html.parser')

        # Remove scripts, styles, nav, header, footer, cookie banners
        for tag in soup(['script', 'style', 'nav', 'header', 'footer',
                         'aside', 'noscript', 'iframe', 'form',
                         '[class*="cookie"]', '[id*="cookie"]',
                         '[class*="consent"]', '[id*="consent"]']):
            tag.decompose()

        # Try to find the main job description container
        # (common class names across LinkedIn, Indeed, Stepstone, Xing, etc.)
        job_selectors = [
            {'class': 'description__text'},        # LinkedIn
            {'class': 'jobsearch-JobComponent'},   # Indeed
            {'id': 'job-details'},                 # Indeed alt
            {'class': 'job-description'},
            {'class': 'jobDescriptionContent'},
            {'class': 'jobDescription'},
            {'class': 'offer-body'},               # Stepstone
            {'class': 'job-ad-display'},           # Xing
            {'attrs': {'data-testid': 'job-description'}},
        ]

        text = None
        for selector in job_selectors:
            el = soup.find('div', **selector)
            if el:
                text = el.get_text(separator='\n', strip=True)
                if len(text) > 200:
                    print(f"✅ Found job section via selector {selector}")
                    break

        # Fallback: take the largest <article> or <main> or whole body
        if not text or len(text) < 200:
            for tag_name in ['article', 'main', 'body']:
                el = soup.find(tag_name)
                if el:
                    t = el.get_text(separator='\n', strip=True)
                    if len(t) > len(text or ''):
                        text = t

        if not text:
            text = soup.get_text(separator='\n', strip=True)

        # Clean up: collapse excessive blank lines
        import re
        text = re.sub(r'\n{3,}', '\n\n', text).strip()

        extracted = text[:3000]
        print(f"✅ Extracted {len(extracted)} chars from {url}")
        return extracted

    except Exception as e:
        print(f"❌ Error extracting job description: {str(e)}")
        return None


# ============================================================================
# CV ANALYSIS
# ============================================================================

def analyze_cv(cv_data: Dict) -> Dict:
    """
    Analyze CV and generate insights using Groq API.
    
    Args:
        cv_data: Dictionary containing CV information
    
    Returns:
        Dictionary with analysis results
    """
    try:
        print(f"\n🔍 [analyze_cv] Starting...")
        
        ai_config = get_ai_config()
        if not ai_config:
            print("⚠️  No AI config available")
            return {
                'analysis': {'strengths': ['Profile complete'], 'improvements': [], 'score': 60},
                'status': 'api_error'
            }
        model = ai_config["model"]
        api_key = ai_config["api_key"]

        personal_info = cv_data.get('personal_info', {})
        experiences = cv_data.get('experiences', [])
        educations = cv_data.get('educations', [])
        skills = cv_data.get('skills', [])
        
        # Extract skill names
        skill_names = []
        for skill in skills:
            if isinstance(skill, dict):
                skill_names.append(skill.get('name', ''))
            else:
                skill_names.append(str(skill))
        
        cv_summary = f"""
Name: {personal_info.get('name', 'Not provided')}
Skills: {', '.join(skill_names[:10])}
Experience: {len(experiences)} positions
Education: {len(educations)} degrees
"""
        
        prompt = f"""Analyze this CV and provide insights in JSON format with 'strengths' (list), 'improvements' (list), and 'score' (0-100):

CV Summary:
{cv_summary}

Respond with ONLY valid JSON, no other text:
{{"strengths": ["strength1", "strength2"], "improvements": ["improvement1", "improvement2"], "score": 75}}
"""
        
        print(f"📤 Sending to Groq API...")
        
        response = litellm.completion(
            model=model,
            api_key=api_key,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.7
        )
        
        if response.choices and len(response.choices) > 0:
            response_text = response.choices[0].message.content
            
            try:
                # Clean the response
                response_clean = response_text.replace('```json', '').replace('```', '').strip()
                analysis = json.loads(response_clean)
                print(f"✅ Analysis parsed successfully")
                return {'analysis': analysis, 'status': 'success'}
            except json.JSONDecodeError as e:
                print(f"⚠️  Failed to parse JSON: {str(e)}")
                return {
                    'analysis': {'strengths': ['Profile complete'], 'improvements': [], 'score': 60},
                    'status': 'parse_error'
                }
        
        print(f"❌ No content in response")
        return {
            'analysis': {'strengths': ['Profile complete'], 'improvements': [], 'score': 0},
            'status': 'api_error'
        }
        
    except Exception as e:
        print(f"❌ ERROR in analyze_cv: {str(e)}")
        return {
            'analysis': {'strengths': [], 'improvements': [], 'score': 0},
            'status': 'error',
            'error': str(e)
        }


# ============================================================================
# CV ENHANCEMENT
# ============================================================================

def groq_enhance_sections(cv_data: Dict, job_description: str) -> Dict:
    """
    Use Groq AI to regenerate the three ATS-critical CV sections:
      - experiences  (rewrite descriptions / responsibilities)
      - projects     (rewrite descriptions, add relevant tech)
      - skills       (keep format, add / highlight missing keywords)

    Uses the same client & model-resolution pattern as generate_cover_letter.
    Personal info, certifications, languages, interests are NOT touched.

    Returns:
        {
          "status": "success" | "error",
          "enhanced_cv": { ...full cv_data with rewritten sections... }
        }
    """
    try:
        print(f"\n✨ [groq_enhance_sections] Starting...")

        ai_config = get_ai_config()
        if not ai_config:
            print("⚠️  No AI config available")
            return {
                'analysis': {'strengths': ['Profile complete'], 'improvements': [], 'score': 60},
                'status': 'api_error'
            }
        model = ai_config["model"]
        api_key = ai_config["api_key"]

        experiences = cv_data.get("experiences", []) or []
        projects    = cv_data.get("projects",    []) or []
        skills      = cv_data.get("skills",      []) or []

        # ── Build a compact snapshot of current sections for the prompt ──────
        import json as _json

        exp_json  = _json.dumps(experiences[:5],  ensure_ascii=False)
        proj_json = _json.dumps(projects[:5],     ensure_ascii=False)
        skills_json = _json.dumps(skills,         ensure_ascii=False)

        # ── Detect language from BOTH CV AND job description ─────────────────
        # Sample text from the CV for language detection
        pi = cv_data.get('personalInfo') or cv_data.get('personal_info') or {}
        sample_text = " ".join([
            exp_json[:400],
            proj_json[:200],
            skills_json[:200],
            str(pi.get('summary') or cv_data.get('summary') or '')[:300],
        ]).lower()

        # Also check job description language
        jd_lower = job_description.lower()

        # Unambiguously German words (not common prepositions)
        german_indicators = [
            "erfahrung", "kenntnisse", "fähigkeiten", "verantwortlich",
            "tätigkeiten", "unternehmen", "entwicklung", "berufserfahrung",
            "wurde", "haben", "leitung", "planung", "umsetzung",
            "mitarbeiter", "aufgaben", "ausbildung", "studium", "abschluss",
            "deutsch", "englisch", "muttersprache", "bewerber",
            "softwareentwickler", "projektmanager", "werkzeuge", "bildung",
            # Additional JD-specific German terms
            "stellenangebot", "stelle", "bewerbung", "bewerber", "einstellung",
            "vollzeit", "teilzeit", "homeoffice", "gehalt", "vergütung",
            "anforderungen", "aufgaben", "wir suchen", "wir bieten",
            "idealerweise", "abgeschlossen", "kenntnisse", "mehrjährige",
            "teamfähig", "eigenverantwortlich", "analytisch", "kommunikativ",
        ]
        cv_german_score = sum(1 for w in german_indicators if w in sample_text)
        jd_german_score = sum(1 for w in german_indicators if w in jd_lower)

        # German if either CV or JD has enough German signal
        is_german = (cv_german_score >= 2) or (jd_german_score >= 2)
        language = "German" if is_german else "English"

        if language == "German":
            language_instruction = (
                "***SPRACHE — HÖCHSTE PRIORITÄT***\n"
                "Dieses Lebenslauf und/oder die Stellenausschreibung ist auf DEUTSCH.\n"
                "Du MUSST JEDEN TEXT in deiner Ausgabe auf Deutsch schreiben.\n"
                "Verwende KEIN Englisch — weder in Beschreibungen noch in Stichpunkten noch bei Fähigkeiten.\n"
                "Schreibe natürliches, professionelles Deutsch für den deutschen Arbeitsmarkt.\n"
                "Verwende typische deutsche Formulierungen: 'Entwicklung von...', 'Verantwortlich für...', 'Implementierung von...', 'Zusammenarbeit mit...', 'Optimierung von...'.\n"
                "***ENDE SPRACHANFORDERUNG***"
            )
        else:
            language_instruction = "Write all output text in English."

        prompt = f"""{language_instruction}

Du bist ein Experte für Lebenslauf-Optimierung und ATS-Systeme (Bewerber-Tracking-Systeme).{'' if language == 'German' else ' You are an expert CV writer specialising in ATS optimisation.'}

AUFGABE: Schreibe AUSSCHLIESSLICH die drei folgenden Abschnitte neu, damit der Lebenslauf besser zur Stellenausschreibung passt. Behalte dieselbe JSON-Struktur und dieselben Feldnamen bei.{'' if language == 'German' else chr(10) + 'TASK: Rewrite *only* the three sections below so the CV scores higher against the Job Description. Keep the same JSON structure/field names.'}

REGELN:
1. Erfahrungen (Experiences): Schreibe das Feld "description" (oder "responsibilities") für jeden Eintrag neu. Füge relevante Schlüsselwörter, messbare Leistungen und Aktionsverben ein. Ändere NICHT company, role, dates oder andere Felder.
2. Projekte (Projects): Schreibe das Feld "description" neu und betone relevante Technologien aus der Stellenausschreibung. Ändere NICHT name, link, dates oder andere Felder.
3. Fähigkeiten (Skills): Wenn skills ein Dict mit Kategorien ist, behalte die Struktur bei und füge fehlende Schlüsselwörter hinzu. Bei einer flachen Liste füge relevante Einträge hinzu. Maximum: +5 pro Kategorie oder +8 gesamt.
4. Gib NUR gültiges JSON zurück — keine Markdown-Umrahmungen, keinen zusätzlichen Text.
{"5. ALLE TEXTE MÜSSEN AUF DEUTSCH SEIN. Keine englischen Wörter in Beschreibungen oder Fähigkeiten." if language == 'German' else '5. ALL TEXT must be in English.'}

STELLENAUSCHREIBUNG / JOB DESCRIPTION:
{job_description[:1800]}

AKTUELLE ERFAHRUNGEN (JSON):
{exp_json}

AKTUELLE PROJEKTE (JSON):
{proj_json}

AKTUELLE FÄHIGKEITEN (JSON):
{skills_json}

Gib exakt dieses Format zurück:
{{
  "experiences": [ ...gleiche Einträge mit verbesserter description... ],
  "projects":    [ ...gleiche Einträge mit verbesserter description... ],
  "skills":      <gleiche Struktur wie Eingabe — Dict oder Liste>
}}"""


        print(f"📤 Sending enhance request to Groq (model: {model})...")

        response = litellm.completion(
            model=model,
            api_key=api_key,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=3000,
            temperature=0.7
        )

        if not (response.choices and len(response.choices) > 0):
            print("❌ No choices in Groq response")
            return {"enhanced_cv": cv_data, "status": "api_error"}

        raw = response.choices[0].message.content or ""
        # Strip optional markdown fences
        raw = raw.replace("```json", "").replace("```", "").strip()

        import re as _re

        def _safe_json_loads(text: str):
            """Try multiple strategies to parse potentially malformed LLM JSON."""
            # Strategy 1: direct parse
            try:
                return _json.loads(text)
            except _json.JSONDecodeError:
                pass

            # Strategy 2: extract outermost {...} block and parse
            m = _re.search(r'\{.*\}', text, _re.DOTALL)
            if m:
                try:
                    return _json.loads(m.group())
                except _json.JSONDecodeError:
                    pass

            # Strategy 3: fix common issues — unescaped control chars inside strings
            # Replace literal newlines/tabs inside JSON string values with \n / \t
            try:
                # Replace literal \n and \t inside string values (between quotes) with escaped versions
                # We do this by scanning the string character-by-character to be safe
                fixed = []
                in_str = False
                escape_next = False
                for ch in text:
                    if escape_next:
                        fixed.append(ch)
                        escape_next = False
                        continue
                    if ch == '\\':
                        fixed.append(ch)
                        escape_next = True
                        continue
                    if ch == '"':
                        in_str = not in_str
                        fixed.append(ch)
                        continue
                    if in_str:
                        if ch == '\n':
                            fixed.append('\\n')
                            continue
                        if ch == '\r':
                            fixed.append('\\r')
                            continue
                        if ch == '\t':
                            fixed.append('\\t')
                            continue
                    fixed.append(ch)
                cleaned = ''.join(fixed)
                # Remove trailing commas before ] or }
                cleaned = _re.sub(r',\s*([}\]])', r'\1', cleaned)
                m2 = _re.search(r'\{.*\}', cleaned, _re.DOTALL)
                if m2:
                    return _json.loads(m2.group())
            except Exception:
                pass

            return None  # All strategies failed

        enhanced_sections = _safe_json_loads(raw)
        if not enhanced_sections or not isinstance(enhanced_sections, dict):
            print(f"⚠️  Could not find/parse JSON object in Groq response — returning original CV")
            return {"enhanced_cv": cv_data, "status": "parse_error"}

        # ── Merge enhanced sections back into the full CV ────────────────────
        enhanced_cv = dict(cv_data)  # shallow copy keeps personal_info etc.

        if "experiences" in enhanced_sections and isinstance(enhanced_sections["experiences"], list):
            # Only overwrite entries that were in scope (up to 5)
            new_exps = list(experiences)
            for i, enhanced_exp in enumerate(enhanced_sections["experiences"]):
                if i < len(new_exps) and isinstance(enhanced_exp, dict):
                    merged = dict(new_exps[i])
                    # Update only the description/responsibilities fields
                    if "description" in enhanced_exp:
                        merged["description"] = enhanced_exp["description"]
                    if "responsibilities" in enhanced_exp:
                        merged["responsibilities"] = enhanced_exp["responsibilities"]
                    new_exps[i] = merged
            enhanced_cv["experiences"] = new_exps

        if "projects" in enhanced_sections and isinstance(enhanced_sections["projects"], list):
            new_projs = list(projects)
            for i, enhanced_proj in enumerate(enhanced_sections["projects"]):
                if i < len(new_projs) and isinstance(enhanced_proj, dict):
                    merged = dict(new_projs[i])
                    if "description" in enhanced_proj:
                        merged["description"] = enhanced_proj["description"]
                    new_projs[i] = merged
            enhanced_cv["projects"] = new_projs

        if "skills" in enhanced_sections:
            enhanced_cv["skills"] = enhanced_sections["skills"]

        print("✅ Sections enhanced successfully")
        return {"enhanced_cv": enhanced_cv, "status": "success"}

    except Exception as e:
        print(f"❌ ERROR in groq_enhance_sections: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"enhanced_cv": cv_data, "status": "error", "error": str(e)}


def enhance_cv_for_job(cv_data: Dict, job_description: str) -> Dict:
    """
    Create enhanced CV tailored to job description.
    
    Args:
        cv_data: Dictionary containing CV information
        job_description: Target job description
    
    Returns:
        Dictionary with enhanced CV data
    """
    try:
        print(f"\n✨ [enhance_cv_for_job] Starting...")
        
        ai_config = get_ai_config()
        if not ai_config:
            print("⚠️  No AI config available")
            return {
                'analysis': {'strengths': ['Profile complete'], 'improvements': [], 'score': 60},
                'status': 'api_error'
            }
        model = ai_config["model"]
        api_key = ai_config["api_key"]
        
        experiences = cv_data.get('experiences', [])
        
        # Create experience summary
        exp_summary = "\n".join([
            f"- {e.get('position', '')} at {e.get('company', '')} ({e.get('startDate', '')} to {e.get('endDate', '')})"
            for e in experiences[:3]
        ])
        
        prompt = f"""Based on this job description, optimize the CV experiences to better match the role.
Return JSON with 'enhanced_experiences' array where each item has 'description' field with improved text:

Job Description:
{job_description[:1000]}

Current Experiences:
{exp_summary}

For each experience, improve the description to highlight the most relevant skills and achievements.
Return ONLY JSON, no other text:
{{"enhanced_experiences": [{{"description": "improved description 1"}}, {{"description": "improved description 2"}}]}}
"""
        
        print(f"📤 Sending to Groq API...")
        
        response = litellm.completion(
            model=model,
            api_key=api_key,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
            temperature=0.7
        )
        
        if response.choices and len(response.choices) > 0:
            response_text = response.choices[0].message.content
            
            try:
                response_clean = response_text.replace('```json', '').replace('```', '').strip()
                enhanced = json.loads(response_clean)
                
                # Build enhanced CV data
                enhanced_cv = cv_data.copy()
                
                if 'enhanced_experiences' in enhanced and enhanced_cv.get('experiences'):
                    for i, exp_data in enumerate(enhanced['enhanced_experiences']):
                        if i < len(enhanced_cv['experiences']):
                            if 'description' in exp_data:
                                enhanced_cv['experiences'][i]['description'] = exp_data['description']
                
                print(f"✅ CV enhanced successfully")
                return {'enhanced_cv': enhanced_cv, 'status': 'success'}
            except json.JSONDecodeError as e:
                print(f"⚠️  Failed to parse JSON: {str(e)}")
                return {'enhanced_cv': cv_data, 'status': 'parse_error'}
        
        print(f"❌ No content in response")
        return {'enhanced_cv': cv_data, 'status': 'api_error'}
        
    except Exception as e:
        print(f"❌ ERROR in enhance_cv_for_job: {str(e)}")
        return {'enhanced_cv': cv_data, 'status': 'error', 'error': str(e)}


# ============================================================================
# AI JOB TAILORING — Section-by-section with before/after diffs
# ============================================================================

def tailor_cv_sections(cv_data: Dict, job_description: str, sections: List[str]) -> Dict:
    """
    Tailor selected CV sections to match a job description.
    Returns before/after diffs so the user can accept/reject per field.

    Args:
        cv_data:         Full CV data dict (frontend format)
        job_description: Job description text
        sections:        List of section keys to tailor, e.g. ['experiences', 'summary', 'skills']
                         Pass ['all'] to tailor all sections.

    Returns:
        {
          "status": "success" | "error",
          "diffs": {
            "experiences": [{ "index": 0, "field": "description", "before": "...", "after": "..." }, ...],
            "summary":     [{ "field": "summary", "before": "...", "after": "..." }],
            "skills":      [{ "field": "skills", "before": [...], "after": [...] }],
          }
        }
    """
    try:
        print(f"\n🎯 [tailor_cv_sections] sections={sections}")

        ai_config = get_ai_config()
        if not ai_config:
            print("⚠️  No AI config available")
            return {"tailored_cv": cv_data, "diffs": {}, "status": "api_error", "error": "No working model"}
            
        model = ai_config["model"]
        api_key = ai_config["api_key"]

        import json as _json

        ALL_SECTIONS = ['experiences', 'summary', 'skills']
        target = ALL_SECTIONS if ('all' in sections or not sections) else [s for s in sections if s in ALL_SECTIONS]

        diffs = {}

        experiences = cv_data.get('experiences', []) or []
        skills = cv_data.get('skills', []) or []
        summary = (cv_data.get('personal_info') or {}).get('summary', '') or cv_data.get('profile_summary', '') or ''

        # ── Build compact snapshot for prompt ────────────────────────────────
        exp_json = _json.dumps(
            [{'index': i, 'role': e.get('role') or e.get('position', ''),
              'company': e.get('company', ''), 'description': e.get('description', '')}
             for i, e in enumerate(experiences[:5])],
            ensure_ascii=False
        )
        skill_names = [s if isinstance(s, str) else s.get('name', '') for s in skills]
        skills_json = _json.dumps(skill_names, ensure_ascii=False)

        # ── Single consolidated prompt ────────────────────────────────────────
        sections_prompt_parts = []
        if 'experiences' in target:
            sections_prompt_parts.append(f'EXPERIENCES (JSON):\n{exp_json}')
        if 'summary' in target:
            sections_prompt_parts.append(f'PROFILE SUMMARY:\n{summary}')
        if 'skills' in target:
            sections_prompt_parts.append(f'SKILLS (JSON array of names):\n{skills_json}')

        default_sys_msg = """***LANGUAGE PRIORITY***
Analyze the language of the TARGET JOB REQUIREMENTS.
You MUST write ALL revisions in the EXACT SAME LANGUAGE as the Job Description.
Do NOT default to English if the job description is in another language.
***END***

You are a professional CV editor. Rewrite ONLY the selected sections to better match the job description. Keep all facts truthful — do NOT invent experience or skills. Output ONLY valid JSON matching the schema described. No markdown fences."""
        system_msg = get_config('cv_tailor_prompt', default_sys_msg)

        schema_desc = "{"
        if 'experiences' in target:
            schema_desc += '"experiences": [{"index": <int>, "description": "<improved text>"}],'
        if 'summary' in target:
            schema_desc += '"summary": "<improved summary text>",'
        if 'skills' in target:
            schema_desc += '"skills": ["skill1", "skill2", ...],'
        schema_desc = schema_desc.rstrip(',') + "}"

        user_msg = (
            f"Job Description:\n{job_description[:1800]}\n\n"
            + "\n\n".join(sections_prompt_parts)
            + f"\n\nReturn ONLY this JSON schema (fill in the improved values):\n{schema_desc}"
        )

        print(f"📤 Sending tailor request to Groq (model={model})...")
        response = litellm.completion(
            model=model,
            api_key=api_key,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg}
            ],
            max_tokens=3000,
            temperature=0.7
        )

        if not (response.choices and response.choices[0].message.content):
            return {"status": "api_error", "diffs": {}, "error": "Empty response from AI"}

        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()

        # Parse JSON
        result = None
        try:
            result = _json.loads(raw)
        except _json.JSONDecodeError:
            m = __import__('re').search(r'\{.*\}', raw, __import__('re').DOTALL)
            if m:
                try:
                    result = _json.loads(m.group())
                except Exception:
                    pass

        if not result or not isinstance(result, dict):
            return {"status": "parse_error", "diffs": {}, "error": "Could not parse AI response"}

        # ── Build diffs ──────────────────────────────────────────────────────
        if 'experiences' in target and 'experiences' in result:
            exp_diffs = []
            for item in result['experiences']:
                idx = item.get('index', 0)
                if idx < len(experiences):
                    before = experiences[idx].get('description', '')
                    after  = item.get('description', before)
                    if after and after != before:
                        exp_diffs.append({
                            'index': idx,
                            'field': 'description',
                            'label': f"{experiences[idx].get('role') or experiences[idx].get('position', '')} @ {experiences[idx].get('company', '')}",
                            'before': before,
                            'after': after,
                        })
            diffs['experiences'] = exp_diffs

        if 'summary' in target and 'summary' in result:
            before_s = summary
            after_s = result.get('summary', summary)
            if after_s and after_s != before_s:
                diffs['summary'] = [{'field': 'summary', 'label': 'Profile Summary', 'before': before_s, 'after': after_s}]

        if 'skills' in target and 'skills' in result:
            new_skills = result.get('skills', skill_names)
            if isinstance(new_skills, list) and new_skills != skill_names:
                diffs['skills'] = [{
                    'field': 'skills',
                    'label': 'Skills',
                    'before': skill_names,
                    'after': new_skills,
                }]

        print(f"✅ Tailor complete. Diffs: {list(diffs.keys())}")
        return {"status": "success", "diffs": diffs}

    except Exception as e:
        print(f"❌ ERROR in tailor_cv_sections: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "diffs": {}, "error": str(e)}


# ============================================================================
# CV LANGUAGE TRANSLATION — translate all text fields into target language
# ============================================================================

_LANG_FULL = {
    'Deutsch':  'German',
    'English':  'English',
    'French':   'French',
    'Spanish':  'Spanish',
    'Italian':  'Italian',
    'Portuguese': 'Portuguese',
}


def translate_cv(cv_data: Dict, target_language: str) -> Dict:
    """
    Translate all text content of a CV into target_language.
    Preserves names, dates, URLs, emails, phone numbers, and structure.

    Args:
        cv_data:         Full CV data dict
        target_language: e.g. 'Deutsch', 'English', 'French', 'Spanish'

    Returns:
        { "status": "success"|"error", "translated_cv": <full translated cv_data> }
    """
    import json as _json
    import copy

    try:
        print(f"\n🌐 [translate_cv] target_language={target_language}")

        ai_config = get_ai_config()
        if not ai_config:
            print("⚠️  No AI config available")
            return {
                'analysis': {'strengths': ['Profile complete'], 'improvements': [], 'score': 60},
                'status': 'api_error'
            }
        model = ai_config["model"]
        api_key = ai_config["api_key"]

        lang_full = _LANG_FULL.get(target_language, target_language)

        # Build the fields to translate as a compact JSON payload
        pi = cv_data.get('personal_info') or cv_data.get('personalInfo') or {}
        experiences = cv_data.get('experiences') or cv_data.get('experience') or []
        education   = cv_data.get('educations') or cv_data.get('education') or []
        skills      = cv_data.get('skills') or []
        certs       = cv_data.get('certifications') or []
        custom_secs = cv_data.get('custom_sections') or []
        summary     = pi.get('summary') or cv_data.get('profile_summary') or cv_data.get('summary') or ''
        job_title   = pi.get('title') or pi.get('jobTitle') or cv_data.get('title') or ''

        payload = {
            "summary": summary,
            "job_title": job_title,
            "experiences": [
                {"index": i, "role": e.get('role',''), "company": e.get('company',''),
                 "description": e.get('description','')}
                for i, e in enumerate(experiences)
            ],
            "education": [
                {"index": i, "degree": e.get('degree',''), "field": e.get('field','')}
                for i, e in enumerate(education)
            ],
            "skills": [
                s if isinstance(s, str) else s.get('name','') for s in skills
            ],
            "certifications": [
                {"index": i, "name": c.get('name',''), "issuer": c.get('issuer','')}
                for i, c in enumerate(certs)
            ],
            "custom_sections": [
                {"index": i, "title": cs.get('title',''),
                 "items": cs.get('items',[]), "content": cs.get('content','')}
                for i, cs in enumerate(custom_secs)
            ],
        }

        system_msg = (
            f"You are a professional CV translator. "
            f"Translate ALL text fields into {lang_full}. "
            f"Rules:\n"
            f"- Preserve proper nouns: person names, company names, city/country names, institution names.\n"
            f"- Preserve all dates, URLs, emails, phone numbers exactly as-is.\n"
            f"- Do NOT add or remove any information.\n"
            f"- Professional job titles should use standard {lang_full} equivalents (e.g. 'Software Engineer' → 'Softwareentwickler' in German).\n"
            f"- Return ONLY valid JSON with the exact same keys. No markdown, no extra text."
        )

        user_msg = (
            f"Translate this CV data into {lang_full}. "
            f"Return the same JSON structure with translated text values:\n\n"
            f"{_json.dumps(payload, ensure_ascii=False)}"
        )

        print(f"📤 Sending translate request to Groq (model={model})...")
        response = litellm.completion(
            model=model,
            api_key=api_key,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.7
        )

        if not (response.choices and response.choices[0].message.content):
            return {"status": "error", "error": "Empty response", "translated_cv": cv_data}

        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()

        try:
            translated = _json.loads(raw)
        except _json.JSONDecodeError:
            m = __import__('re').search(r'\{.*\}', raw, __import__('re').DOTALL)
            if m:
                try:
                    translated = _json.loads(m.group())
                except Exception:
                    return {"status": "parse_error", "error": "Could not parse response", "translated_cv": cv_data}
            else:
                return {"status": "parse_error", "error": "No JSON in response", "translated_cv": cv_data}

        # Merge translated fields back into a deep copy of cv_data
        result = copy.deepcopy(cv_data)

        # personal_info
        pi_out = result.get('personal_info') or result.get('personalInfo') or {}
        if translated.get('summary'):
            pi_out['summary'] = translated['summary']
            result['profile_summary'] = translated['summary']
            result['summary'] = translated['summary']
        if translated.get('job_title'):
            pi_out['title'] = translated['job_title']
            pi_out['jobTitle'] = translated['job_title']
            result['title'] = translated['job_title']
        if 'personal_info' in result:
            result['personal_info'] = pi_out
        if 'personalInfo' in result:
            result['personalInfo'] = pi_out

        # experiences
        t_exps = {e['index']: e for e in (translated.get('experiences') or [])}
        exps = list(result.get('experiences') or result.get('experience') or [])
        for i, exp in enumerate(exps):
            if i in t_exps:
                te = t_exps[i]
                if te.get('role'):      exp['role'] = te['role']
                if te.get('description'): exp['description'] = te['description']
        if 'experiences' in result:
            result['experiences'] = exps
        if 'experience' in result:
            result['experience'] = exps

        # education
        t_edu = {e['index']: e for e in (translated.get('education') or [])}
        edus = list(result.get('educations') or result.get('education') or [])
        for i, edu in enumerate(edus):
            if i in t_edu:
                te = t_edu[i]
                if te.get('degree'): edu['degree'] = te['degree']
                if te.get('field'):  edu['field']  = te['field']
        if 'educations' in result:
            result['educations'] = edus
        if 'education' in result:
            result['education'] = edus

        # skills — translate names only, preserve category
        t_skills = translated.get('skills') or []
        orig_skills = result.get('skills') or []
        if t_skills and len(t_skills) == len(orig_skills):
            for i, sk in enumerate(orig_skills):
                if isinstance(sk, dict):
                    sk['name'] = t_skills[i]
                # string skills stay as-is (rare)
        elif t_skills:
            # Best-effort: rebuild list preserving category if possible
            new_skills = []
            for i, name in enumerate(t_skills):
                if i < len(orig_skills) and isinstance(orig_skills[i], dict):
                    new_skills.append({**orig_skills[i], 'name': name})
                else:
                    new_skills.append({'name': name, 'level': '', 'category': ''})
            result['skills'] = new_skills

        # certifications
        t_certs = {c['index']: c for c in (translated.get('certifications') or [])}
        orig_certs = list(result.get('certifications') or [])
        for i, c in enumerate(orig_certs):
            if i in t_certs:
                tc = t_certs[i]
                if tc.get('name'):   c['name']   = tc['name']
                if tc.get('issuer'): c['issuer']  = tc['issuer']
        result['certifications'] = orig_certs

        # custom_sections
        t_cs = {cs['index']: cs for cs in (translated.get('custom_sections') or [])}
        orig_cs = list(result.get('custom_sections') or [])
        for i, cs in enumerate(orig_cs):
            if i in t_cs:
                tc = t_cs[i]
                if tc.get('title'):   cs['title']   = tc['title']
                if tc.get('items'):   cs['items']   = tc['items']
                if tc.get('content'): cs['content'] = tc['content']
        result['custom_sections'] = orig_cs

        print(f"✅ Translation complete → {lang_full}")
        return {"status": "success", "translated_cv": result}

    except Exception as e:
        print(f"❌ ERROR in translate_cv: {str(e)}")
        import traceback; traceback.print_exc()
        return {"status": "error", "error": str(e), "translated_cv": cv_data}
import requests
from bs4 import BeautifulSoup

def extract_jd_from_url(url: str) -> str:
    """
    Scrapes the URL, extracts raw text, and asks Groq to extract the job description perfectly.
    """
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        # Remove scripts and styles
        for script in soup(["script", "style", "noscript", "header", "footer", "nav"]):
            script.decompose()
            
        raw_text = soup.get_text(separator=' ', strip=True)
        # Limit text length to avoid token limits
        raw_text = raw_text[:15000]
        
        prompt = f"""
        You are an expert recruiter. I have scraped text from a webpage that contains a job posting.
        Please extract ONLY the job description (Role, Responsibilities, Requirements, Qualifications, Tech Stack, Company Info if relevant).
        Do not include website navigation menus, generic footer text, or other noise.
        Format it as clean, readable text. Do not add conversational intro/outro.
        
        Scraped Webpage Text:
        {raw_text}
        """
        
        response = call_groq_api([
            {"role": "system", "content": "You are a helpful assistant that cleanly extracts job descriptions from messy webpage text."},
            {"role": "user", "content": prompt}
        ])
        
        if not response:
            return "Failed to extract job description using AI."
            
        return response.strip()
        
    except Exception as e:
        return f"Error scraping URL: {str(e)}"
