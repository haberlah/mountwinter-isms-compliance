#!/usr/bin/env python3
"""Generate CAR-001_Corrective_Action_Log.pdf"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER

doc = SimpleDocTemplate(
    "/sessions/determined-serene-wozniak/mnt/iso_27001/test_case/CAR-001_Corrective_Action_Log.pdf",
    pagesize=A4,
    rightMargin=12*mm,
    leftMargin=12*mm,
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
body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=9, spaceAfter=3)

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
story.append(Paragraph("CORRECTIVE ACTION REGISTER", title_style))
story.append(Spacer(1, 4*mm))

story.append(Paragraph(f"<b>Register Reference:</b> CAR-001", meta_style))
story.append(Paragraph(f"<b>Last Updated:</b> 25 November 2025", meta_style))
story.append(Paragraph(f"<b>Compiled By:</b> Angela Torres, Compliance Manager", meta_style))
story.append(Spacer(1, 8*mm))

# Summary
summary_data = [
    ['Status', 'Count'],
    ['Closed', '5'],
    ['In Progress', '6'],
    ['Overdue', '3'],
    ['Total', '14'],
]
summary_table = Table(summary_data, colWidths=[150, 100])
summary_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2c3e50')),
    ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('GRID', (0, 0), (-1, -1), 1, HexColor('#cccccc')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#f5f5f5'), HexColor('#ffffff')]),
]))
story.append(summary_table)
story.append(Spacer(1, 8*mm))

# Corrective actions table
car_data = [
    ['CAR ID', 'Source', 'Description', 'Owner', 'Raised', 'Target', 'Status', 'Closed'],
    ['CAR-2025-001', 'Incident', 'Implement MFA for admin accounts', 'David Chen', '15-Jan', '31-Mar', 'Closed', '27-Mar'],
    ['CAR-2025-002', 'Audit', 'Document password policy', 'Sarah Williams', '20-Jan', '28-Feb', 'Closed', '15-Feb'],
    ['CAR-2025-003', 'Review', 'Update incident response plan', 'David Chen', '10-Feb', '30-Apr', 'In Progress', ''],
    ['CAR-2025-004', 'Incident', 'Email gateway security update', 'Sarah Williams', '18-Feb', '31-Mar', 'Closed', '25-Mar'],
    ['CAR-2025-005', 'Audit', 'Firewall rule review quarterly', 'Liam Foster', '22-Feb', '30-June', 'In Progress', ''],
    ['CAR-2025-006', 'Management', 'VPN access logging enhancement', 'Marcus Lee', '05-Mar', '30-Apr', 'In Progress', ''],
    ['CAR-2025-007', 'Incident', 'Phishing response procedure', 'David Chen', '15-Mar', '30-Apr', 'Overdue', ''],
    ['CAR-2025-008', 'Audit', 'System backup testing schedule', 'Liam Foster', '01-Apr', '31-May', 'In Progress', ''],
    ['CAR-2025-009', 'Review', 'Secure document disposal', 'Tom Bradley', '12-Apr', '30-June', 'Overdue', ''],
    ['CAR-2025-010', 'Management', 'Third-party risk assessment', 'Angela Torres', '20-April', '30-Nov', 'In Progress', ''],
    ['CAR-2025-011', 'Incident', 'Database access controls review', 'Sarah Williams', '08-May', '31-Aug', 'Closed', ''],
    ['CAR-2025-012', 'Audit', 'Training records centralisation', 'James O\'Brien', '25-May', '30-Sept', 'Overdue', ''],
    ['CAR-2025-013', 'Incident', 'USB policy enforcement', 'Marcus Lee', '03-June', '30-July', 'Closed', ''],
    ['CAR-2025-014', 'Management', 'Disaster recovery drill', 'David Chen', '18-June', '31-Oct', 'Closed', ''],
]

car_table = Table(car_data, colWidths=[70, 55, 110, 85, 50, 50, 75, 60])
car_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2c3e50')),
    ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 8),
    ('FONTSIZE', (0, 1), (-1, -1), 8),
    ('GRID', (0, 0), (-1, -1), 1, HexColor('#cccccc')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#f5f5f5'), HexColor('#ffffff')]),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('ALIGN', (2, 0), (2, -1), 'LEFT'),
    ('ALIGN', (3, 0), (3, -1), 'LEFT'),
]))
story.append(car_table)
story.append(Spacer(1, 8*mm))

# Notes section
story.append(Paragraph("NOTES ON OUTSTANDING ACTIONS", heading_style))

notes_text = """
<b>Overdue Actions (Require Immediate Attention):</b><br/>
• CAR-2025-007 (Phishing response procedure): Originally due 30 April 2025. David Chen to reschedule target to 15 December 2025. Delay attributed to resource constraints following incident response to high-severity phishing attack (INC-2025-003).<br/>
• CAR-2025-009 (Secure document disposal): Originally due 30 June 2025. Tom Bradley (Facilities Manager) to confirm status and revised target date by 1 December 2025. Delay attributed to coordination with external contractor for document destruction.<br/>
• CAR-2025-012 (Training records centralisation): Originally due 30 September 2025. James O'Brien is implementing new HRIS system. Target rescheduled to 31 January 2026. Current status: 60% complete with manual audit of records in progress.<br/>
<br/>
<b>Data Quality Issues:</b><br/>
• CAR-2025-011 (Database access controls review): Marked as 'Closed' but no completion date recorded. Completed in late August 2025 but closeout not formally documented. Sarah Williams to update record.<br/>
• CAR-2025-013 (USB policy enforcement): Marked as 'Closed' but no completion date recorded. Implementation completed approximately 28 July 2025. Marcus Lee to add completion date.<br/>
<br/>
<b>In Progress Actions (On Track):</b><br/>
• CAR-2025-003, CAR-2025-005, CAR-2025-006, CAR-2025-008, CAR-2025-010 are all tracking to meet target dates. Weekly progress reviews being conducted by David Chen.
"""

story.append(Paragraph(notes_text, body_style))
story.append(Spacer(1, 8*mm))

story.append(Paragraph("NEXT REVIEW", heading_style))
story.append(Paragraph("This register will be reviewed and updated on 10 December 2025. Outstanding corrective actions will be escalated to management review if not closed by target dates.", body_style))
story.append(Spacer(1, 8*mm))

story.append(Paragraph("<b>Compiled by:</b> Angela Torres, Compliance Manager<br/><b>Date:</b> 25 November 2025", body_style))

doc.build(story)
print("Created: CAR-001_Corrective_Action_Log.pdf")
