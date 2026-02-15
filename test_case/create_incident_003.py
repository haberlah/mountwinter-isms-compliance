#!/usr/bin/env python3
"""Generate INC-2025-003_Security_Incident_Report.pdf"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY

doc = SimpleDocTemplate(
    "/sessions/determined-serene-wozniak/mnt/iso_27001/test_case/INC-2025-003_Security_Incident_Report.pdf",
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
    ['Report Reference', 'INC-2025-003'],
    ['Incident Type', 'Phishing Attack - Email'],
    ['Severity Level', 'HIGH'],
    ['Date Detected', '15 March 2025, 09:35 AM'],
    ['Report Date', '15 March 2025'],
    ['Reporting Officer', 'David Chen, CIO/CISO'],
    ['Systems Affected', 'Email gateway, Microsoft 365, Claims department workstations'],
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
desc_text = """A targeted phishing campaign was detected on 15 March 2025 targeting HorseInsure staff, specifically personnel in the Claims department. The malicious email appeared to be from an external claims management system (ClaimTech Pty Ltd) requesting urgent password verification due to "system maintenance". The email contained a link to a fraudulent login page designed to capture user credentials. Email gateway filtering initially allowed the message to pass through (sophisticated spoofing of legitimate domain). Alert triggered at 09:35 AM when multiple users from Claims department attempted to access the fraudulent page from company networks."""
story.append(Paragraph(desc_text, body_style))
story.append(Spacer(1, 6*mm))

# Detection and Response
story.append(Paragraph("DETECTION AND INITIAL RESPONSE", heading_style))
story.append(Paragraph("<b>How Detected:</b> Email security gateway detected multiple failed authentication attempts from claims department. Marcus Lee (IT Security Analyst) reviewed logs and identified suspicious login page access attempts.", body_style))
story.append(Paragraph("<b>Time to Detect:</b> Approximately 25 minutes from first user click", body_style))
story.append(Paragraph("<b>Immediate Actions Taken:</b>", body_style))
story.append(Paragraph("""
• 09:35 AM: Email gateway alert triggered
• 09:40 AM: Marcus Lee initiated incident response protocol
• 09:45 AM: Email message quarantined and removed from all user mailboxes (4,847 recipients across organisation)
• 10:00 AM: David Chen notified, incident classified as HIGH severity
• 10:15 AM: All affected users (3 who clicked link, 1 who entered partial credentials) identified and notified
• 10:30 AM: Forced password reset issued for affected users
• 10:45 AM: Email security rules updated to block similar phishing attempts
• 11:00 AM: Company-wide email alert sent warning users of phishing attack
""", body_style))
story.append(Spacer(1, 6*mm))

# Affected Parties
story.append(Paragraph("AFFECTED PARTIES AND IMPACT", heading_style))

impact_data = [
    ['Affected System', 'Impact Level', 'Details'],
    ['Microsoft 365 / Email', 'Medium', '4,847 users received malicious email; 23 users opened email'],
    ['Claims Department Users', 'High', '3 staff clicked fraudulent link; 1 staff member entered username (not password)'],
    ['EquiClaim System', 'Low', 'No direct compromise; however claims data could have been at risk if credentials were fully compromised'],
    ['Company Reputation', 'Medium', 'Risk of customer notification if data accessed; incident reported to ASIC (considered likely/reportable)'],
]

impact_table = Table(impact_data, colWidths=[120, 90, 260])
impact_table.setStyle(TableStyle([
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
story.append(impact_table)
story.append(Spacer(1, 8*mm))

# Containment and Remediation
story.append(Paragraph("CONTAINMENT AND REMEDIATION", heading_style))

story.append(Paragraph("<b>Short-term Actions (Completed):</b>", body_style))
story.append(Paragraph("""
• Email quarantine and user notification: 15 March 2025, 11:00 AM
• Forced password resets for 4 affected users: 15 March 2025, 10:30 AM
• Email security rule updates to block sender domain variations: 15 March 2025, 11:30 AM
• Claims department phishing awareness reminder: 15 March 2025, 2:00 PM
• Review of email gateway filtering rules: 16 March 2025
""", body_style))

story.append(Paragraph("<b>Medium-term Actions (In Progress/Planned):</b>", body_style))
story.append(Paragraph("""
• Security awareness training refresh for Claims department: Scheduled for 22 March 2025
• Email authentication enhancement (SPF/DKIM/DMARC review): To be completed by 31 March 2025
• Phishing simulation campaign targeting Claims staff: April 2025
• Review and enhancement of user authentication controls for EquiClaim system: April-May 2025
""", body_style))
story.append(Spacer(1, 6*mm))

# Page break
story.append(PageBreak())

# Root Cause Analysis
story.append(Paragraph("ROOT CAUSE ANALYSIS", heading_style))

story.append(Paragraph("<b>Primary Causes:</b>", body_style))
story.append(Paragraph("""
1. <b>Sophisticated phishing technique:</b> Email used trusted external vendor name (ClaimTech) and urgent messaging tone ('system maintenance') to bypass user caution

