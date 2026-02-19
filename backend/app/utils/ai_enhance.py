"""
AI Enhancement Utility — CV Enhancer
Uses Groq (free tier, Llama-3.1-8B-Instant) for intelligent CV suggestions.
Falls back to rule-based keyword analysis if no API key is set.
"""

import os
import re
import json
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ── Keyword extraction ─────────────────────────────────────────────────────────
STOP_WORDS = {
    'the','and','for','are','but','not','you','all','any','can','her','was','our',
    'one','had','his','him','has','how','its','man','new','now','old','see','two',
    'way','who','boy','did','its','let','put','say','she','too','use','will','with',
    'that','this','have','from','they','know','want','been','good','much','some',
    'time','very','when','come','here','just','like','long','make','many','over',
    'such','take','than','then','them','well','were','what','your','about','could',
    'would','there','their','these','other','after','first','those','which','should',
    'where','being','every','under','never','before','through','between','including',
    'must','strong','work','team','role','company','position','experience','skills',
    'able','within','across','ensure','using','basis','looking','join','opportunity',
    'please','apply','send','cv','resume','also','both','into','only','each','than',
    'degree','bachelor','master','phd','years','year','minimum','required','preferred',
    'plus','bonus','benefits','salary','equal','employer','opportunity','hiring',
}

TECH_TERMS = {
    'sql','api','rest','aws','gcp','azure','ci','cd','devops','docker','kubernetes',
    'git','linux','python','java','javascript','typescript','react','vue','angular',
    'node','fastapi','django','flask','spring','microservices','nosql','mongodb',
    'postgresql','redis','kafka','rabbitmq','terraform','ansible','nginx','graphql',
}

def extract_keywords(text: str) -> List[str]:
    """Extract meaningful keywords from text, favouring tech terms."""
    text_lower = text.lower()
    # Keep tech terms that appear literally
    found_tech = [t for t in TECH_TERMS if re.search(r'\b' + t + r'\b', text_lower)]

    # General words: 2–25 chars, not stop words
    general = [
        w for w in re.findall(r'\b[a-zA-Z][a-zA-Z0-9#+./\-]{1,24}\b', text)
        if w.lower() not in STOP_WORDS and len(w) > 2 and not w.isdigit()
    ]
    seen = set(found_tech)
    unique = found_tech[:]
    for w in general:
        wl = w.lower()
        if wl not in seen:
            seen.add(wl)
            unique.append(w)
    return unique


def compute_match_score(cv_keywords: List[str], jd_keywords: List[str]) -> Tuple[int, List[str], List[str]]:
    """Return (score 0-100, matched_list, missing_list)."""
    if not jd_keywords:
        return 0, [], []
    cv_set = {k.lower() for k in cv_keywords}
    matched = [k for k in jd_keywords if k.lower() in cv_set]
    missing = [k for k in jd_keywords if k.lower() not in cv_set]
    score = min(100, int((len(matched) / max(len(jd_keywords), 1)) * 100))
    return score, matched, missing


# ── Rule-based suggestions (always available as baseline) ─────────────────────
def rule_based_suggestions(cv_data: Dict[str, Any], job_desc: str, missing: List[str], score: int) -> List[Dict]:
    suggestions = []
    pi = cv_data.get('personalInfo', {}) or {}
    exps = cv_data.get('experience', []) or []

    # missing skills
    if missing[:8]:
        suggestions.append({
            "title": "Address Skills Gap",
            "description": f"{len(missing)} keywords from the job posting are missing from your CV.",
            "suggestion": f"Naturally incorporate these terms into your experience descriptions: {', '.join(missing[:8])}",
            "section": "skills"
        })

    # no summary
    if not cv_data.get('summary'):
        suggestions.append({
            "title": "Add a Profile Summary",
            "description": "Recruiters spend ~7 seconds on a CV. A strong summary dramatically improves callback rates.",
            "suggestion": "Write 2-3 sentences highlighting your years of experience, key technical strengths, and what you can deliver for this specific role.",
            "section": "summary"
        })

    # experience bullets missing
    if exps and not any(e.get('description') for e in exps):
        suggestions.append({
            "title": "Add Achievement Bullet Points",
            "description": "Your experience entries have no descriptions — this is one of the biggest CV weaknesses.",
            "suggestion": "Add 3-5 bullets per role using the STAR format (Situation → Task → Action → Result). Start with action verbs: Led, Built, Reduced, Improved, Automated. Always quantify: '40% faster builds', 'saved €50k/year'.",
            "section": "experience"
        })

    # missing photo
    if not pi.get('photo'):
        suggestions.append({
            "title": "Add a Professional Photo",
            "description": "In European markets (Germany, Austria, Switzerland), a professional photo is standard and improves trust.",
            "suggestion": "Upload a high-quality headshot using the profile photo upload button at the top of the Personal Info section.",
            "section": "personalInfo"
        })

    # low score
    if score < 50:
        suggestions.append({
            "title": "Boost Your ATS Keyword Score",
            "description": f"Your CV currently scores {score}% keyword match against this job posting.",
            "suggestion": f"ATS systems rank CVs by keyword density. Prioritise adding these terms: {', '.join(missing[:6])}. Use exact phrasing where possible.",
            "section": "general"
        })

    # cert check
    if not cv_data.get('certifications'):
        cert_words = ['certified','certification','certificate','aws','azure','pmp','cissp','cka','ckad']
        if any(w in job_desc.lower() for w in cert_words):
            suggestions.append({
                "title": "Add Relevant Certifications",
                "description": "This role mentions certifications or cloud credentials.",
                "suggestion": "Add any relevant professional certifications. If you lack them, consider fast training: AWS Cloud Practitioner, Azure Fundamentals or Kubernetes CKA are very valued.",
                "section": "certifications"
            })

    return suggestions


