#!/usr/bin/env python3
"""Generate MIN-001_Management_Review_Minutes_Nov2025.pdf"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, grey
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from datetime import datetime

doc = SimpleDocTemplate(
    "/sessions/determined-serene-wozniak/mnt/iso_27001/test_case/MIN-001_Management_Review_Minutes_Nov2025.pdf",
    pagesize=A4,
    rightMargin=15*mm,
    leftMargin=15*mm,
    topMargin=20*mm,
    bottomMargin=15*mm,
)

styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Heading1'],
    fontSize=16,
    textColor=HexColor('#1a1a1a'),
    spaceAfter=6,
    alignment=TA_CENTER,
    fontName='Helvetica-Bold',
)

heading_style = ParagraphStyle(
    'CustomHeading',
    parent=styles['Heading2'],
    fontSize=12,
    textColor=HexColor('#2c3e50'),
    spaceAfter=6,
    spaceBefore=10,
    fontName='Helvetica-Bold',
)

body_style = ParagraphStyle(
    'CustomBody',
    parent=styles['BodyText'],
    fontSize=10,
    alignment=TA_JUSTIFY,
    spaceAfter=6,
)

story = []

# Header
header_data = [
    ['HorseInsure Pty Ltd', 'ABN 41 209 837 156'],
    ['Level 12, 45 Pitt Street, Sydney NSW 2000', ''],
]
header_table = Table(header_data, colWidths=[300, 150])
header_table.setStyle(TableStyle([
    ('ALIGN', (0, 0), (1, 1), 'LEFT'),
    ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (0, 0), 12),
]))
story.append(header_table)
story.append(Spacer(1, 10*mm))

# Title
story.append(Paragraph("MANAGEMENT REVIEW MEETING MINUTES", title_style))
story.append(Spacer(1, 6*mm))

# Meeting details
meta_style = ParagraphStyle('Meta', parent=styles['Normal'], fontSize=9, spaceAfter=3)
story.append(Paragraph(f"<b>Reference:</b> MIN-001", meta_style))
story.append(Paragraph(f"<b>Meeting Date:</b> 20 November 2025", meta_style))
story.append(Paragraph(f"<b>Meeting Time:</b> 10:00 AM - 12:15 PM", meta_style))
story.append(Paragraph(f"<b>Location:</b> Level 12 Boardroom, 45 Pitt Street, Sydney", meta_style))
story.append(Paragraph(f"<b>Minutes Prepared By:</b> Angela Torres, Compliance Manager", meta_style))
story.append(Paragraph(f"<b>Minutes Date:</b> 21 November 2025", meta_style))
story.append(Spacer(1, 6*mm))

# Attendees
story.append(Paragraph("ATTENDEES AND APOLOGIES", heading_style))

attendees_data = [
    ['Name', 'Title', 'Status'],
    ['Margaret Thornton', 'Chief Executive Officer', 'Present'],
    ['David Chen', 'Chief Information Security Officer / CIO', 'Present'],
    ['Sarah Williams', 'Head of IT', 'Present'],
    ['Angela Torres', 'Compliance Manager', 'Present'],
    ['James O\'Brien', 'Head of Human Resources', 'Present'],
    ['Patricia Kumar', 'Head of Claims', 'Present'],
    ['Robert Fitzgerald', 'Head of Underwriting', 'Apologies'],
]

attendees_table = Table(attendees_data, colWidths=[140, 220, 90])
attendees_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2c3e50')),
    ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('GRID', (0, 0), (-1, -1), 1, HexColor('#cccccc')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#f5f5f5'), HexColor('#ffffff')]),
    ('FONTSIZE', (0, 1), (-1, -1), 9),
]))
story.append(attendees_table)
story.append(Spacer(1, 8*mm))

# Meeting content
story.append(Paragraph("AGENDA ITEMS", heading_style))

# Item 1
story.append(Paragraph("<b>1. SECURITY PERFORMANCE METRICS - 2025 Year-to-Date</b>", body_style))
story.append(Paragraph("<b>Owner:</b> David Chen", body_style))
story.append(Paragraph("David Chen presented the security performance dashboard covering January-October 2025. Key metrics discussed:", body_style))
story.append(Paragraph("""
• Security incidents reported: 12 (7 low severity, 3 medium, 2 high)
• Average incident response time: 4.2 hours (target: <4 hours)
• User access certification completion: 94% (Q1 94%, Q2 98%, Q3 75% - gap noted)
• Phishing simulation campaign participation: 89% pass rate (Oct 2025 campaign)
• System vulnerability remediation time: Average 18 days to patch critical vulnerabilities
• Password change compliance: 92% of users updated passwords within 12-month cycle
• Security training completion: 87% of staff completed annual refresher training
""", body_style))
story.append(Paragraph("Discussion: Margaret Thornton requested focus on Q3 access certification gap (noted in recent audit). David Chen to address in agenda item 2.", body_style))
story.append(Spacer(1, 6*mm))

# Item 2
story.append(Paragraph("<b>2. INTERNAL AUDIT FINDINGS REVIEW - October 2025 Audit</b>", body_style))
story.append(Paragraph("<b>Owner:</b> Angela Torres", body_style))
story.append(Paragraph("Angela Torres presented the Internal Audit Report (AUD-001) completed 25 October 2025. The following was discussed:", body_style))
story.append(Paragraph("""
• 3 Major findings identified:
  - Finding AUD-001-MJ-001: Incomplete Q3 2025 access reviews (Target: 30 Nov 2025)
  - Finding AUD-001-MJ-002: Emergency change process not documented (Target: 15 Jan 2026)
  - Finding AUD-001-MJ-003: Three suppliers lack security assessments (Target: 30 Nov 2025)

