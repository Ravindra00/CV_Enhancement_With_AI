"""
PDF Generator — matches target layout exactly (Bugs B1-B7).
"""
from io import BytesIO
import re
from typing import Dict, Any, Optional, List
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
    Table, TableStyle, KeepTogether, Flowable
)
from reportlab.lib.enums import TA_LEFT, TA_RIGHT

DEFAULT_COLOR = '#1a1a1a'

LABELS_DE = {
    'summary':        '📋 BERUFLICHES PROFIL',
    'experience':     '💼 BERUFSERFAHRUNG',
    'education':      '🎓 AKADEMISCHE AUSBILDUNG',
    'skills':         '⚡ FÄHIGKEITEN',
    'certifications': '🏅 WEITERBILDUNG & ZERTIFIKATE',
    'languages':      '🌐 SPRACHKENNTNISSE',
    'projects':       '🚀 PROJEKTE',
    'interests':      '🎯 INTERESSEN',
}
LABELS_EN = {
    'summary':        '📋 PROFILE',
    'experience':     '💼 EXPERIENCE',
    'education':      '🎓 EDUCATION',
    'skills':         '⚡ SKILLS',
    'certifications': '🏅 CERTIFICATIONS',
    'languages':      '🌐 LANGUAGES',
    'projects':       '🚀 PROJECTS',
    'interests':      '🎯 INTERESTS',
}

GERMAN_MARKERS = [
    'erfahrung','kenntnisse','fähigkeiten','verantwortlich','unternehmen',
    'aufgaben','bereich','wurde','habe','haben','leitung','planung','umsetzung',
    'nepalesisch','deutsch','englisch','berufserfahrung','ausbildung',
]


def _hex(h: str):
    h = h.strip().lstrip('#')
    if len(h) == 3:
        h = ''.join(c*2 for c in h)
    return colors.Color(int(h[0:2],16)/255, int(h[2:4],16)/255, int(h[4:6],16)/255)


def _is_german(cv_data: dict) -> bool:
    blob = ' '.join([
        str(cv_data.get('summary') or ''),
        str((cv_data.get('personalInfo') or cv_data.get('personal_info') or {}).get('title','') or ''),
    ] + [
        str(e.get('description','') or '') for e in
        ((cv_data.get('experience') or []) + (cv_data.get('experiences') or []))[:3]
    ]).lower()
    return sum(1 for w in GERMAN_MARKERS if w in blob) >= 2


def _flatten_skills(skills) -> List[Dict]:
    """Return list of {name, category} dicts."""
    if not skills:
        return []
    result = []
    for s in skills:
        if isinstance(s, str):
            result.append({'name': s, 'category': ''})
        elif isinstance(s, dict):
            result.append({'name': s.get('name',''), 'category': s.get('category','')})
    return [r for r in result if r['name']]


class _PillRow(Flowable):
    """Wrapping pill chips for a single category group."""
    def __init__(self, skill_names, primary_hex, avail_width):
        Flowable.__init__(self)
        self.skills = [s for s in skill_names if s]
        self.primary_hex = primary_hex
        self._avail = avail_width
        self._pad_h, self._pad_v, self._gap_h, self._gap_v = 5, 3, 6, 5
        self._fs, self._font, self._r = 8, 'Helvetica', 4
        self._height = 0

    def _layout(self):
        from reportlab.pdfbase.pdfmetrics import stringWidth
        rows, row, x = [], [], 0
        for sk in self.skills:
            tw = stringWidth(sk, self._font, self._fs)
            pw = tw + 2*self._pad_h
            if x + pw > self._avail and row:
                rows.append(row); row = []; x = 0
            row.append((sk, x, pw))
            x += pw + self._gap_h
        if row:
            rows.append(row)
        ph = self._fs + 2*self._pad_v
        return rows, ph, len(rows)*(ph+self._gap_v)

    def wrap(self, aw, ah):
        self._avail = aw
        _, _, h = self._layout()
        self._height = h + 4
        return aw, self._height

    def draw(self):
        rows, ph, _ = self._layout()
        p = _hex(self.primary_hex)
        bg = colors.Color(p.red*.12+.88, p.green*.12+.88, p.blue*.12+.88)
        bd = colors.Color(p.red*.35+.65, p.green*.35+.65, p.blue*.35+.65)
        y = self._height - ph - 4
        for row in rows:
            for sk, x, pw in row:
                self.canv.setFillColor(bg); self.canv.setStrokeColor(bd)
                self.canv.setLineWidth(0.5)
                self.canv.roundRect(x, y, pw, ph, self._r, fill=1, stroke=1)
                self.canv.setFillColor(p); self.canv.setFont(self._font, self._fs)
                tw = self.canv.stringWidth(sk, self._font, self._fs)
                self.canv.drawString(x+(pw-tw)/2, y+self._pad_v+1, sk)
            y -= (ph+self._gap_v)


