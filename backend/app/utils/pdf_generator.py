"""
PDF Generator for CV Enhancer
Generates a styled A4 PDF supporting theme (color, font, layout), 
custom sections, interests, and both German and English labels.
"""

from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import Image as RLImage
from typing import Dict, Any, Optional
import os, re

DEFAULT_COLOR = '#1a1a1a'

DEFAULT_LABELS_EN = {
    'summary': 'Profile',
    'experience': 'Professional Experience',
    'education': 'Education',
    'skills': 'Skills',
    'certifications': 'Certifications',
    'languages': 'Languages',
    'projects': 'Projects',
    'interests': 'Interests',
}

DEFAULT_LABELS_DE = {
    'summary': 'Profil',
    'experience': 'Berufserfahrung',
    'education': 'Bildung',
    'skills': 'Fähigkeiten',
    'certifications': 'Zertifikate',
    'languages': 'Sprachen',
    'projects': 'Projekte',
    'interests': 'Interessen',
}


def _hex_to_rl(hexstr: str):
    """Convert a hex color string to a reportlab color."""
    hexstr = hexstr.strip().lstrip('#')
    if len(hexstr) == 3:
        hexstr = ''.join(c*2 for c in hexstr)
    r, g, b = int(hexstr[0:2], 16), int(hexstr[2:4], 16), int(hexstr[4:6], 16)
    return colors.Color(r/255, g/255, b/255)


def _rgba_rl(hexstr: str, alpha=1.0):
    c = _hex_to_rl(hexstr)
    return colors.Color(c.red, c.green, c.blue, alpha)


def _detect_german(cv_data: dict) -> bool:
    """Heuristic: Is this CV predominantly German?"""
    sample = ""
    pi = cv_data.get('personalInfo') or {}
    sample += (pi.get('jobTitle') or '') + ' '
    summary = cv_data.get('summary') or ''
    sample += summary[:400] + ' '
    for exp in (cv_data.get('experience') or [])[:2]:
        sample += (exp.get('description') or '')[:200] + ' '
    sample = sample.lower()

    # Distinctively German words/suffixes unlikely to appear in English text
    german_markers = [
        'erfahrung', 'kenntnisse', 'fähigkeiten', 'verantwortlich',
        'unternehmen', 'tätigkeiten', 'entwicklung', 'aufgaben',
        'bereich', 'mittels', 'wurden', 'wurde', 'habe', 'haben',
        'leitung', 'planung', 'umsetzung', 'werkzeug', 'arbeit',
        'datenbankadministrator', 'softwareentwickler', 'ingenieur',
    ]
    score = sum(1 for w in german_markers if w in sample)
    return score >= 2


def flatten_skills(skills) -> list:
    """Normalize skills: handle list of strings, list of dicts, or dict of categories."""
    if not skills:
        return []
    if isinstance(skills, list):
        return [s if isinstance(s, str) else (s.get('name') or '') for s in skills if s]
    if isinstance(skills, dict):
        result = []
        for cat, items in skills.items():
            if isinstance(items, list):
                result.append(f"  {cat}:  " + '  ·  '.join(
                    (s if isinstance(s, str) else s.get('name', '')) for s in items if s
                ))
        return [r for r in result if r.strip()]
    return []