• 3 Minor findings identified relating to training records and system documentation

• 2 Observations for continuous improvement noted
""", body_style))
story.append(Paragraph("Discussion: Margaret Thornton requested assurance that major findings will be resolved by target dates. Sarah Williams confirmed Q3 access review will commence next week. Angela Torres confirmed supplier assessments underway.", body_style))
story.append(Spacer(1, 6*mm))

# Item 3
story.append(Paragraph("<b>3. RISK REGISTER UPDATES AND EMERGING RISKS</b>", body_style))
story.append(Paragraph("<b>Owner:</b> David Chen", body_style))
story.append(Paragraph("Risk register was reviewed. Current key risks:", body_style))
story.append(Paragraph("""
• Cybersecurity capability maturity in regional offices (Dubbo, Scone) - Medium risk
• Regulatory change exposure (ASIC/APRA guidance on cyber insurance) - Medium risk
• Third-party supplier security - Now Medium-High risk (following audit findings)
• Ransomware attack on claims systems - Ongoing High risk
• Key person dependency (2 IT staff members handling critical infrastructure) - Medium risk
""", body_style))
story.append(Paragraph("No new emerging risks identified. James O'Brien noted recruitment of additional IT staff planned for Q1 2026 to address key person risk.", body_style))
story.append(Spacer(1, 6*mm))

# Page break
story.append(PageBreak())

# Item 4
story.append(Paragraph("<b>4. RESOURCE REQUIREMENTS AND BUDGET ALLOCATION</b>", body_style))
story.append(Paragraph("<b>Owner:</b> Sarah Williams, David Chen", body_style))
story.append(Paragraph("Resource requirements were discussed for remediation of audit findings and ongoing security improvements:", body_style))
story.append(Paragraph("""
• Approval requested: 1 additional IT Security Analyst position (estimated $120k annually)
  Status: Approved by Margaret Thornton, to commence recruitment Q4 2025

• Proposed investment: Enterprise security audit tool (estimated $45k annual subscription)
  Status: Deferred to December management review pending business case

• External consultant engagement: Emergency Change Procedure documentation (3 weeks, est. $15k)
  Status: Approved for procurement (David Chen to manage)

• Capacity: Current team (22 IT staff) stretched with audit remediation plus regular operations
  Impact: Some non-critical projects delayed to Q1 2026
