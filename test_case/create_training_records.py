#!/usr/bin/env python3
"""Generate TRN-001_Security_Awareness_Training_Record_2025.pdf"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER

doc = SimpleDocTemplate(
    "/sessions/determined-serene-wozniak/mnt/iso_27001/test_case/TRN-001_Security_Awareness_Training_Record_2025.pdf",
    pagesize=A4,
    rightMargin=10*mm,
    leftMargin=10*mm,
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

meta_style = ParagraphStyle('Meta', parent=styles['Normal'], fontSize=8, spaceAfter=3)

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
story.append(Paragraph("SECURITY AWARENESS TRAINING RECORD 2025", title_style))
story.append(Spacer(1, 6*mm))

story.append(Paragraph(f"<b>Register Reference:</b> TRN-001", meta_style))
story.append(Paragraph(f"<b>Reporting Period:</b> January - November 2025", meta_style))
story.append(Paragraph(f"<b>Compiled By:</b> James O'Brien, Head of Human Resources", meta_style))
story.append(Paragraph(f"<b>Date Compiled:</b> 20 November 2025", meta_style))
story.append(Spacer(1, 8*mm))

# Department Summary
story.append(Paragraph("TRAINING COMPLETION BY DEPARTMENT", heading_style))

dept_data = [
    ['Department', 'Staff Count', 'Annual Refresher Completed', '% Completion'],
    ['Claims', '60', '57', '95%'],
    ['Underwriting', '45', '43', '96%'],
    ['IT', '22', '22', '100%'],
    ['HR', '15', '14', '93%'],
    ['Finance', '30', '28', '93%'],
    ['Operations', '40', '38', '95%'],
    ['Customer Service', '32', '29', '91%'],
    ['Executive', '10', '10', '100%'],
    ['TOTAL', '254', '241', '95%'],
]

dept_table = Table(dept_data, colWidths=[130, 100, 140, 110])
dept_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2c3e50')),
    ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('GRID', (0, 0), (-1, -1), 1, HexColor('#cccccc')),
    ('ROWBACKGROUNDS', (0, 1), (-1, 1), [HexColor('#f5f5f5')]),
    ('ROWBACKGROUNDS', (0, 2), (-1, -2), [HexColor('#ffffff'), HexColor('#f5f5f5')]),
    ('BACKGROUND', (0, -1), (-1, -1), HexColor('#d4d4d4')),
    ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
]))
story.append(dept_table)
story.append(Spacer(1, 10*mm))

# Training matrix
story.append(Paragraph("INDIVIDUAL TRAINING COMPLETION MATRIX", heading_style))

# Page 1: Claims and Underwriting departments
training_data_1 = [
    ['Name', 'Department', 'Induction', 'Annual Refresher 2025', 'Phishing Sim', 'Specialist Training'],
    ['Sarah Mitchell', 'Claims', '12-Jan-2024', '15-Feb-2025', 'Pass', 'Claims Processing (25-Oct-2024)'],
    ['Michael Thompson', 'Claims', '08-Mar-2024', '22-Feb-2025', 'Pass', ''],
    ['Jennifer Wu', 'Claims', '15-May-2023', '28-Feb-2025', 'Pass', 'Fraud Investigation (12-Aug-2024)'],
    ['David Patel', 'Claims', '22-Jul-2024', '', 'Pass', ''],
    ['Emma Rodriguez', 'Claims', '10-Sep-2023', '18-Feb-2025', 'Pass', ''],
    ['Thomas Anderson', 'Claims', '14-Nov-2023', '25-Feb-2025', 'Fail', ''],
    ['Lisa Chen', 'Claims', '02-Jan-2024', '08-Mar-2025', 'Pass', 'Claims Management System (05-Jul-2024)'],
    ['Robert Williams', 'Claims', '19-Feb-2024', '', '', 'Claims Processing (20-Sep-2024)'],
    ['Jessica Brown', 'Claims', '28-Mar-2024', '15-Mar-2025', 'Pass', ''],
    ['Alexander Grant', 'Claims', '06-Apr-2024', '22-Mar-2025', 'Pass', ''],
    ['Victoria Hart', 'Underwriting', '12-Jan-2024', '18-Feb-2025', 'Pass', 'Underwriting Policy (10-Jul-2024)'],
    ['Nicholas Price', 'Underwriting', '08-Feb-2024', '25-Feb-2025', 'Pass', ''],
    ['Amanda Foster', 'Underwriting', '15-Mar-2024', '04-Mar-2025', 'Pass', 'Risk Assessment (22-Aug-2024)'],
    ['Christopher Bell', 'Underwriting', '22-Apr-2024', '11-Mar-2025', 'Fail', 'Underwriting Policy (15-Jun-2024)'],
    ['Sophie Maxwell', 'Underwriting', '30-May-2024', '18-Mar-2025', 'Pass', ''],
    ['Daniel Evans', 'Underwriting', '07-Jun-2024', '25-Mar-2025', 'Pass', ''],
    ['Rebecca Lewis', 'Underwriting', '14-Jul-2024', '', 'Pass', ''],
]

training_table_1 = Table(training_data_1, colWidths=[110, 85, 80, 95, 75, 110])
training_table_1.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2c3e50')),
    ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 7),
    ('GRID', (0, 0), (-1, -1), 1, HexColor('#cccccc')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#f5f5f5'), HexColor('#ffffff')]),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 2),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
]))
story.append(training_table_1)
story.append(Spacer(1, 10*mm))

# Page 2 content
story.append(PageBreak())

training_data_2 = [
    ['Name', 'Department', 'Induction', 'Annual Refresher 2025', 'Phishing Sim', 'Specialist Training'],
    ['Marcus Lee', 'IT', '03-Jan-2023', '10-Feb-2025', 'Pass', 'Advanced Security Ops (15-May-2025)'],
    ['Sarah Williams', 'IT', '15-Jun-2022', '17-Feb-2025', 'Pass', 'CISO Training (20-Aug-2024)'],
    ['Liam Foster', 'IT', '22-Jul-2023', '24-Feb-2025', 'Pass', 'Network Security (12-Oct-2024)'],
    ['Priya Nair', 'IT', '08-Sep-2023', '03-Mar-2025', 'Pass', 'Service Desk Security (22-Sep-2024)'],
    ['Kevin Murphy', 'IT', '10-Nov-2023', '10-Mar-2025', 'Pass', ''],
    ['Patricia Singh', 'IT', '14-Dec-2023', '17-Mar-2025', 'Pass', 'Cloud Security (18-Nov-2024)'],
    ['Angela Torres', 'HR', '20-Jan-2024', '20-Feb-2025', 'Pass', 'Compliance Management (08-May-2024)'],
    ['James O\'Brien', 'HR', '05-Feb-2024', '22-Feb-2025', 'Pass', 'HR Security (25-Jul-2024)'],
    ['Michelle Garcia', 'HR', '12-Mar-2024', '25-Feb-2025', 'Pass', ''],
    ['David Kumar', 'HR', '19-Apr-2024', '', 'Pass', ''],
    ['Edward Hayes', 'Finance', '08-Jan-2024', '15-Feb-2025', 'Pass', 'Financial Controls (30-Aug-2024)'],
    ['Katherine Lewis', 'Finance', '15-Feb-2024', '18-Feb-2025', 'Pass', 'Data Protection Finance (12-Oct-2024)'],
    ['Ronald Scott', 'Finance', '22-Mar-2024', '25-Feb-2025', 'Pass', ''],
    ['Carol White', 'Finance', '29-Apr-2024', '', 'Pass', ''],
    ['Barbara Martinez', 'Finance', '06-Jun-2024', '08-Mar-2025', 'Pass', ''],
    ['George Jackson', 'Operations', '13-Jul-2024', '15-Mar-2025', 'Pass', 'Facilities Security (20-Oct-2024)'],
    ['Dorothy Taylor', 'Operations', '20-Aug-2024', '22-Mar-2025', 'Pass', ''],
    ['Larry Thomas', 'Customer Service', '10-Jan-2024', '12-Feb-2025', 'Pass', ''],
    ['Nancy Johnson', 'Customer Service', '25-Feb-2024', '', 'Pass', ''],
    ['Fred Moore', 'Executive', '01-Jan-2023', '10-Feb-2025', 'Pass', 'Executive Security Awareness (15-Sep-2024)'],
]

training_table_2 = Table(training_data_2, colWidths=[110, 85, 80, 95, 75, 110])
training_table_2.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2c3e50')),
    ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 7),
    ('GRID', (0, 0), (-1, -1), 1, HexColor('#cccccc')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#f5f5f5'), HexColor('#ffffff')]),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 2),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
]))
story.append(training_table_2)
story.append(Spacer(1, 10*mm))

# Page 3 - continued staff list
story.append(PageBreak())

training_data_3 = [
    ['Name', 'Department', 'Induction', 'Annual Refresher 2025', 'Phishing Sim', 'Specialist Training'],
    ['Margaret Thornton', 'Executive', '15-Jan-2020', '08-Feb-2025', 'Pass', 'Board Security Governance (22-Sep-2024)'],
    ['David Chen', 'IT', '10-Feb-2021', '12-Feb-2025', 'Pass', 'CISO Certification (18-Oct-2024)'],
    ['Helen Martinez', 'Operations', '28-May-2024', '01-Apr-2025', 'Pass', ''],
    ['Patrick O\'Connor', 'Operations', '04-Jul-2024', '08-Apr-2025', 'Pass', 'Security for Facilities (15-Nov-2024)'],
    ['Susan Phillips', 'Finance', '11-Sep-2024', '15-Apr-2025', 'Pass', ''],
    ['Richard Butler', 'Finance', '18-Oct-2024', '22-Apr-2025', 'Pass', ''],
    ['Maria Garcia', 'Claims', '25-Nov-2023', '29-Mar-2025', 'Pass', ''],
    ['Anthony Wood', 'Claims', '08-Dec-2023', '05-Apr-2025', 'Fail', ''],
    ['Linda Green', 'Underwriting', '14-Jan-2024', '12-Apr-2025', 'Pass', 'Underwriting Systems (20-Jan-2025)'],
    ['Charles Young', 'Underwriting', '21-Feb-2024', '19-Apr-2025', 'Pass', ''],
    ['Jessica King', 'Underwriting', '28-Mar-2024', '26-Apr-2025', 'Pass', ''],
    ['Tom Bradley', 'Operations', '04-May-2024', '03-May-2025', 'Pass', 'Physical Security (15-Oct-2024)'],
    ['Amy Cooper', 'Customer Service', '11-Jun-2024', '10-May-2025', 'Pass', ''],
    ['William Clark', 'Customer Service', '18-Jul-2024', '17-May-2025', 'Pass', ''],
    ['Barbara Adams', 'Customer Service', '25-Aug-2024', '24-May-2025', 'Pass', ''],
    ['Joseph Hall', 'Customer Service', '01-Sep-2024', '', 'Fail', ''],
    ['Patricia Kumar', 'Claims', '08-Oct-2024', '31-May-2025', 'Pass', 'Claims Leadership (12-Mar-2025)'],
    ['Robert Fitzgerald', 'Underwriting', '15-Nov-2024', '07-Jun-2025', 'Pass', 'Underwriting Leadership (20-Apr-2025)'],
]

training_table_3 = Table(training_data_3, colWidths=[110, 85, 80, 95, 75, 110])
training_table_3.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2c3e50')),
    ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 7),
    ('GRID', (0, 0), (-1, -1), 1, HexColor('#cccccc')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#f5f5f5'), HexColor('#ffffff')]),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 2),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
]))
story.append(training_table_3)
story.append(Spacer(1, 10*mm))

# Notes and issues
story.append(Paragraph("OUTSTANDING TRAINING REQUIREMENTS", heading_style))

outstanding_data = [
    ['Employee Name', 'Department', 'Issue', 'Action Required'],
    ['David Patel', 'Claims', 'Annual Refresher 2025 not completed', 'Complete by 31-Dec-2025'],
    ['Robert Williams', 'Claims', 'Annual Refresher 2025 not completed; Phishing sim not completed', 'Complete both by 31-Dec-2025'],
    ['Christopher Bell', 'Underwriting', 'Phishing Simulation FAILED - No re-training scheduled', 'Re-training required - No date set'],
    ['Thomas Anderson', 'Claims', 'Phishing Simulation FAILED - No re-training scheduled', 'Re-training required - No date set'],
    ['David Kumar', 'HR', 'Annual Refresher 2025 not completed', 'Complete by 31-Dec-2025'],
    ['Carol White', 'Finance', 'Annual Refresher 2025 not completed', 'Complete by 31-Dec-2025'],
    ['Nancy Johnson', 'Customer Service', 'Annual Refresher 2025 not completed', 'Complete by 31-Dec-2025'],
    ['Joseph Hall', 'Customer Service', 'Phishing Simulation FAILED - No re-training scheduled', 'Re-training required - No date set'],
]

outstanding_table = Table(outstanding_data, colWidths=[120, 85, 150, 125])
outstanding_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2c3e50')),
    ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 8),
    ('GRID', (0, 0), (-1, -1), 1, HexColor('#cccccc')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#ffe6e6'), HexColor('#fff3f3')]),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
]))
story.append(outstanding_table)
story.append(Spacer(1, 8*mm))

story.append(Paragraph("""
<b>Key Observations:</b><br/>
• 5-6 employees have not completed Annual Refresher 2025 training (target: all staff by end of year)<br/>
• 2 employees failed phishing simulation with no documented re-training plan or scheduled date<br/>
• Overall completion rate of 95% is acceptable but needs improvement in remaining staff<br/>
• Specialist training allocated based on role requirements; most staff receiving appropriate training<br/>
""", meta_style))
story.append(Spacer(1, 8*mm))

story.append(Paragraph("<b>Report Compiled By:</b> James O'Brien, Head of Human Resources<br/><b>Date:</b> 20 November 2025", meta_style))

doc.build(story)
print("Created: TRN-001_Security_Awareness_Training_Record_2025.pdf")