def generate_cv_pdf(cv_data: Dict[str, Any], title: str = "CV",
                    theme: Optional[Dict[str, Any]] = None) -> bytes:
    theme = theme or {}
    primary_hex = theme.get('primaryColor') or DEFAULT_COLOR
    PRIMARY = _hex(primary_hex)
    GRAY = colors.HexColor('#6b7280')
    TEXT = colors.HexColor('#1a1a1a')
    is_de = _is_german(cv_data)
    labels = {**( LABELS_DE if is_de else LABELS_EN ),
              **(cv_data.get('sectionLabels') or {})}

    # Normalise data keys (accept both camelCase and snake_case)
    pi = cv_data.get('personalInfo') or cv_data.get('personal_info') or {}
    name       = (pi.get('name') or cv_data.get('full_name') or 'Your Name').upper()
    headline   = pi.get('title') or pi.get('jobTitle') or cv_data.get('title') or ''
    email      = pi.get('email') or cv_data.get('email') or ''
    phone      = pi.get('phone') or cv_data.get('phone') or ''
    location   = pi.get('location') or cv_data.get('location') or ''
    linkedin   = pi.get('linkedin') or cv_data.get('linkedin_url') or ''
    website    = pi.get('website') or ''
    summary    = pi.get('summary') or cv_data.get('summary') or cv_data.get('profile_summary') or ''

    experiences   = cv_data.get('experience') or cv_data.get('experiences') or []
    education_list= cv_data.get('education') or cv_data.get('educations') or []
    all_skills    = _flatten_skills(cv_data.get('skills') or [])
    certs         = cv_data.get('certifications') or []
    langs         = cv_data.get('languages') or []
    projects      = cv_data.get('projects') or []
    raw_interests = cv_data.get('interests') or []
    interests     = [i if isinstance(i,str) else i.get('name','') for i in raw_interests if i]
    interests     = [i for i in interests if i]
    custom_secs   = cv_data.get('custom_sections') or []

    buf = BytesIO()
    margin = 1.5*cm
    doc = SimpleDocTemplate(buf, pagesize=A4,
        leftMargin=margin, rightMargin=margin,
        topMargin=margin, bottomMargin=1.4*cm, title=title)

    SS = getSampleStyleSheet()
    def st(n, **kw):
        return ParagraphStyle(n, parent=SS['Normal'], **kw)

    S_name   = st('N', fontSize=20, fontName='Helvetica-Bold', textColor=TEXT, leading=26, spaceAfter=2)
    S_head   = st('H', fontSize=10, fontName='Helvetica',      textColor=GRAY, leading=14, spaceAfter=3)
    S_contact= st('C', fontSize=8.5,fontName='Helvetica',      textColor=GRAY, leading=12, spaceAfter=0)
    S_sec    = st('SC',fontSize=9.5, fontName='Helvetica-Bold', textColor=TEXT, leading=13, spaceAfter=1)
    S_body   = st('B', fontSize=9.5, fontName='Helvetica',      textColor=TEXT, leading=14, spaceAfter=2)
    S_bold   = st('BB',fontSize=9.5, fontName='Helvetica-Bold', textColor=TEXT, leading=14, spaceAfter=1)
    S_gray   = st('G', fontSize=8.5, fontName='Helvetica',      textColor=GRAY, leading=12, spaceAfter=2)
    S_rgt    = st('R', fontSize=8.5, fontName='Helvetica',      textColor=GRAY, leading=12, alignment=TA_RIGHT)
    S_cat    = st('CAT',fontSize=8,  fontName='Helvetica-Bold', textColor=PRIMARY, leading=11, spaceAfter=2, spaceBefore=4)
    S_bullet = st('BUL',fontSize=9,  fontName='Helvetica',      textColor=TEXT, leading=13, leftIndent=10, spaceAfter=1)

    story = []

    # ── HEADER ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 4))
    story.append(Paragraph(name, S_name))
    if headline:
        story.append(Paragraph(headline, S_head))
    parts = []
    if email:    parts.append(f'✉ {email}')
    if phone:    parts.append(f'✆ {phone}')
    if location: parts.append(f'📍 {location}')
    if linkedin: parts.append(f'in {linkedin}')
    if website:  parts.append(f'🔗 {website}')
    if parts:
        story.append(Paragraph('  |  '.join(parts), S_contact))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width='100%', thickness=1.5, color=TEXT, spaceAfter=8))

    def sec_hdr(label):
        story.append(Spacer(1, 4))
        story.append(Paragraph(f'<b>{label.upper()}</b>', S_sec))
        story.append(HRFlowable(width='100%', thickness=0.7, color=PRIMARY, spaceAfter=5))

    # ── SUMMARY ───────────────────────────────────────────────────────────────
    if summary:
        sec_hdr(labels['summary'])
        clean = re.sub(r'^[•\-\*]\s*', '', summary.strip(), flags=re.M)
        story.append(Paragraph(clean, S_body))

    # ── EXPERIENCE — B3 layout ────────────────────────────────────────────────
    if experiences:
        sec_hdr(labels['experience'])
        for exp in experiences:
            role    = exp.get('role') or exp.get('position') or exp.get('job_title') or ''
            company = exp.get('company') or ''
            loc_e   = exp.get('location') or ''
            start   = exp.get('startDate') or exp.get('start_date') or ''
            is_cur  = exp.get('current') or False
            end     = ('Heute' if is_de else 'Present') if is_cur else (exp.get('endDate') or exp.get('end_date') or '')
            date_str= f'{start} – {end}' if (start or end) else ''

            # Line 1: "Role | Company, Location"  with date right-aligned
            left = f'<b>{role}'
            if company: left += f' | {company}'
            left += '</b>'
            if loc_e:   left += f'<font color="#6b7280">, {loc_e}</font>'

            tbl = Table([[Paragraph(left, S_bold), Paragraph(date_str, S_rgt)]],
                        colWidths=[doc.width*0.72, doc.width*0.28])
            tbl.setStyle(TableStyle([
                ('ALIGN',(1,0),(1,0),'RIGHT'),('VALIGN',(0,0),(-1,-1),'TOP'),
                ('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),1),
                ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
            ]))
            story.append(tbl)

            # Description — plain paragraphs, no bullets (B3)
            desc = exp.get('description') or exp.get('responsibilities') or ''
            if isinstance(desc, list):
                desc = '\n'.join(desc)
            if desc:
                for line in desc.split('\n'):
                    clean = line.strip().lstrip('•-*–—').strip()
                    if clean:
                        story.append(Paragraph(clean, S_body))

            story.append(Spacer(1, 6))

    # ── EDUCATION ─────────────────────────────────────────────────────────────
    if education_list:
        sec_hdr(labels['education'])
        for edu in education_list:
            degree = edu.get('degree') or ''
            field  = edu.get('field') or edu.get('field_of_study') or ''
            inst   = edu.get('institution') or edu.get('institution_name') or ''
            loc_e  = edu.get('location') or ''
            start  = edu.get('startDate') or edu.get('start_date') or ''
            end_e  = edu.get('endDate') or edu.get('end_date') or ''
            date_s = f'{start} – {end_e}' if (start or end_e) else ''

            left = f'<b>{degree}'
            if inst: left += f' | {inst}'
            left += '</b>'
            if field: left += f', {field}'
            if loc_e: left += f' <font color="#6b7280">({loc_e})</font>'

            tbl = Table([[Paragraph(left, S_bold), Paragraph(date_s, S_rgt)]],
                        colWidths=[doc.width*0.72, doc.width*0.28])
            tbl.setStyle(TableStyle([
                ('ALIGN',(1,0),(1,0),'RIGHT'),('VALIGN',(0,0),(-1,-1),'TOP'),
                ('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),1),
                ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
            ]))
            story.append(tbl)
            if edu.get('grade'):
                story.append(Paragraph(f'<font color="#6b7280">Note: {edu["grade"]}</font>', S_gray))
            story.append(Spacer(1, 4))

    # ── SKILLS — B4: categories as subheadings, items as pills ───────────────
    if all_skills:
        sec_hdr(labels['skills'])
        # Group by category
        from collections import OrderedDict
        cat_groups: Dict[str, List[str]] = OrderedDict()
        for sk in all_skills:
            cat = sk.get('category') or ''
            cat_groups.setdefault(cat, []).append(sk['name'])
        for cat, names in cat_groups.items():
            if cat:
                story.append(Paragraph(cat, S_cat))
            story.append(_PillRow([n for n in names if n], primary_hex, doc.width))
            story.append(Spacer(1, 3))

    # ── LANGUAGES — 3 per row ─────────────────────────────────────────────────
    if langs:
        sec_hdr(labels['languages'])
        # Render up to 3 languages per table row
        for i in range(0, len(langs), 3):
            chunk = langs[i:i+3]
            cells = []
            for l in chunk:
                lang_name = l.get('language', '') or ''
                prof      = l.get('proficiency', '') or ''
                cells.append(Paragraph(f'<b>{lang_name}</b>  <font color="#6b7280">{prof}</font>', S_body))
            # Pad to 3 cols
            while len(cells) < 3:
                cells.append(Paragraph('', S_body))
            col_w = doc.width / 3
            tbl = Table([cells], colWidths=[col_w, col_w, col_w])
            tbl.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ]))
            story.append(tbl)

    # ── PROJECTS ──────────────────────────────────────────────────────────────
    if projects:
        sec_hdr(labels['projects'])
        for p in projects:
            pn   = p.get('name','') or ''
            link = p.get('link') or p.get('url') or ''
            txt  = f'<b>{pn}</b>'
            if link: txt += f'  <font color="{primary_hex}">{link}</font>'
            story.append(Paragraph(txt, S_bold))
            if p.get('description'):
                story.append(Paragraph(p['description'], S_body))
            story.append(Spacer(1, 4))

    # ── CERTIFICATIONS — B6 ───────────────────────────────────────────────────
    if certs:
        sec_hdr(labels['certifications'])
        for c in certs:
            cname  = c.get('name','') or ''
            issuer = c.get('issuer','') or ''
            date_c = c.get('issueDate') or c.get('date') or ''
            left   = f'<b>{cname}</b>'
            if issuer: left += f' <font color="#6b7280">— {issuer}</font>'
            tbl = Table([[Paragraph(left, S_body), Paragraph(date_c, S_rgt)]],
                        colWidths=[doc.width*0.75, doc.width*0.25])
            tbl.setStyle(TableStyle([
                ('ALIGN',(1,0),(1,0),'RIGHT'),
                ('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),2),
                ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
            ]))
            story.append(tbl)

    # ── INTERESTS ─────────────────────────────────────────────────────────────
    if interests:
        sec_hdr(labels['interests'])
        story.append(Paragraph('  ·  '.join(interests), S_body))

    # ── CUSTOM SECTIONS — B6 ──────────────────────────────────────────────────
    for cs in custom_secs:
        cs_title   = cs.get('title') or cs.get('name') or ''
        cs_items   = cs.get('items') or []
        cs_content = cs.get('content') or cs.get('text') or ''
        if not cs_title:
            continue
        sec_hdr(cs_title)
        if cs_items:
            for item in cs_items:
                if item:
                    story.append(Paragraph(f'• {item}', S_bullet))
        elif cs_content:
            story.append(Paragraph(cs_content, S_body))

    doc.build(story)
    return buf.getvalue()