2. <b>Email gateway false negative:</b> Security gateway filtering rules did not initially flag the email due to sophisticated domain spoofing. The fraudulent domain was registered recently and had not been added to threat intelligence feeds.

3. <b>User security awareness gap:</b> Some users were not sufficiently cautious about verifying sender authenticity before clicking links. This reflects need for enhanced phishing awareness training.

4. <b>Lack of multi-factor authentication on EquiClaim:</b> EquiClaim system relies on username/password authentication only. MFA would have prevented compromise even if credentials were captured.
""", body_style))

story.append(Paragraph("<b>Contributing Factors:</b>", body_style))
story.append(Paragraph("""
• Claims department frequency of system communication makes them vulnerable to social engineering
• Recent organisational changes to claims systems (new integrations with external partners) created legitimate sender variation
• User password policies do not enforce strong passwords universally across all systems
""", body_style))
story.append(Spacer(1, 6*mm))

# Lessons Learned
story.append(Paragraph("LESSONS LEARNED AND RECOMMENDATIONS", heading_style))

story.append(Paragraph("<b>Key Learnings:</b>", body_style))
story.append(Paragraph("""
1. Current email security filtering is effective at detecting malicious patterns but can be circumvented by sophisticated domain spoofing
2. User awareness training is critical frontline defence; approximately 5% of recipients (23 of 4,847) still clicked suspicious links
3. Rapid incident response was effective; containment occurred within 25 minutes of detection, limiting damage
4. Need for MFA implementation extends beyond IT systems to business-critical applications like claims systems
""", body_style))

story.append(Paragraph("<b>Recommendations for Prevention:</b>", body_style))
story.append(Paragraph("""
1. Implement multi-factor authentication (MFA) for EquiClaim system access (PRIORITY)
2. Deploy advanced email authentication (DMARC enforcement) to prevent domain spoofing
3. Implement email banner alerts for messages from external domains
4. Conduct department-specific phishing awareness training (Claims quarterly, others annually)
5. Establish dedicated phishing reporting mechanism with immediate response protocol
6. Consider deploying sandbox email analysis tool for advanced threat detection
7. Implement mandatory password complexity requirements across all systems
""", body_style))
story.append(Spacer(1, 6*mm))

# Regulatory and Compliance
story.append(Paragraph("REGULATORY NOTIFICATION AND COMPLIANCE", heading_style))
story.append(Paragraph("<b>ASIC Reportability Assessment:</b> This incident meets criteria for reporting to ASIC as potential breach of customer data protection obligations (Corporations Act s912D). No customer data was confirmed compromised; however, risk was present.", body_style))
story.append(Paragraph("<b>Status:</b> Incident reported to ASIC on 20 March 2025 as notifiable data security event. No customer notification required (no confirmed compromise).", body_style))
story.append(Paragraph("<b>Breach Register Entry:</b> Recorded in HorseInsure Security Breach Register (ref: BR-2025-003)", body_style))
story.append(Spacer(1, 8*mm))

# Sign-off
story.append(Paragraph("REPORT APPROVAL", heading_style))
story.append(Paragraph("<b>Reported by:</b> David Chen, CIO/CISO<br/><b>Report Date:</b> 15 March 2025", body_style))
story.append(Spacer(1, 4*mm))
story.append(Paragraph("<b>Reviewed by:</b> Angela Torres, Compliance Manager<br/><b>Review Date:</b> 17 March 2025", body_style))
story.append(Spacer(1, 4*mm))
story.append(Paragraph("<b>Approved by:</b> Margaret Thornton, Chief Executive Officer<br/><b>Approval Date:</b> 18 March 2025", body_style))

doc.build(story)
print("Created: INC-2025-003_Security_Incident_Report.pdf")
