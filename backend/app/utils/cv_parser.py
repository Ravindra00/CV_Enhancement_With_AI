"""
CV Parser — extracts all fields from German/English CVs.

Fixes in this version:
- DATE_RANGE_RE: matches YYYY-MM, full German month names (Oktober/Maerz/etc.)
- Education Layout A+B: degree on same or previous line; thesis/description bullets saved
- _split_degree_institution: whitespace-gap detector + degree prefix check + country filter
- _parse_languages EDV: strips "Category: " label before colon
- _parse_certifications: joins continuation lines starting with '('
- _split_into_sections: custom section items properly populated; ALL-CAPS strictly enforced
"""

import os
import re
from typing import Dict, List, Any, Optional

# ── Section keywords ───────────────────────────────────────────────────────────

SECTION_KEYWORDS = {
    'summary': [
        'berufliches profil', 'berufsprofil', 'profil', 'profile', 'summary',
        'about me', 'über mich', 'kurzprofil', 'zusammenfassung',
        'executive summary', 'career objective', 'objective',
    ],
    'experience': [
        'berufserfahrung', 'beruflicher werdegang', 'arbeitserfahrung',
        'professional experience', 'work experience', 'employment history',
        'experience', 'career history', 'positions held',
    ],
    'education': [
        'akademische ausbildung', 'ausbildung', 'bildung', 'studium',
        'akademischer werdegang', 'education', 'academic background',
        'qualifications', 'formation',
    ],
    'skills': [
        'kenntnisse', 'fähigkeiten', 'kompetenzen', 'schlüsselkompetenzen',
        'skills', 'technical skills', 'core competencies', 'expertise',
        'kenntnisse und kompetenzen', 'hard skills',
    ],
    'soft_skills': [
        'soft skills', 'soziale kompetenzen', 'persönliche kompetenzen',
        'schlüsselkompetenzen', 'soziale fähigkeiten', 'personal skills',
        'interpersonal skills', 'soft-skills',
    ],
    'certifications': [
        'weiterbildung und zertifikate', 'zertifikate', 'zertifizierungen',
        'weiterbildung', 'certifications', 'certificates', 'credentials',
        'further education', 'further training',
    ],
    'languages': [
        'sprachkenntnisse', 'sprachen', 'fremdsprachen',
        'languages', 'language skills',
    ],
    'projects': ['projekte', 'projects', 'portfolio'],
    'interests': [
        'interessen', 'hobbys', 'freizeit', 'interests', 'hobbies',
        'hobbies and interests', 'freizeitaktivitäten',
    ],
    'volunteering': [
        'ehrenamt', 'ehrenamtliche tätigkeit', 'volunteering', 'volunteer work',
        'social engagement', 'gesellschaftliches engagement', 'freiwilligenarbeit',
    ],
    'awards': [
        'auszeichnungen', 'preise', 'ehrungen', 'awards', 'honors', 'achievements',
        'leistungen',
    ],
    'publications': [
        'publikationen', 'veröffentlichungen', 'publications', 'papers', 'articles',
    ],
    'conferences': [
        'konferenzen', 'tagungen', 'kongresse', 'conferences', 'events',
        'events and conferences', 'veranstaltungen',
    ],
    'references': ['referenzen', 'references'],
}

CUSTOM_HINTS = [
    'forschungs', 'geländeerfahrung', 'tagungen', 'konferenzen',
    'publikationen', 'publications', 'awards', 'auszeichnungen', 'engagement',
    'ehrenamt', 'volunteering', 'preise', 'ehrungen',
]

# Sections that map to known standard keys (for use in parse_cv_text)
KNOWN_EXTRA_SECTION_KEYS = {
    'soft_skills', 'volunteering', 'awards', 'publications', 'conferences',
}

MONTHS = {
    # English abbreviations
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
    # German full names
    'januar': 1, 'februar': 2, 'märz': 3, 'maerz': 3, 'april': 4, 'mai': 5,
    'juni': 6, 'juli': 7, 'august': 8, 'september': 9, 'oktober': 10,
    'november': 11, 'dezember': 12,
    # German abbreviations
    'mär': 3, 'okt': 10, 'dez': 12,
    # English full names
    'january': 1, 'february': 2, 'march': 3, 'june': 6, 'july': 7,
    'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
}