def generate_cv_pdf(
    cv_data: Dict[str, Any],
    title: str = "CV",
    theme: Optional[Dict[str, Any]] = None,
) -> bytes:
    """Generate a PDF from CV data and return bytes.
    
    cv_data keys accepted:
      personalInfo / personal_info — personal details dict
      summary / profile_summary   — profile text
      experience / experiences    — list of experience dicts
      education / educations      — list of education dicts
      skills                      — list or dict
      certifications               — list of cert dicts
      languages                   — list of language dicts
      projects                    — list of project dicts
      interests                   — list of strings or dicts
      custom_sections             — list of {title, content} dicts
      sectionLabels               — override label names
    """
    theme = theme or {}
    primary_hex = theme.get('primaryColor') or DEFAULT_COLOR
    layout = theme.get('layout', 'clean')

    PRIMARY = _hex_to_rl(primary_hex)
    PRIMARY_LIGHT = _rgba_rl(primary_hex, 0.15)
    GRAY = colors.HexColor('#6b7280')
    TEXT = colors.HexColor('#1a1a1a')

    buffer = BytesIO()

    # ----- Normalize input keys -----
    pi = cv_data.get('personalInfo') or cv_data.get('personal_info') or {}
    name = pi.get('name') or pi.get('full_name') or cv_data.get('full_name') or 'Your Name'
    job_headline = pi.get('title') or pi.get('jobTitle') or cv_data.get('title') or ''
    email = pi.get('email') or cv_data.get('email') or ''
    phone = pi.get('phone') or cv_data.get('phone') or ''
    location = pi.get('location') or cv_data.get('location') or ''
    linkedin = pi.get('linkedin') or pi.get('linkedin_url') or cv_data.get('linkedin_url') or ''
    website = pi.get('website') or ''
    summary = pi.get('summary') or cv_data.get('summary') or cv_data.get('profile_summary') or ''

    experiences = cv_data.get('experience') or cv_data.get('experiences') or []
    education_list = cv_data.get('education') or cv_data.get('educations') or []
    raw_skills = cv_data.get('skills') or []
    skills_flat = flatten_skills(raw_skills)
    certs = cv_data.get('certifications') or []
    langs = cv_data.get('languages') or []
    projects = cv_data.get('projects') or []
    raw_interests = cv_data.get('interests') or []
    interests = [
        (i if isinstance(i, str) else i.get('name') or i.get('interest') or '')
        for i in raw_interests if i
    ]
    interests = [i for i in interests if i]
    custom_sections = cv_data.get('custom_sections') or []

    # Language detection for labels
    is_german = _detect_german(cv_data)
    base_labels = DEFAULT_LABELS_DE if is_german else DEFAULT_LABELS_EN
    labels = {**base_labels, **(cv_data.get('sectionLabels') or {})}

    # ----- Document -----
    is_modern_sidebar = (layout == 'modern')
    margin = 1.6 * cm

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=margin if not is_modern_sidebar else 0,
        rightMargin=margin if not is_modern_sidebar else 0,
        topMargin=0,
        bottomMargin=1.4 * cm,
        title=title,
    )

    styles = getSampleStyleSheet()

    def s(name_s, **kw):
        base = kw.pop('base', 'Normal')
        return ParagraphStyle(name_s, parent=styles[base], **kw)

    # Common styles
    body_style  = s('CVBody',     fontSize=8.5, textColor=TEXT, leading=13, spaceAfter=2)
    sub_style   = s('CVSub',     fontSize=8, textColor=GRAY, leading=12)
    bullet_s    = s('CVBullet',  fontSize=8.5, textColor=TEXT, leading=13, leftIndent=10)

    story = []

    # =======================================================================
    # CLEAN LAYOUT (default, matches German reference CV)
    # =======================================================================
    if layout in ('clean', 'minimal', 'executive'):
        name_style = s('CVName', fontSize=20 if layout=='clean' else 18, textColor=TEXT, fontName='Helvetica-Bold', leading=24, spaceAfter=1)
        title_style_p = s('CVTitleP', fontSize=10, textColor=GRAY, fontName='Helvetica', leading=14, spaceAfter=6)
        contact_style_p = s('CVContactP', fontSize=7.5, textColor=GRAY, fontName='Helvetica', leading=11)
        section_s = s('CVSection', fontSize=8.5, textColor=TEXT, fontName='Helvetica-Bold', spaceAfter=1, spaceBefore=6)

        def section_header(label):
            story.append(Spacer(1, 6))
            story.append(Paragraph(f'<b>{label.upper()}</b>', section_s))
            story.append(HRFlowable(width='100%', thickness=1.5, color=_hex_to_rl(primary_hex), spaceAfter=5))

        # ── Header (name + photo row) ──
        contact_parts = []
        if email:    contact_parts.append(f'✉  {email}')
        if phone:    contact_parts.append(f'✆  {phone}')
        if location: contact_parts.append(f'📍  {location}')
        if linkedin: contact_parts.append(f'in  {linkedin}')
        if website:  contact_parts.append(f'🔗  {website}')
        contact_line = '    |    '.join(contact_parts)

        story.append(Spacer(1, 12))
        story.append(Paragraph(name, name_style))
        if job_headline:
            story.append(Paragraph(job_headline, title_style_p))
        if contact_line:
            story.append(Paragraph(contact_line, contact_style_p))
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width='100%', thickness=2, color=TEXT, spaceAfter=12))

        # ── Body sections ──
        if summary:
            section_header(labels['summary'])
            story.append(Paragraph(summary, body_style))

        if experiences:
            section_header(labels['experience'])
            for exp in experiences:
                role = exp.get('role') or exp.get('position') or exp.get('job_title') or ''
                company = exp.get('company') or ''
                loc_e = exp.get('location') or ''
                start = exp.get('startDate') or ''
                end = ('Heute' if is_german else 'Present') if exp.get('current') else (exp.get('endDate') or '')
                date_str = f'{start} – {end}' if (start or end) else ''
                left_p = f'<b>{role}</b>'
                if company: left_p += f', {company}'
                if loc_e:   left_p += f' <font color="#6b7280">— {loc_e}</font>'
                row = [[Paragraph(left_p, body_style), Paragraph(date_str, sub_style)]]
                t = Table(row, colWidths=[doc.width * 0.73, doc.width * 0.27])
                t.setStyle(TableStyle([('ALIGN', (1,0), (1,0), 'RIGHT'), ('VALIGN', (0,0), (-1,-1), 'TOP'), ('TOPPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 1)]))
                story.append(t)
                desc = exp.get('description') or exp.get('responsibilities') or ''
                if desc:
                    for line in desc.split('\n'):
                        line = line.strip().lstrip('•-').strip()
                        if line:
                            story.append(Paragraph(f'• {line}', bullet_s))
                story.append(Spacer(1, 5))

        if education_list:
            section_header(labels['education'])
            for edu in education_list:
                degree = edu.get('degree') or ''
                field = edu.get('field') or edu.get('field_of_study') or ''
                inst = edu.get('institution') or edu.get('institution_name') or ''
                start = edu.get('startDate') or ''
                end_e = edu.get('endDate') or ''
                date_str = f'{start} – {end_e}' if (start or end_e) else ''
                deg_s = f'<b>{degree}</b>'
                if field: deg_s += f' – {field}'
                if inst:  deg_s += f', {inst}'
                row = [[Paragraph(deg_s, body_style), Paragraph(date_str, sub_style)]]
                t = Table(row, colWidths=[doc.width * 0.73, doc.width * 0.27])
                t.setStyle(TableStyle([('ALIGN', (1,0), (1,0), 'RIGHT'), ('VALIGN', (0,0), (-1,-1), 'TOP'), ('TOPPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 2)]))
                story.append(t)
                if edu.get('grade'):
                    story.append(Paragraph(f'<font color="#6b7280">Note: {edu["grade"]}</font>', sub_style))
                story.append(Spacer(1, 4))

        if skills_flat:
            section_header(labels['skills'])
            for skill_line in skills_flat:
                story.append(Paragraph(skill_line.strip(), body_style))
            story.append(Spacer(1, 2))

        if langs:
            section_header(labels['languages'])
            for l in langs:
                row = [[Paragraph(f'<b>{l.get("language","")}</b>', body_style), Paragraph(l.get('proficiency',''), sub_style)]]
                t = Table(row, colWidths=[doc.width * 0.5, doc.width * 0.5])
                t.setStyle(TableStyle([('ALIGN', (1,0), (1,0), 'RIGHT'), ('TOPPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 2)]))
                story.append(t)

        if interests:
            section_header(labels['interests'])
            story.append(Paragraph('  ·  '.join(interests), body_style))

        if projects:
            section_header(labels['projects'])
            for p in projects:
                p_title = f'<b>{p.get("name","")}</b>'
                link = p.get('link') or p.get('url') or ''
                if link: p_title += f'  <font color="{primary_hex}">{link}</font>'
                story.append(Paragraph(p_title, body_style))
                if p.get('description'):
                    story.append(Paragraph(p['description'], sub_style))
                story.append(Spacer(1, 4))

        if certs:
            section_header(labels['certifications'])
            for c in certs:
                left_c = f'<b>{c.get("name","")}</b>'
                if c.get('issuer'): left_c += f' <font color="#6b7280">— {c["issuer"]}</font>'
                date_c = c.get('issueDate') or c.get('date') or ''
                row = [[Paragraph(left_c, body_style), Paragraph(date_c, sub_style)]]
                t = Table(row, colWidths=[doc.width * 0.73, doc.width * 0.27])
                t.setStyle(TableStyle([('ALIGN', (1,0), (1,0), 'RIGHT'), ('TOPPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 2)]))
                story.append(t)

        # Custom sections
        for cs in custom_sections:
            cs_title = cs.get('title') or cs.get('name') or 'Section'
            cs_content = cs.get('content') or cs.get('text') or ''
            if cs_title and cs_content:
                section_header(cs_title)
                story.append(Paragraph(cs_content, body_style))

    # =======================================================================
    # CLASSIC LAYOUT  (colored header banner)
    # =======================================================================
    else:
        name_style  = s('CVName2', fontSize=20, textColor=colors.white, fontName='Helvetica-Bold', leading=24, spaceAfter=2)
        title_style2 = s('CVTitle2', fontSize=10, textColor=_rgba_rl('#ffffff', 0.85), fontName='Helvetica', leading=14)
        contact_s2  = s('CVContact2', fontSize=7.5, textColor=_rgba_rl('#ffffff', 0.9), fontName='Helvetica', leading=11)
        section_s2  = s('CVSection2', fontSize=8.5, textColor=PRIMARY, fontName='Helvetica-Bold', spaceAfter=2, spaceBefore=8)

        def section_header(label):
            story.append(Spacer(1, 4))
            story.append(Paragraph(f'<font color="{primary_hex}"><b>{label.upper()}</b></font>', section_s2))
            story.append(HRFlowable(width='100%', thickness=0.5, color=PRIMARY, spaceAfter=4))

        # ── Colored header ──
        contact_parts = []
        if email:    contact_parts.append(f'✉  {email}')
        if phone:    contact_parts.append(f'✆  {phone}')
        if location: contact_parts.append(f'⌖  {location}')
        if linkedin: contact_parts.append(f'in  {linkedin}')
        if website:  contact_parts.append(f'🔗  {website}')
        contact_line = '    |    '.join(contact_parts)

        header_content = [Paragraph(name, name_style)]
        if job_headline: header_content.append(Paragraph(job_headline, title_style2))
        if contact_line: header_content.append(Paragraph(contact_line, contact_s2))

        header_table = Table([[p] for p in header_content], colWidths=[doc.width + 2*margin])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), PRIMARY),
            ('TOPPADDING', (0,0), (-1,0), 16),
            ('BOTTOMPADDING', (0,-1), (-1,-1), 14),
            ('LEFTPADDING', (0,0), (-1,-1), 18),
            ('RIGHTPADDING', (0,0), (-1,-1), 18),
            ('TOPPADDING', (0,1), (-1,-1), 2),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 10))

        # Body — reuse clean renderer with classic labels
        if summary:
            section_header(labels['summary'])
            story.append(Paragraph(summary, body_style))

        if experiences:
            section_header(labels['experience'])
            for exp in experiences:
                role = exp.get('role') or exp.get('position') or exp.get('job_title') or ''
                company = exp.get('company') or ''
                loc_e = exp.get('location') or ''
                start = exp.get('startDate') or ''
                end_x = ('Present') if exp.get('current') else (exp.get('endDate') or '')
                date_str = f'{start} – {end_x}' if (start or end_x) else ''
                left_p = f'<b>{role}</b>'
                if company: left_p += f' <font color="{primary_hex}"><b>· {company}</b></font>'
                if loc_e:   left_p += f' <font color="#6b7280">— {loc_e}</font>'
                row = [[Paragraph(left_p, body_style), Paragraph(date_str, sub_style)]]
                t = Table(row, colWidths=[doc.width*0.73, doc.width*0.27])
                t.setStyle(TableStyle([('ALIGN',(1,0),(1,0),'RIGHT'),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),1)]))
                story.append(t)
                desc = exp.get('description') or ''
                if desc:
                    for line in desc.split('\n'):
                        line = line.strip().lstrip('•-').strip()
                        if line: story.append(Paragraph(f'• {line}', bullet_s))
                story.append(Spacer(1, 5))

        if education_list:
            section_header(labels['education'])
            for edu in education_list:
                degree = edu.get('degree') or ''
                field = edu.get('field') or ''
                inst = edu.get('institution') or ''
                start = edu.get('startDate') or ''
                end_e = edu.get('endDate') or ''
                date_str = f'{start} – {end_e}' if (start or end_e) else ''
                deg_s = f'<b>{degree}</b>'
                if field: deg_s += f' in {field}'
                if inst:  deg_s += f' <font color="{primary_hex}"><b>· {inst}</b></font>'
                row = [[Paragraph(deg_s, body_style), Paragraph(date_str, sub_style)]]
                t = Table(row, colWidths=[doc.width*0.73, doc.width*0.27])
                t.setStyle(TableStyle([('ALIGN',(1,0),(1,0),'RIGHT'),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),2)]))
                story.append(t)
                if edu.get('grade'):
                    story.append(Paragraph(f'<font color="#6b7280">Grade: {edu["grade"]}</font>', sub_style))
                story.append(Spacer(1, 4))

        if skills_flat:
            section_header(labels['skills'])
            for sl in skills_flat: story.append(Paragraph(sl.strip(), body_style))

        if langs:
            section_header(labels['languages'])
            for l in langs:
                row = [[Paragraph(f'<b>{l.get("language","")}</b>', body_style), Paragraph(l.get('proficiency',''), sub_style)]]
                t = Table(row, colWidths=[doc.width*0.5, doc.width*0.5])
                t.setStyle(TableStyle([('ALIGN',(1,0),(1,0),'RIGHT'),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),2)]))
                story.append(t)

        if interests:
            section_header(labels['interests'])
            story.append(Paragraph('  ·  '.join(interests), body_style))

        if certs:
            section_header(labels['certifications'])
            for c in certs:
                left_c = f'<b>{c.get("name","")}</b>'
                if c.get('issuer'): left_c += f' <font color="#6b7280">— {c["issuer"]}</font>'
                row = [[Paragraph(left_c, body_style), Paragraph(c.get('issueDate') or c.get('date',''), sub_style)]]
                t = Table(row, colWidths=[doc.width*0.73, doc.width*0.27])
                t.setStyle(TableStyle([('ALIGN',(1,0),(1,0),'RIGHT'),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),2)]))
                story.append(t)

        if projects:
            section_header(labels['projects'])
            for p in projects:
                p_title = f'<b>{p.get("name","")}</b>'
                link = p.get('link') or p.get('url') or ''
                if link: p_title += f'  <font color="{primary_hex}">{link}</font>'
                story.append(Paragraph(p_title, body_style))
                if p.get('description'): story.append(Paragraph(p['description'], sub_style))
                story.append(Spacer(1, 4))

        for cs in custom_sections:
            cs_title = cs.get('title') or cs.get('name') or 'Section'
            cs_content = cs.get('content') or cs.get('text') or ''
            if cs_title and cs_content:
                section_header(cs_title)
                story.append(Paragraph(cs_content, body_style))

    doc.build(story)
    return buffer.getvalue()
