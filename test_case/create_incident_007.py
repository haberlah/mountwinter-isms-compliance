#!/usr/bin/env python3
"""Generate INC-2025-007_Security_Incident_Report.pdf - INCOMPLETE REPORT"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY

doc = SimpleDocTemplate(
    "/sessions/determined-serene-wozniak/mnt/iso_27001/test_case/INC-2025-007_Security_Incident_Report.pdf",
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
    fontSize=11,
    textColor=HexColor('#2c3e50'),
    spaceAfter=6,
    fontName='Helvetica-Bold',
)

meta_style = ParagraphStyle('Meta', parent=styles['Normal'], fontSize=9, spaceAfter=3)
body_style = ParagraphStyle('Body', parent=styles['BodyText'], fontSize=10, spaceAfter=6, alignment=TA_JUSTIFY)

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
story.append(Paragraph("SECURITY INCIDENT REPORT", title_style))
story.append(Spacer(1, 6*mm))

# Incident details box
incident_data = [
    ['Report Reference', 'INC-2025-007'],
    ['Incident Type', 'Unauthorised Physical Access'],
    ['Severity Level', 'MEDIUM'],
    ['Date Detected', '8 September 2025, 02:15 PM'],
    ['Report Date', '8 September 2025'],
    ['Reporting Officer', 'Tom Bradley, Facilities Manager'],
    ['Systems Affected', 'Scone warehouse server room'],
]

incident_table = Table(incident_data, colWidths=[180, 280])
incident_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, -1), HexColor('#ececec')),
    ('TEXTCOLOR', (0, 0), (0, -1), HexColor('#2c3e50')),
    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('GRID', (0, 0), (-1, -1), 1, HexColor('#cccccc')),
    ('ALIGN', (0, 0), (0, -1), 'LEFT'),
    ('ALIGN', (1, 0), (1, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]))
story.append(incident_table)
story.append(Spacer(1, 8*mm))

# Incident Description
story.append(Paragraph("INCIDENT DESCRIPTION", heading_style))
desc_text = """During routine physical security inspection of the Scone warehouse facility on 8 September 2025, Tom Bradley (Facilities Manager) discovered that the server room door was propped open with a doorstop. The door was secured with a magnetic lock that requires authorised access, but the magnetic lock was disengaged and door held open. Server room contains network equipment, backup storage and archive systems for regional office operations."""
story.append(Paragraph(desc_text, body_style))
story.append(Spacer(1, 6*mm))

# Detection
story.append(Paragraph("DETECTION AND INITIAL RESPONSE", heading_style))
story.append(Paragraph("<b>How Detected:</b> Tom Bradley discovered the propped-open door during routine facilities inspection at 02:15 PM on 8 September 2025.", body_style))
story.append(Paragraph("<b>Time to Detect:</b> Unknown - door could have been propped open for several hours or days prior to discovery", body_style))
story.append(Paragraph("<b>Immediate Actions Taken:</b>", body_style))
story.append(Paragraph("""
• 02:15 PM: Door was secured and magnetic lock tested as functional
• 02:30 PM: Tom Bradley photographed access point and reported to David Chen
• 02:45 PM: Server room physical inspection conducted - no visible equipment tampering observed
• 03:00 PM: Access logs requested from security system for review
""", body_style))
story.append(Spacer(1, 6*mm))

# Affected Systems
story.append(Paragraph("AFFECTED SYSTEMS AND INITIAL ASSESSMENT", heading_style))

systems_data = [
    ['System/Equipment', 'Status', 'Notes'],
    ['Backup Storage Array', 'Intact', 'No visible tampering; seals appear undisturbed'],
    ['Network Equipment', 'Intact', 'Inspection shows no disconnected cables or signs of access'],
    ['Archive Server', 'Intact', 'Location: Locked cabinet within server room; locked status confirmed'],
    ['Cooling Systems', 'Functional', 'HVAC operational; no interruptions noted'],
]

systems_table = Table(systems_data, colWidths=[140, 90, 240])
systems_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2c3e50')),
    ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('GRID', (0, 0), (-1, -1), 1, HexColor('#cccccc')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#f5f5f5'), HexColor('#ffffff')]),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
]))
story.append(systems_table)
story.append(Spacer(1, 6*mm))

# Containment
story.append(Paragraph("CONTAINMENT ACTIONS", heading_style))
story.append(Paragraph("""
• Server room door secured and lock functionality verified: 8 September 2025, 02:15 PM
• Physical inspection of equipment and seals completed: 8 September 2025, 03:00 PM
• Access control system log review initiated: 8 September 2025, 03:30 PM
• Alert issued to Scone warehouse staff regarding door access procedures: 8 September 2025, 04:00 PM
""", body_style))
story.append(Spacer(1, 8*mm))

# Root Cause - INCOMPLETE
story.append(Paragraph("ROOT CAUSE ANALYSIS", heading_style))
story.append(Paragraph("<i>[SECTION INCOMPLETE - To be completed by David Chen and Liam Foster]</i>", body_style))
story.append(Spacer(1, 6*mm))

# Recommendations - INCOMPLETE STUB
story.append(Paragraph("RECOMMENDATIONS AND REMEDIATION ACTIONS", heading_style))
story.append(Paragraph("<i>[SECTION INCOMPLETE - Recommendations pending root cause determination]</i>", body_style))
story.append(Spacer(1, 6*mm))

# Lessons Learned - MISSING
story.append(Paragraph("FOLLOW-UP ACTIONS REQUIRED", heading_style))
story.append(Paragraph("""
<i>The following analysis and documentation remain outstanding:</i><br/>
• Root cause determination: Why was the door propped open? (Deliberate, accidental, maintenance-related?)
• Complete timeline reconstruction: Access control system log analysis to determine duration door was unlocked
• Lessons learned and preventive recommendations
• Assessment of whether further investigation or external audit required
• Regulatory reporting assessment (ASIC notification if applicable)
• Incident sign-off and approval
""", body_style))
story.append(Spacer(1, 10*mm))

# Status note
story.append(Paragraph("INCIDENT STATUS", heading_style))
story.append(Paragraph("""
<b>Current Status:</b> UNDER INVESTIGATION<br/>
<b>Last Updated:</b> 8 September 2025, 04:00 PM<br/>
<b>Owner:</b> David Chen (CIO/CISO)<br/>
<i>This report is incomplete and awaiting final investigation and closure documentation.</i>
""", body_style))

doc.build(story)
print("Created: INC-2025-007_Security_Incident_Report.pdf (INCOMPLETE)")