# Matches full German month names, abbreviations, YYYY-MM, MM/YYYY, plain YYYY
DATE_RANGE_RE = re.compile(
    r'(\d{4}-\d{2}|\d{1,2}/\d{4}|\d{4}|'
    r'(?:januar|februar|m\u00e4rz|maerz|april|mai|juni|juli|august|'
    r'september|oktober|november|dezember|'
    r'jan|feb|m\u00e4r|mar|apr|jun|jul|aug|sep|okt|nov|dez|'
    r'january|february|march|june|july|august|september|october|november|december|'
    r'may|oct|dec)'
    r'\.?\s*\d{4})'
    r'\s*(?:[\u2013\u2014\u2012\-\/]|\bto\b|\bbis\b)\s*'
    r'(\d{4}-\d{2}|\d{1,2}/\d{4}|\d{4}|present|heute|aktuell|current|now|laufend|ongoing|'
    r'(?:januar|februar|m\u00e4rz|maerz|april|mai|juni|juli|august|'
    r'september|oktober|november|dezember|'
    r'jan|feb|m\u00e4r|mar|apr|jun|jul|aug|sep|okt|nov|dez|'
    r'january|february|march|june|july|august|september|october|november|december|'
    r'may|oct|dec)'
    r'\.?\s*\d{4})',
    re.IGNORECASE,
)

EDV_KEYWORDS = [
    'microsoft', 'ms office', 'excel', 'word', 'powerpoint', 'arcgis', 'gis',
    'qgis', 'stata', 'spss', 'r studio', 'python', 'matlab', 'autocad',
    'adobe', 'photoshop', 'illustrator', 'edv', 'computer', 'software',
    'hardware', 'it-kenntnisse', 'office 365', 'remote sensing', 'fernerkundung',
    'latex', 'programming', 'programmierung',
]

PROFICIENCY_MAP = {
    'Native':       ['muttersprache', 'native', 'erstsprache', 'muttersprachlich'],
    'Fluent':       ['fließend', 'fliessend', 'verhandlungssicher', 'fluent',
                     'full professional', 'c1', 'c2'],
    'Advanced':     ['fortgeschritten', 'advanced', 'sehr gut', 'b2', 'gute kenntnisse'],
    'Intermediate': ['mittelstufe', 'intermediate', 'gut', 'b1', 'a2'],
    'Basic':        ['grundkenntnisse', 'basic', 'elementary', 'beginner', 'a1'],
}

DEGREE_LINE_RE = re.compile(
    r'^(m\.?sc|b\.?sc|m\.?a\.|b\.?a\.|phd|dr\.|dipl\.|ing\.|master|bachelor|'
    r'diplom|doktor|magister|ll\.m|mba)\b',
    re.IGNORECASE,
)

DEGREE_PREFIXES = (
    'm.sc', 'b.sc', 'm.a.', 'b.a.', 'msc', 'bsc', 'phd', 'dr.',
    'dipl.', 'ing.', 'prof.', 'master', 'bachelor', 'diplom',
    'doktor', 'magister', 'll.m', 'mba',
)

UNI_WORDS = [
    'university', 'universität', 'universitat', 'hochschule',
    'college', 'school', 'institute', 'akademie', 'fachhochschule',
    'gymnasium', 'tribhuvan', 'pokhara', 'purbanchal', 'rwth', 'eth',
    'bayreuth', 'kathmandu', 'forestry college', 'technische universität',
]

COUNTRY_WORDS = {
    'deutschland', 'germany', 'nepal', 'austria', 'österreich',
    'switzerland', 'schweiz', 'uk', 'usa', 'france', 'india',
}


# ── File extraction ────────────────────────────────────────────────────────────