""", body_style))
story.append(Spacer(1, 6*mm))

# Item 5
story.append(Paragraph("<b>5. IMPROVEMENT OPPORTUNITIES AND STRATEGIC INITIATIVES</b>", body_style))
story.append(Paragraph("<b>Owner:</b> David Chen", body_style))
story.append(Paragraph("Discussed potential improvements for 2026:", body_style))
story.append(Paragraph("""
• Cloud security maturity assessment (Azure AD, Microsoft 365 optimization) - Proposed Q1 2026
• Incident response plan full-scale tabletop exercise - Planned for February 2026
• Security awareness campaign refresh (move beyond email training) - Q2 2026 planned
• Automated patch management implementation for SAP Finance - Q1-Q2 2026
• Zero-trust network architecture evaluation (longer term, 2026-2027)
""", body_style))
story.append(Paragraph("Margaret Thornton endorsed the improvements list. David Chen to develop detailed project plans by end of November.", body_style))
story.append(Spacer(1, 8*mm))

# Action Items Table
story.append(PageBreak())
story.append(Paragraph("ACTION ITEMS REGISTER", heading_style))

action_data = [
    ['Action Item', 'Owner', 'Due Date', 'Status', 'From Mtg'],
    ['AUD-001-MJ-001: Complete Q3 2025 access review', 'Sarah Williams', '30 Nov 2025', 'In Progress', 'Nov 2025'],
    ['AUD-001-MJ-002: Develop Emergency Change Procedure', 'David Chen', '15 Jan 2026', 'Not Started', 'Nov 2025'],
    ['AUD-001-MJ-003: Complete supplier security assessments (3 suppliers)', 'Angela Torres', '30 Nov 2025', 'In Progress', 'Nov 2025'],
    ['AUD-001-MN-001: Remediate training records gaps', 'James O\'Brien', '31 Dec 2025', 'In Progress', 'Nov 2025'],
    ['AUD-001-MN-002: Review & update system security standards', 'Sarah Williams', '15 Jan 2026', 'Not Started', 'Nov 2025'],
    ['Incident Response Plan tabletop exercise', 'David Chen', '28 Feb 2026', 'Planning', 'Nov 2025'],
    ['Security awareness campaign refresh', 'James O\'Brien', '30 June 2026', 'Not Started', 'Nov 2025'],
    ['Recruitment: IT Security Analyst position', 'James O\'Brien', '31 Dec 2025', 'In Progress', 'Nov 2025'],
    ['Develop 2026 improvement project plans', 'David Chen', '30 Nov 2025', 'Not Started', 'Nov 2025'],
    ['Aug 2025 Action: Ransomware response plan testing', 'David Chen', '31 Oct 2025', 'Overdue', 'Aug 2025'],
    ['Aug 2025 Action: Windows Server patch management review', 'Sarah Williams', '31 Oct 2025', 'Overdue', 'Aug 2025'],
]

actions_table = Table(action_data, colWidths=[180, 100, 95, 85, 85])
actions_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2c3e50')),
    ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
    ('ALIGN', (0, 0), (0, -1), 'LEFT'),
    ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('GRID', (0, 0), (-1, -1), 1, HexColor('#cccccc')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#f5f5f5'), HexColor('#ffffff')]),
    ('FONTSIZE', (0, 1), (-1, -1), 8),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))
story.append(actions_table)
story.append(Spacer(1, 6*mm))

story.append(Paragraph("<i>Note: Two action items from August 2025 management review remain overdue (ransomware response plan testing and Windows Server patch management review). These will be rescheduled with revised target dates by David Chen and Sarah Williams.</i>", body_style))
story.append(Spacer(1, 8*mm))

# Next meeting
story.append(Paragraph("NEXT MANAGEMENT REVIEW MEETING", heading_style))
story.append(Paragraph("<b>Date:</b> 18 February 2026<br/><b>Time:</b> 10:00 AM<br/><b>Location:</b> Level 12 Boardroom", body_style))
story.append(Spacer(1, 8*mm))

# Sign-off
story.append(Paragraph("APPROVAL", heading_style))
story.append(Paragraph("<b>Prepared by:</b> Angela Torres, Compliance Manager<br/><b>Date prepared:</b> 21 November 2025", body_style))
story.append(Spacer(1, 8*mm))

story.append(Paragraph("<b>Approved by:</b> Margaret Thornton, Chief Executive Officer<br/><b>Date approved:</b> 21 November 2025", body_style))

doc.build(story)
print("Created: MIN-001_Management_Review_Minutes_Nov2025.pdf")
