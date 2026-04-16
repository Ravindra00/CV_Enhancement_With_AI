"""
Language detection utility for identifying job description language.
Supports: English, German, French, Spanish, Italian, Portuguese
"""

def detect_language(text: str) -> str:
    """
    Detect language from text using keyword matching.
    More aggressive detection for German.
    
    Args:
        text: The text to analyze (typically job description)
        
    Returns:
        Language code: 'de', 'fr', 'es', 'it', 'pt', 'en' (default)
    """
    if not text:
        return 'en'
    
    text_lower = text.lower()
    text_words = set(text_lower.split())
    
    # Language-specific keyword patterns with more comprehensive words
    language_keywords = {
        'de': {
            'words': {
                # Common German articles and prepositions
                'und', 'der', 'die', 'das', 'ein', 'eine', 'ist', 'zu', 'mit', 'für', 'von',
                'in', 'auf', 'den', 'des', 'dem', 'sich', 'auch', 'nicht', 'nur', 'über',
                'bei', 'durch', 'nach', 'vor', 'während', 'zwischen', 'gegen', 'unter',
                # German job-related keywords
                'jahr', 'jahre', 'jahren', 'erfahrung', 'anforderung', 'anforderungen',
                'position', 'team', 'entwicklung', 'fähigkeit', 'fähigkeiten', 'kenntnisse',
                'deutsch', 'englisch', 'sowie', 'weltweit', 'unternehmen', 'mitarbeiter',
                'gehalt', 'vertrag', 'bewerbung', 'aufgaben', 'verantwortung', 'zusammenarbeit',
                'kundenorientiert', 'zuverlässig', 'flexibilität', 'eigenverantwortung',
                'motivation', 'engagement', 'qualifikation', 'qualifikationen', 'bewerber',
                'stellenangebot', 'arbeitgeber', 'karriere', 'berufserfahrung', 'praktikum',
                # More German verbs and nouns
                'wir', 'bieten', 'suchen', 'benötigen', 'verfügen', 'können', 'sollen',
                'wird', 'haben', 'möchten', 'freuen', 'qualifiziert', 'erwartet', 'erfordert',
                'gehört', 'erhalten', 'teil', 'großen', 'kleinen', 'technologie', 'software',
                'führen', 'gestalten', 'unterstützen', 'verantworten', 'koordinieren',
            },
            'phrases': [
                'anforderungen:', 'aufgaben:', 'anforderung an sie:', 'wir bieten:',
                'ihre aufgaben:', 'ihr profil:', 'haben sie:', 'suchen sie:',
                'anforderung an den:', 'ihre qualifikation:', 'das erwartet',
                'die stelle:', 'jobtitel:', 'aufgabenbereiche:', 'qualifikationen:',
                'qualifikationen erforderlich:', 'was wir bieten:', 'deine aufgaben:',
                'dein profil:', 'von dir erwartet:', 'gehalt:', 'vertragslaufzeit:',
                'arbeitsort:', 'arbeitgeber:', 'tätigkeitsgebiet:', 'tätigkeit:',
                'ihre kompetenz:', 'ihre erfahrung:', 'ihre kenntnisse:', 'idealerweise',
                'ungefähr', 'berufserfahrung', 'berufliche erfahrung', 'abgeschlossene ausbildung'
            ]
        },
        'en': {
            'words': {
                'and', 'the', 'a', 'an', 'is', 'to', 'with', 'for', 'of', 'in', 'on',
                'we', 'you', 'your', 'our', 'have', 'are', 'be', 'can', 'will', 'must',
                'experience', 'years', 'knowledge', 'skills', 'requirements', 'position',
                'team', 'development', 'ability', 'offer', 'responsibility', 'profile',
                'looking', 'seeking', 'candidates', 'company', 'employee', 'job', 'role',
                'english', 'fluent', 'proficient', 'strong', 'excellent', 'proven',
                'required', 'preferred', 'salary', 'benefits', 'opportunity', 'career',
                'about', 'business', 'quality', 'support', 'manage', 'communication',
                'technical', 'problem-solving', 'analytical', 'leadership', 'collaboration',
                'work', 'project', 'application', 'qualification', 'background'
            },
            'phrases': [
                'requirements:', 'responsibilities:', 'we offer:', 'you are:',
                'job description:', 'about the role:', 'about us:', 'our team:',
                'required qualifications:', 'preferred qualifications:', 'benefits:',
                'what we are looking:', 'apply now:', 'job posting:', 'position available:'
            ]
        },
        'fr': {
            'words': {
                'et', 'de', 'le', 'la', 'les', 'un', 'une', 'est', 'à', 'pour',
                'que', 'pas', 'avoir', 'dans', 'au', 'qui', 'par', 'nous', 'ce', 'du',
                'expérience', 'compétences', 'poste', 'équipe', 'développement', 'candidat',
                'offre', 'responsabilités', 'profil', 'recherchons', 'votre', 'êtes',
                'vous', 'être', 'faire', 'chez', 'plus', 'très', 'bien', 'nouveau',
                'notre', 'ses', 'tous', 'cette', 'celui', 'entre', 'leur'
            },
            'phrases': [
                'responsabilités:', 'compétences requises:', 'profil recherché:',
                'nous offrons:', 'vous êtes:', 'ce que vous apporterez:', 'candidature:',
            ]
        },
        'es': {
            'words': {
                'y', 'de', 'el', 'la', 'los', 'las', 'un', 'una', 'es', 'a', 'para',
                'que', 'no', 'ser', 'del', 'con', 'por', 'años', 'más', 'su', 'este',
                'experiencia', 'competencias', 'puesto', 'equipo', 'desarrollo', 'candidato',
                'responsabilidades', 'perfil', 'buscamos', 'ofrecemos', 'habilidades'
            },
            'phrases': [
                'responsabilidades:', 'requisitos:', 'perfil buscado:', 'ofrecemos:',
                'eres:', 'habilidades:', 'experiencia:', 'requisitos técnicos:'
            ]
        },
        'it': {
            'words': {
                'e', 'di', 'il', 'la', 'i', 'gli', 'un', 'una', 'è', 'a', 'per',
                'che', 'non', 'essere', 'da', 'con', 'per', 'sul', 'nella', 'degli',
                'esperienza', 'competenze', 'posizione', 'team', 'sviluppo', 'candidato',
                'responsabilità', 'profilo', 'cerchiamo', 'offriamo', 'abilità'
            },
            'phrases': [
                'responsabilità:', 'requisiti:', 'profilo ricercato:', 'offriamo:',
                'sei:', 'competenze:', 'esperienza:', 'requisiti tecnici:'
            ]
        },
        'pt': {
            'words': {
                'e', 'de', 'o', 'a', 'os', 'as', 'um', 'uma', 'é', 'para',
                'que', 'não', 'com', 'da', 'do', 'dos', 'das', 'se', 'à', 'por',
                'experiência', 'competências', 'posição', 'equipa', 'desenvolvimento', 'candidato',
                'responsabilidades', 'perfil', 'procuramos', 'oferecemos', 'habilidades'
            },
            'phrases': [
                'responsabilidades:', 'requisitos:', 'perfil procurado:', 'oferecemos:',
                'você é:', 'competências:', 'experiência:', 'requisitos técnicos:'
            ]
        }
    }
    
    scores = {}
    
    for lang_code, patterns in language_keywords.items():
        lang_score = 0
        
        # Score based on word matches
        word_matches = len(text_words & patterns['words'])
        lang_score += word_matches * 2  # Weight word matches higher
        
        # Score based on phrase matches (strong signal)
        for phrase in patterns['phrases']:
            if phrase in text_lower:
                lang_score += 10  # Stronger weight for phrases
        
        scores[lang_code] = lang_score
    
    # Debug: print scores for analysis
    import sys
    print(f"[LANGUAGE DETECTION] Text length: {len(text)}", file=sys.stderr)
    print(f"[LANGUAGE DETECTION] Scores: {scores}", file=sys.stderr)
    
    # Return language with highest score
    max_score = max(scores.values())
    detected_lang = max(scores, key=scores.get)
    print(f"[LANGUAGE DETECTION] Detected: {detected_lang} (score: {max_score})", file=sys.stderr)
    
    # More lenient threshold - if any language has significant score
    if max_score > 0:
        return detected_lang
    
    return 'en'  # Default to English


def get_language_name(lang_code: str) -> str:
    """Get human-readable language name from code."""
    language_names = {
        'en': 'English',
        'de': 'Deutsch',
        'fr': 'Français',
        'es': 'Español',
        'it': 'Italiano',
        'pt': 'Português'
    }
    return language_names.get(lang_code, 'English')