def extract_text_from_file(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.pdf':
        return _extract_pdf(file_path)
    if ext in ('.doc', '.docx'):
        return _extract_docx(file_path)
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()


def _extract_pdf(fp: str) -> str:
    try:
        import pdfplumber
        parts = []
        with pdfplumber.open(fp) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    parts.append(t)
        return '\n'.join(parts)
    except ImportError:
        raise ValueError('pdfplumber not installed')


def _extract_docx(fp: str) -> str:
    try:
        from docx import Document
        doc = Document(fp)
        return '\n'.join(p.text for p in doc.paragraphs if p.text.strip())
    except ImportError:
        raise ValueError('python-docx not installed')


# ── Section splitting ──────────────────────────────────────────────────────────

def _classify_line(line: str):
    """Return (section_type, is_standard) or (None, False)."""
    cleaned = re.sub(r'^[\W\s]+', '', line).strip()
    lower = cleaned.lower().rstrip(':').strip()
    if len(lower) < 2 or len(lower) > 70:
        return None, False

    # Must be mostly alphabetic
    alpha = len(re.sub(r'[^a-zA-Z\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df\s\-&/()]', '', lower))
    if alpha / max(len(lower), 1) < 0.55:
        return None, False

    # Standard section keywords (exact or prefix match)
    for stype, kws in SECTION_KEYWORDS.items():
        for kw in kws:
            if lower == kw or lower.startswith(kw + ' ') or lower.startswith(kw):
                return stype, True

    # Custom: ALL-CAPS (every alpha char uppercase), short (≤50), no date
    all_upper = cleaned == cleaned.upper() and bool(re.search(r'[A-Z\u00c4\u00d6\u00dc]', cleaned))
    is_caps = all_upper and 3 < len(cleaned) <= 50 and not DATE_RANGE_RE.search(cleaned)
    has_hint = any(h in lower for h in CUSTOM_HINTS)

    if is_caps or has_hint:
        return 'custom:' + cleaned, False

    return None, False


def _split_into_sections(lines: List[str]):
    sections: Dict[str, tuple] = {}
    customs: List[Dict] = []
    cur_type: Optional[str] = None
    cur_header = ''
    cur_lines: List[str] = []
    seen_standard = False  # True once we've encountered a real section

    def flush():
        nonlocal cur_type, cur_header, cur_lines
        if not cur_type:
            return
        clean = list(cur_lines)
        while clean and not clean[0]:
            clean.pop(0)
        while clean and not clean[-1]:
            clean.pop()
        if cur_type.startswith('custom:'):
            title = cur_type[len('custom:'):]
            items = [l for l in clean if l]
            # Serialize items to a content string so the editor textarea is pre-filled
            content = '\n'.join(f'• {it}' if not it.startswith(('•', '-', '*')) else it for it in items)
            customs.append({'title': title, 'items': items, 'content': content})
        elif cur_type not in sections:
            sections[cur_type] = (cur_header, clean)
        cur_type = None
        cur_header = ''
        cur_lines = []

    for line in lines:
        s = line.strip()
        if not s:
            if cur_type:
                cur_lines.append('')
            continue
        stype, is_standard = _classify_line(s)

        # Skip custom-section classification until at least one standard section seen
        # This prevents the name/header block from being captured as custom
        if stype and stype.startswith('custom:') and not seen_standard:
            stype = None

        if stype:
            if is_standard:
                seen_standard = True
            flush()
            cur_type = stype
            cur_header = s
        else:
            if cur_type:
                cur_lines.append(s)

    flush()
    return sections, customs


# ── Date helpers ───────────────────────────────────────────────────────────────

def _normalize_date(raw: str) -> str:
    raw = raw.strip()
    # YYYY-MM
    m = re.match(r'^(\d{4})-(\d{2})$', raw)
    if m:
        return f'{m.group(1)}-{m.group(2)}'
    # MM/YYYY
    m = re.match(r'^(\d{1,2})/(\d{4})$', raw)
    if m:
        return f'{m.group(2)}-{m.group(1).zfill(2)}'
    # YYYY
    m = re.match(r'^(\d{4})$', raw)
    if m:
        return m.group(1)
    # Month YYYY — full word lookup then 3-char fallback
    m = re.match(
        r'^([a-zA-Z\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df]{2,12})\.?\s+(\d{4})$',
        raw)
    if m:
        word = m.group(1).lower()
        mn = MONTHS.get(word) or MONTHS.get(word[:3])
        return f'{m.group(2)}-{str(mn).zfill(2)}' if mn else m.group(2)
    return raw


def _is_current(s: str) -> bool:
    return bool(re.search(r'present|heute|aktuell|current|now|laufend|ongoing', s, re.I))


# ── Personal info ──────────────────────────────────────────────────────────────

def _extract_personal_info(text: str, lines: List[str]) -> Dict[str, str]:
    info: Dict[str, str] = {}

    m = re.search(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', text)
    if m:
        info['email'] = m.group()

    phones = re.findall(r'(?:\+?[\d\s\-\(\)\.]{10,20})', re.sub(r'[^\d\s\-\(\)\+]', ' ', text))
    phones = [p.strip() for p in phones if len(re.sub(r'\D', '', p)) >= 8]
    if phones:
        info['phone'] = phones[0].strip()

    li = re.findall(r'linkedin\.com/in/([\w\-]+)', text, re.I)
    if li:
        info['linkedin'] = f'linkedin.com/in/{li[0]}'

    gh = re.findall(r'github\.com/([\w\-]+)', text, re.I)
    if gh:
        info['website'] = f'github.com/{gh[0]}'

    loc_m = re.search(
        r'(M\u00fcnchen|Munich|Berlin|Frankfurt|Hamburg|K\u00f6ln|Cologne|'
        r'Stuttgart|Vienna|Wien|Z\u00fcrich|Kathmandu|Pokhara|Nepal|London|Paris|Bayreuth)',
        text)
    if loc_m:
        info['location'] = loc_m.group(0).strip()

    for line in lines[:8]:
        if re.search(r'[@\+]|\d{4}', line):
            continue
        words = line.split()
        if 2 <= len(words) <= 5 and all(
            w[0].isupper() if w and w[0].isalpha() else True for w in words
        ):
            info['name'] = line.strip()
            break

    return info


# ── Experience ─────────────────────────────────────────────────────────────────

def _split_role_company(text: str):
    for sep in [' | ', '|']:
        if sep in text:
            idx = text.index(sep)
            return text[:idx].strip(), text[idx + len(sep):].strip()
    for sep in [' bei ', ' at ', ' für ', ' for ']:
        if sep.lower() in text.lower():
            idx = text.lower().index(sep.lower())
            return text[:idx].strip(), text[idx + len(sep):].strip()
    if ',' in text:
        a, b = text.split(',', 1)
        org = ['gmbh', 'ag', 'ltd', 'inc', 'llc', 'corp', 'office', 'center',
               'centre', 'institut', 'organization', 'organisation', 'nepal',
               'iucn', 'wwf', 'foundation', 'stiftung']
        if any(w in b.lower() for w in org):
            return a.strip(), b.strip()
    return text.strip(), ''


def _looks_like_role_company(s: str) -> bool:
    if not s or len(s) > 120:
        return False
    if ' | ' in s:
        return True
    sl = s.lower()
    orgs = ['gmbh', ' ag ', ' ltd ', ' llc ', ' inc ', 'iucn', 'wwf',
            'stiftung', 'foundation', ' office ', ' institute ']
    if any(o in ' ' + sl + ' ' for o in orgs):
        return True
    words = s.split()
    if (2 <= len(words) <= 8
            and all(w[0].isupper() if w and w[0].isalpha() else True for w in words)
            and not re.search(r'[;:()\[\]{}]', s)
            and not DATE_RANGE_RE.search(s)):
        return True
    return False


def _parse_experience(lines: List[str]) -> List[Dict[str, Any]]:
    """
    Layout A: "Role | Company   MM/YYYY – MM/YYYY"  (date same line)
    Layout B: "Role | Company"
              "MM/YYYY – MM/YYYY"
    """
    entries = []
    current: Optional[Dict] = None
    bullets: List[str] = []
    pending: Optional[str] = None

    def flush():
        nonlocal current, bullets, pending
        if current:
            current['description'] = '\n'.join(b for b in bullets if b)
            entries.append(current)
        current = None
        bullets = []
        pending = None

    for line in lines:
        s = line.strip()
        if not s:
            continue

        dm = DATE_RANGE_RE.search(s)

        if dm:
            before = s[:dm.start()].strip().rstrip(',|').strip()
            after  = s[dm.end():].strip().lstrip(',|').strip()

            if before:
                role, company = _split_role_company(before)
            elif pending:
                role, company = _split_role_company(pending)
            else:
                role, company = '', ''

            flush()
            current = {
                'role':      role,
                'company':   company,
                'location':  after if after and len(after) < 60 else '',
                'startDate': _normalize_date(dm.group(1)),
                'endDate':   '' if _is_current(dm.group(2)) else _normalize_date(dm.group(2)),
                'current':   _is_current(dm.group(2)),
                'description': '',
            }

        elif current is not None:
            if s.startswith(('\u2022', '-', '\u2013', '\u2014', '*', '\u25cf')):
                bullets.append(s.lstrip('\u2022\-\u2013\u2014* ').strip())
            elif _looks_like_role_company(s):
                flush()
                pending = s
            elif len(s) > 5:
                if (re.match(r'^[A-Z][a-z].{1,30},\s*[A-Z]', s)
                        and len(s.split()) <= 6
                        and not current.get('location')):
                    current['location'] = s
                else:
                    bullets.append(s)
        else:
            if not s.startswith(('\u2022', '-', '\u2013', '*')):
                pending = s

    flush()
    return entries


# ── Education ──────────────────────────────────────────────────────────────────

def _split_degree_institution(text: str):
    """Split a degree line into (degree, institution)."""

    # Pipe separator — most reliable
    if ' | ' in text:
        idx = text.index(' | ')
        left  = text[:idx].strip()
        right = text[idx + 3:].strip()
        # right may be "Institution, City, Country" — strip trailing countries
        right_parts = [p.strip() for p in right.split(',')]
        right_clean = ', '.join(p for p in right_parts if p.lower() not in COUNTRY_WORDS)
        return left, right_clean or right

    # Large whitespace gap (2+ spaces) — degree and institution on same line
    gap_m = re.search(r'(\S)\s{2,}(\S)', text)
    if gap_m:
        left  = text[:gap_m.start(1) + 1].strip()
        right = text[gap_m.start(2):].strip()
        left_l = left.lower()
        is_deg = any(left_l.startswith(p) for p in DEGREE_PREFIXES)
        has_uni_r = any(w in right.lower() for w in UNI_WORDS)
        if is_deg and (has_uni_r or right):
            # Strip trailing country from right
            right_parts = [p.strip() for p in right.split(',')]
            right_clean = ', '.join(p for p in right_parts if p.lower() not in COUNTRY_WORDS)
            return left, right_clean or right

    # Comma split — "M.Sc. Ecology, Universität Bayreuth, Deutschland"
    if ',' in text:
        parts = [p.strip() for p in text.split(',')]
        first_lower = parts[0].lower()
        is_deg = any(first_lower.startswith(p) for p in DEGREE_PREFIXES)
        # Find first part containing a known university word
        for i in range(1, len(parts)):
            joined = ', '.join(parts[i:i + 2])
            if any(w in joined.lower() for w in UNI_WORDS):
                degree = ', '.join(parts[:i]).strip()
                inst_parts = [p for p in parts[i:] if p.lower() not in COUNTRY_WORDS]
                return degree, ', '.join(inst_parts).strip()
        if is_deg:
            remaining = [p for p in parts[1:] if p.lower() not in COUNTRY_WORDS]
            if remaining:
                return parts[0].strip(), ', '.join(remaining)

    return text.strip(), ''


def _parse_education(lines: List[str]) -> List[Dict[str, Any]]:
    """
    Layout A: "M.Sc. Ecology | Universität 2019 – 2025"     (degree+date same line)
    Layout B: "M.Sc. Ecology   Universität, Land"            (degree line first)
              "Oktober 2019 – März 2025"                     (date next line)
              "• Masterarbeit: ..."                          (description bullets)
    """
    entries = []
    current: Optional[Dict] = None

    def flush():
        nonlocal current
        if current:
            entries.append(dict(current))
        current = None

    def is_degree_line(s: str) -> bool:
        return bool(DEGREE_LINE_RE.match(s.strip()))

    for line in lines:
        if not line:
            continue

        dm = DATE_RANGE_RE.search(line)

        if dm:
            before = line[:dm.start()].strip()
            if before:
                # Layout A — degree + date on same line
                flush()
                degree, inst = _split_degree_institution(before)
                current = {
                    'degree': degree, 'institution': inst, 'field': '',
                    'description': '',
                    'startDate': _normalize_date(dm.group(1)),
                    'endDate': '' if _is_current(dm.group(2)) else _normalize_date(dm.group(2)),
                    'grade': '',
                }
            elif current and not current.get('startDate'):
                # Layout B — date line following the degree line
                current['startDate'] = _normalize_date(dm.group(1))
                current['endDate']   = '' if _is_current(dm.group(2)) else _normalize_date(dm.group(2))
                # Don't flush yet — description bullets may follow

        elif is_degree_line(line):
            # New degree header — flush previous and start fresh
            flush()
            degree, inst = _split_degree_institution(line)
            current = {'degree': degree, 'institution': inst, 'field': '',
                       'description': '', 'startDate': '', 'endDate': '', 'grade': ''}

        elif current:
            # Detail lines: thesis, bullets, grade
            clean = line.strip().lstrip('\u2022\u2013\u2014\-* ').strip()
            if re.search(r'(note|grade|gpa|ects)', line, re.I):
                gm = re.search(r'[\d,.]+', line)
                if gm:
                    current['grade'] = gm.group()
            elif clean:
                # Append to description (captures Masterarbeit, Schwerpunkte, etc.)
                if current['description']:
                    current['description'] += '\n' + clean
                else:
                    current['description'] = clean
                # Also set field to first description line
                if not current.get('field'):
                    current['field'] = clean

    flush()
    return entries


# ── Skills ─────────────────────────────────────────────────────────────────────

def _is_category_header(line: str) -> bool:
    s = line.strip()
    if s.endswith(':') and 3 < len(s) < 80:
        return True
    if s == s.upper() and 3 < len(s) < 60 and ',' not in s:
        return True
    return False


def _parse_skills(content: str) -> List[Dict[str, str]]:
    skills, seen, cat = [], set(), ''
    for line in content.split('\n'):
        s = line.strip()
        if not s:
            continue
        if _is_category_header(s):
            cat = s.rstrip(':').strip()
            continue
        s = re.sub(r'^[\u2022\-\u2013*]\s*', '', s).strip()
        if not s:
            continue
        for part in [p.strip() for p in re.split(r'[,;]', s) if p.strip()]:
            part = part.strip('\u2022-\u2013* ')
            if 1 < len(part) < 80 and not part.isnumeric():
                key = part.lower()
                if key not in seen:
                    seen.add(key)
                    skills.append({'name': part, 'level': '', 'category': cat})
    return skills[:60]


# ── Languages ──────────────────────────────────────────────────────────────────

def _map_proficiency(text: str) -> str:
    t = text.lower()
    for level, kws in PROFICIENCY_MAP.items():
        if any(kw in t for kw in kws):
            return level
    return text.strip().title() or 'Intermediate'


def _parse_languages(lines: List[str]):
    """Returns (languages, edv_skills)."""
    langs, edv = [], []
    for line in lines:
        s = line.strip().lstrip('\u2022-\u2013 ').strip()
        if not s:
            continue
        sl = s.lower()

        if any(kw in sl for kw in EDV_KEYWORDS):
            # Strip "Category Label: " prefix (e.g. "GIS Software: ArcGIS, QGIS")
            if ':' in s:
                s_edv = s.split(':', 1)[1].strip()
            else:
                s_edv = s
            # Strip trailing " — EDV" label
            s_edv = re.sub(r'\s*[\u2014\u2013\-]\s*edv\s*$', '', s_edv, flags=re.I).strip()
            for p in [p.strip() for p in re.split(r'[,;]', s_edv) if p.strip()]:
                p = p.lstrip('\u2022-\u2013 ').strip()
                clean = re.sub(r'\s*[\u2014\u2013\-]\s*edv\s*$', '', p, flags=re.I).strip()
                if 1 < len(clean) < 60:
                    edv.append({'name': clean, 'level': '', 'category': 'EDV'})
            continue

        # "Language — Proficiency" or "Language: Proficiency"
        m = re.match(
            r'^([A-Za-z\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df]+'
            r'(?:\s[A-Za-z]+)?)\s*[:\-\u2013\u2014]\s*(.+)$', s)
        if m:
            lang = m.group(1).strip()
            if lang and len(lang) < 30:
                langs.append({'language': lang, 'proficiency': _map_proficiency(m.group(2))})
        elif re.match(r'^[A-Za-z\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc\u00df]{3,25}$', s):
            langs.append({'language': s, 'proficiency': 'Fluent'})
    return langs, edv


# ── Certifications ─────────────────────────────────────────────────────────────

_CERT_SKIP_RE = re.compile(
    r'^(validation\s*(number|no\.?|#|:)|validate\s*at|https?://|www\.|'
    r'best\u00e4tigung|zertifikat-id)',
    re.I,
)


def _parse_certifications(lines: List[str]) -> List[Dict[str, str]]:
    """
    Handles:
      Single-line:        "Name — Issuer 2022"
      Parenthesised date: "Name — Issuer (Month 2022)"
      Multi-line:         continuation lines starting with '(' are joined
    """
    certs: List[Dict] = []
    raw_lines: List[str] = []

    def parse_and_flush():
        if not raw_lines:
            return
        full = ' '.join(raw_lines).strip()
        raw_lines.clear()
        if not full or _CERT_SKIP_RE.match(full):
            return

        # Extract parenthesised date (most specific)
        display_date = ''
        paren_m = re.search(r'\(([^)]{4,40})\)', full)
        if paren_m:
            pd = paren_m.group(1).strip()
            if re.search(r'\d{4}', pd):
                display_date = pd
                full_clean = (full[:paren_m.start()] + full[paren_m.end():]).strip().rstrip('.')
            else:
                full_clean = full
        else:
            full_clean = full

        year_m = re.search(r'\b(20\d{2}|19\d{2})\b', full_clean)
        if not display_date:
            display_date = year_m.group() if year_m else ''

        dash_m = re.match(r'^(.+?)\s*[\u2014\u2013]\s*(.+)$', full_clean)
        if dash_m:
            name_part   = dash_m.group(1).strip()
            issuer_part = re.sub(r'\b(?:20|19)\d{2}\b', '', dash_m.group(2)).strip().rstrip(',.').strip()
            certs.append({'name': name_part, 'issuer': issuer_part, 'date': display_date})
        elif year_m:
            name_part = re.sub(r'\b(?:20|19)\d{2}\b', '', full_clean).strip().rstrip('\u2013\u2014,-').strip()
            if len(name_part) > 2:
                certs.append({'name': name_part, 'issuer': '', 'date': display_date})
        elif len(full_clean) > 2:
            certs.append({'name': full_clean, 'issuer': '', 'date': ''})

    for line in lines:
        s = line.strip().lstrip('\u2022-\u2013 ').strip()
        if not s or _CERT_SKIP_RE.match(s):
            continue
        first_word = s.split()[0] if s.split() else ''
        is_continuation = s.startswith('(') or (first_word and first_word[0].islower())
        if is_continuation and raw_lines:
            raw_lines.append(s)
        else:
            parse_and_flush()
            raw_lines.append(s)

    parse_and_flush()
    return certs


# ── Projects ───────────────────────────────────────────────────────────────────

def _parse_projects(lines: List[str]) -> List[Dict[str, str]]:
    projects, current = [], None
    for line in lines:
        if not line:
            continue
        has_url = bool(re.search(r'(https?://|github\.com/|gitlab\.com/|\bwww\.)', line, re.I))
        is_bullet = line.startswith(('\u2022', '-', '\u2013', '*'))
        words = line.split()
        # Project title: all words title-case, ≤6 words, no URL, no bullet, no date
        is_title_case = (bool(words) and all(
            w[0].isupper() if w and w[0].isalpha() else True for w in words))
        is_new = (
            not is_bullet and not has_url
            and is_title_case and len(words) <= 6
            and len(line) < 80 and not DATE_RANGE_RE.search(line)
        )
        if is_new:
            if current:
                projects.append(current)
            current = {'name': line, 'description': '', 'url': ''}
        elif current:
            um = re.search(r'(https?://\S+|github\.com/\S+|gitlab\.com/\S+)', line, re.I)
            if um:
                current['url'] = um.group(1)
                rem = line[:um.start()].strip().lstrip('\u2022-\u2013* ')
                if rem:
                    current['description'] = (current['description'] + ' ' + rem).strip()
            else:
                desc = line.lstrip('\u2022-\u2013* ').strip()
                current['description'] = (current['description'] + ' ' + desc).strip()
    if current:
        projects.append(current)
    return projects


# ── Interests ──────────────────────────────────────────────────────────────────

def _parse_interests(lines: List[str]) -> List[str]:
    interests = []
    for line in lines:
        s = line.strip().lstrip('\u2022-\u2013* ').strip()
        if not s:
            continue
        for part in [p.strip() for p in re.split(r'[,;\u2022\u25cf]', s) if p.strip()]:
            part = part.lstrip('\u2022-\u2013* ').strip()
            if 1 < len(part) < 80:
                interests.append(part)
    return interests


# ── Main parse ─────────────────────────────────────────────────────────────────

def parse_cv_text(text: str) -> Dict[str, Any]:
    parsed: Dict[str, Any] = {
        'personalInfo': {},
        'summary': '',
        'experience': [],
        'education': [],
        'skills': [],
        'certifications': [],
        'languages': [],
        'projects': [],
        'interests': [],
        'custom_sections': [],
        'sectionLabels': {},
    }

    lines = [l.strip() for l in text.split('\n')]
    non_empty = [l for l in lines if l]

    sections, customs = _split_into_sections(lines)
    parsed['custom_sections'] = customs
    parsed['personalInfo'] = _extract_personal_info(text, non_empty)

    # Collect EDV skills from languages separately so we can merge after skills parsed
    _edv_pending: List[Dict] = []

    for stype, (header, content_lines) in sections.items():
        content = '\n'.join(content_lines).strip()
        if stype == 'summary':
            parsed['summary'] = content[:2000]
        elif stype == 'experience':
            parsed['experience'] = _parse_experience(content_lines)
        elif stype == 'education':
            parsed['education'] = _parse_education(content_lines)
        elif stype == 'skills':
            parsed['skills'] = _parse_skills(content)
        elif stype == 'soft_skills':
            # Store soft skills as skill items with category 'Soft Skills'
            soft = _parse_skills(content)
            for sk in soft:
                sk['category'] = 'Soft Skills'
            parsed['skills'] = parsed.get('skills', []) + soft
        elif stype == 'certifications':
            parsed['certifications'] = _parse_certifications(content_lines)
        elif stype == 'languages':
            langs, edv = _parse_languages(content_lines)
            parsed['languages'] = langs
            _edv_pending.extend(edv)
        elif stype == 'projects':
            parsed['projects'] = _parse_projects(content_lines)
        elif stype == 'interests':
            parsed['interests'] = _parse_interests(content_lines)
        elif stype in KNOWN_EXTRA_SECTION_KEYS:
            # Known extra sections (volunteering, awards, publications, conferences)
            # → store as structured custom sections with both items and content
            items = [l for l in content_lines if l.strip()]
            clean_items = [l.strip().lstrip('•\-\–* ').strip() for l in items if l.strip()]
            section_content = '\n'.join(
                f'• {it}' if not it.startswith(('•', '-', '*')) else it
                for it in clean_items
            )
            parsed['custom_sections'].append({
                'title': header,
                'items': clean_items,
                'content': section_content,
            })
        # 'references' intentionally skipped

    # Merge EDV skills after skills array is fully populated
    if _edv_pending:
        existing = {s['name'].lower() for s in parsed['skills']}
        for sk in _edv_pending:
            if sk['name'].lower() not in existing and len(sk['name']) > 1:
                parsed['skills'].append(sk)
                existing.add(sk['name'].lower())

    return parsed


def parse_cv_file(file_path: str) -> Dict[str, Any]:
    try:
        raw = extract_text_from_file(file_path)
        parsed = parse_cv_text(raw)
        parsed['raw_text'] = raw
        return parsed
    except Exception as e:
        return {
            'personalInfo': {}, 'summary': '', 'experience': [], 'education': [],
            'skills': [], 'certifications': [], 'languages': [], 'projects': [],
            'interests': [], 'custom_sections': [], 'sectionLabels': {},
            'raw_text': '', 'parse_error': str(e),
        }


def generate_suggestions(cv_data: Dict[str, Any], job_description: str):
    suggestions = []
    if not cv_data.get('summary'):
        suggestions.append({
            'title': 'Add a Profile Summary',
            'description': 'A summary helps recruiters understand your value quickly.',
            'suggestion': 'Write a 2-3 sentence career summary at the top of your CV.',
            'section': 'summary',
        })
    return suggestions