# ── Groq AI suggestions ────────────────────────────────────────────────────────
def groq_suggestions(cv_data: Dict[str, Any], job_desc: str, missing: List[str], score: int) -> Optional[List[Dict]]:
    """
    Uses Groq's free API with Llama-3.1-8B-Instant to generate contextual,
    specific CV improvement suggestions tailored to the job description.
    Returns None if Groq is unavailable or not configured.
    """
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        logger.info("GROQ_API_KEY not set — skipping AI suggestions")
        return None

    try:
        from groq import Groq
        client = Groq(api_key=api_key)

        pi = cv_data.get('personalInfo', {}) or {}
        exps = cv_data.get('experience', []) or []
        skills = cv_data.get('skills', []) or []

        # Build a concise CV summary to send to the model
        cv_summary = f"""Name: {pi.get('name', 'Candidate')}
Current role: {pi.get('jobTitle', 'N/A')}
Skills: {', '.join(skills[:20]) if skills else 'None listed'}
Experience: {len(exps)} positions
Latest role: {exps[0].get('role', 'N/A')} at {exps[0].get('company', 'N/A')} ({exps[0].get('startDate', '')}–{exps[0].get('endDate', 'Present')}) if exps else 'None'
Summary exists: {'Yes' if cv_data.get('summary') else 'No'}
Keyword match score: {score}/100
Missing keywords: {', '.join(missing[:10])}"""

        prompt = f"""You are an expert CV coach helping a candidate tailor their CV for a specific job.

CANDIDATE CV SUMMARY:
{cv_summary}

JOB DESCRIPTION (excerpt):
{job_desc[:1500]}

Generate 4-6 specific, actionable CV improvement suggestions. For each:
- Be very specific to THIS job and THIS candidate
- Reference actual missing keywords or section gaps
- Provide concrete rewording examples where useful
- Consider German/European job market norms if CV mentions European location

Return ONLY a JSON array with this exact structure (no extra text):
[
  {{
    "title": "Short action title (max 8 words)",
    "description": "Why this matters for this specific job (1-2 sentences)",
    "suggestion": "Concrete actionable advice (2-4 sentences with examples)",
    "section": "one of: summary|experience|skills|education|certifications|languages|projects|general"
  }}
]"""

        chat = client.chat.completions.create(
            model="llama-3.1-8b-instant",   # Free tier model on Groq
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1500,
            timeout=25,
        )

        raw = chat.choices[0].message.content.strip()
        # Extract JSON array robustly
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if not match:
            logger.warning("Groq response did not contain JSON array")
            return None

        suggestions = json.loads(match.group())
        # Validate structure
        valid = []
        VALID_SECTIONS = {'summary','experience','skills','education','certifications','languages','projects','general','personalInfo'}
        for s in suggestions:
            if isinstance(s, dict) and all(k in s for k in ['title','description','suggestion']):
                s['section'] = s.get('section', 'general') if s.get('section') in VALID_SECTIONS else 'general'
                valid.append(s)
        logger.info(f"Groq returned {len(valid)} suggestions")
        return valid if valid else None

    except Exception as e:
        logger.error(f"Groq AI suggestion failed: {e}")
        return None


# ── Main entry point ───────────────────────────────────────────────────────────
def generate_suggestions(cv_data: Dict[str, Any], job_description: str) -> Dict[str, Any]:
    """
    Main function called by the /customize endpoint.
    Returns: { score, matched_keywords, missing_keywords, suggestions, ai_powered }
    """
    # 1. Extract keywords from both sides
    cv_text = json.dumps(cv_data)
    cv_keywords = extract_keywords(cv_text)
    jd_keywords = extract_keywords(job_description)

    # 2. Compute match
    score, matched, missing = compute_match_score(cv_keywords, jd_keywords)

    # 3. Try AI-powered suggestions first, fall back to rule-based
    ai_suggestions = groq_suggestions(cv_data, job_description, missing, score)
    ai_powered = ai_suggestions is not None

    # Merge: AI suggestions first, then add any rule-based that don't duplicate
    base_suggestions = rule_based_suggestions(cv_data, job_description, missing, score)
    if ai_powered:
        # Only add rule-based if AI didn't cover the same section
        ai_sections = {s.get('section') for s in ai_suggestions}
        extras = [s for s in base_suggestions if s.get('section') not in ai_sections]
        final_suggestions = ai_suggestions + extras[:2]
    else:
        final_suggestions = base_suggestions

    return {
        "score": score,
        "matched_keywords": matched,
        "missing_keywords": missing[:15],
        "suggestions": final_suggestions,
        "ai_powered": ai_powered,
    }
