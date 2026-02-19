"""
PDF Generator for CV Enhancer
Uses reportlab to produce a styled A4 PDF from CV parsed_data.
"""

from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from typing import Dict, Any

# Brand color
RED = colors.HexColor('#be123c')
RED_LIGHT = colors.HexColor('#fecdd3')
TEXT = colors.HexColor('#1a1a1a')
GRAY = colors.HexColor('#6b7280')
BORDER = colors.HexColor('#e5e7eb')

DEFAULT_LABELS = {
    'summary': 'Profile',
    'experience': 'Professional Experience',
    'education': 'Education',
    'skills': 'Skills',
    'certifications': 'Certifications',
    'languages': 'Languages',
    'projects': 'Projects',
}


def generate_cv_pdf(cv_data: Dict[str, Any], title: str = "CV") -> bytes:
    """Generate a PDF from CV parsed_data and return bytes."""
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=0,
        bottomMargin=1.5 * cm,
        title=title,
    )

    styles = getSampleStyleSheet()
    labels = {**DEFAULT_LABELS, **(cv_data.get('sectionLabels') or {})}

    # ── Custom paragraph styles ──────────────────────────────
    def s(name, **kw):
        base = kw.pop('base', 'Normal')
        return ParagraphStyle(name, parent=styles[base], **kw)

    name_style = s('CVName', fontSize=20, textColor=colors.white, fontName='Helvetica-Bold', leading=24, spaceAfter=2)
    title_style = s('CVTitle', fontSize=10, textColor=colors.HexColor('#fecdd3'), fontName='Helvetica', leading=14)
    contact_style = s('CVContact', fontSize=7.5, textColor=colors.HexColor('#fde8ec'), fontName='Helvetica', leading=11)
    section_style = s('CVSection', fontSize=8.5, textColor=RED, fontName='Helvetica-Bold', spaceAfter=2, spaceBefore=8,
                       textTransform='uppercase' if hasattr(ParagraphStyle, 'textTransform') else None)
    body_style = s('CVBody', fontSize=8.5, textColor=TEXT, leading=13, spaceAfter=2)
    job_title_style = s('CVJobTitle', fontSize=9, textColor=TEXT, fontName='Helvetica-Bold', leading=13)
    sub_style = s('CVSub', fontSize=8, textColor=GRAY, leading=12)
    bullet_style = s('CVBullet', fontSize=8.5, textColor=TEXT, leading=13, leftIndent=10, bulletIndent=0)

    story = []

    # ── HEADER (red block) ───────────────────────────────────
    pi = cv_data.get('personalInfo') or {}
    name = pi.get('name') or 'Your Name'
    job_headline = pi.get('jobTitle') or ''

    contact_parts = []
    if pi.get('email'): contact_parts.append(f"✉  {pi['email']}")
    if pi.get('phone'): contact_parts.append(f"✆  {pi['phone']}")
    if pi.get('location'): contact_parts.append(f"⌖  {pi['location']}")
    if pi.get('linkedin'): contact_parts.append(f"in  {pi['linkedin']}")
    if pi.get('website'): contact_parts.append(f"🔗  {pi['website']}")
    contact_line = '    |    '.join(contact_parts) if contact_parts else ''

    header_data = []
    header_data.append([Paragraph(name, name_style)])
    if job_headline:
        header_data.append([Paragraph(job_headline, title_style)])
    if contact_line:
        header_data.append([Paragraph(contact_line, contact_style)])

    header_table = Table([[row[0]] for row in header_data], colWidths=[doc.width])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), RED),
        ('TOPPADDING', (0, 0), (-1, 0), 14),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
        ('TOPPADDING', (0, 1), (-1, -1), 2),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))

    def section_header(label):
        story.append(Spacer(1, 4))
        story.append(Paragraph(f'<font color="#be123c"><b>{label.upper()}</b></font>', body_style))
        story.append(HRFlowable(width='100%', thickness=0.5, color=RED_LIGHT, spaceAfter=4))

    # ── SUMMARY ─────────────────────────────────────────────
    summary = cv_data.get('summary') or ''
    if summary:
        section_header(labels.get('summary', 'Profile'))
        story.append(Paragraph(summary, body_style))

    # ── EXPERIENCE ──────────────────────────────────────────
    experiences = cv_data.get('experience') or []
    if experiences:
        section_header(labels.get('experience', 'Professional Experience'))
        for exp in experiences:
            role = exp.get('role') or ''
            company = exp.get('company') or ''
            location = exp.get('location') or ''
            start = exp.get('startDate') or ''
            end = 'Present' if exp.get('current') else (exp.get('endDate') or '')
            date_str = f"{start} – {end}" if start or end else ''
            left = f"<b>{role}</b>"
            if company: left += f" <font color='#be123c'><b>· {company}</b></font>"
            if location: left += f" <font color='#6b7280'> — {location}</font>"
            row_data = [[Paragraph(left, body_style), Paragraph(date_str, sub_style)]]
            t = Table(row_data, colWidths=[doc.width * 0.72, doc.width * 0.28])
            t.setStyle(TableStyle([('ALIGN', (1, 0), (1, 0), 'RIGHT'), ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 1)]))
            story.append(t)
            desc = exp.get('description') or ''
            if desc:
                for line in desc.split('\n'):
                    line = line.strip().lstrip('•-').strip()
                    if line:
                        story.append(Paragraph(f"• {line}", bullet_style))
            story.append(Spacer(1, 5))

    # ── EDUCATION ───────────────────────────────────────────
    education = cv_data.get('education') or []
    if education:
        section_header(labels.get('education', 'Education'))
        for edu in education:
            degree = edu.get('degree') or ''
            field = edu.get('field') or ''
            institution = edu.get('institution') or ''
            start = edu.get('startDate') or ''
            end = edu.get('endDate') or ''
            date_str = f"{start} – {end}" if start or end else ''
            deg_str = f"<b>{degree}</b>"
            if field: deg_str += f" in {field}"
            if institution: deg_str += f" <font color='#be123c'><b>· {institution}</b></font>"
            row_data = [[Paragraph(deg_str, body_style), Paragraph(date_str, sub_style)]]
            t = Table(row_data, colWidths=[doc.width * 0.72, doc.width * 0.28])
            t.setStyle(TableStyle([('ALIGN', (1, 0), (1, 0), 'RIGHT'), ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 1)]))
            story.append(t)
            if edu.get('grade'):
                story.append(Paragraph(f"<font color='#6b7280'>Grade: {edu['grade']}</font>", sub_style))
            story.append(Spacer(1, 4))

    # ── SKILLS ──────────────────────────────────────────────
    skills = [s for s in (cv_data.get('skills') or []) if s]
    if skills:
        section_header(labels.get('skills', 'Skills'))
        skills_text = '  ·  '.join(skills)
        story.append(Paragraph(skills_text, body_style))

    # ── CERTIFICATIONS ──────────────────────────────────────
    certs = cv_data.get('certifications') or []
    if certs:
        section_header(labels.get('certifications', 'Certifications'))
        for c in certs:
            left = f"<b>{c.get('name', '')}</b>"
            if c.get('issuer'): left += f" <font color='#6b7280'>— {c['issuer']}</font>"
            row_data = [[Paragraph(left, body_style), Paragraph(c.get('date', ''), sub_style)]]
            t = Table(row_data, colWidths=[doc.width * 0.72, doc.width * 0.28])
            t.setStyle(TableStyle([('ALIGN', (1, 0), (1, 0), 'RIGHT'), ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 2)]))
            story.append(t)

    # ── LANGUAGES ───────────────────────────────────────────
    langs = cv_data.get('languages') or []
    if langs:
        section_header(labels.get('languages', 'Languages'))
        for l in langs:
            row_data = [[Paragraph(f"<b>{l.get('language', '')}</b>", body_style), Paragraph(l.get('proficiency', ''), sub_style)]]
            t = Table(row_data, colWidths=[doc.width * 0.5, doc.width * 0.5])
            t.setStyle(TableStyle([('ALIGN', (1, 0), (1, 0), 'RIGHT'), ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 2)]))
            story.append(t)

    # ── PROJECTS ────────────────────────────────────────────
    projects = cv_data.get('projects') or []
    if projects:
        section_header(labels.get('projects', 'Projects'))
        for p in projects:
            name_str = f"<b>{p.get('name', '')}</b>"
            if p.get('url'): name_str += f"  <font color='#be123c'>{p['url']}</font>"
            story.append(Paragraph(name_str, body_style))
            if p.get('description'):
                story.append(Paragraph(p['description'], sub_style))
            story.append(Spacer(1, 4))

    doc.build(story)
    return buffer.getvalue()
