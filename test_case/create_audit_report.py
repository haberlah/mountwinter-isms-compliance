#!/usr/bin/env python3
"""Generate AUD-001_Internal_Audit_Report_Oct2025.pdf"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, grey
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from datetime import datetime

# Configure document
doc = SimpleDocTemplate(
    "/sessions/determined-serene-wozniak/mnt/iso_27001/test_case/AUD-001_Internal_Audit_Report_Oct2025.pdf",
    pagesize=A4,
    rightMargin=15*mm,
    leftMargin=15*mm,
    topMargin=20*mm,
    bottomMargin=15*mm,
)

# Styles
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

# Story for document
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
    ('FONTNAME', (1, 0), (1, 0), 'Helvetica'),
    ('FONTSIZE', (1, 0), (1, 0), 9),
]))
story.append(header_table)
story.append(Spacer(1, 10*mm))

# Title
story.append(Paragraph("INTERNAL AUDIT REPORT", title_style))
story.append(Paragraph("Access Control, Incident Management & Change Management", heading_style))
story.append(Spacer(1, 5*mm))

# Report metadata
meta_style = ParagraphStyle('Meta', parent=styles['Normal'], fontSize=9, spaceAfter=3)
story.append(Paragraph(f"<b>Report Reference:</b> AUD-001", meta_style))
story.append(Paragraph(f"<b>Audit Period:</b> 14 - 18 October 2025", meta_style))
story.append(Paragraph(f"<b>Report Date:</b> 25 October 2025", meta_style))
story.append(Paragraph(f"<b>Audit Team:</b> Angela Torres (Compliance Manager), Jennifer Walsh (Meridian Assurance Pty Ltd)", meta_style))
story.append(Spacer(1, 8*mm))

# Executive Summary
story.append(Paragraph("EXECUTIVE SUMMARY", heading_style))
summary_text = """This internal audit was conducted during 14-18 October 2025 to assess the effectiveness of HorseInsure's information security controls across access control, incident management and change management processes. The audit was conducted in accordance with the organisation's audit plan and examined policies, procedures, system configurations and supporting documentation. Three major findings were identified relating to incomplete quarterly access reviews, undocumented emergency change procedures and inadequately assessed third-party suppliers. Three minor findings were also noted in training records and documentation. Two observations for improvement have been raised. Overall, the control environment is largely adequate, but remediation of major findings is required."""
story.append(Paragraph(summary_text, body_style))
story.append(Spacer(1, 8*mm))

# Findings Summary Table
story.append(Paragraph("FINDINGS SUMMARY", heading_style))
findings_summary = [
    ['Severity', 'Count', 'Status'],
    ['Major', '3', 'Remediation Required'],
    ['Minor', '3', 'Remediation Recommended'],
    ['Observation', '2', 'Continuous Improvement'],
]
findings_table = Table(findings_summary, colWidths=[150, 100, 200])
findings_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2c3e50')),
    ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
    ('TOPPADDING', (0, 0), (-1, 0), 8),
    ('GRID', (0, 0), (-1, -1), 1, HexColor('#cccccc')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#f5f5f5'), HexColor('#ffffff')]),
    ('FONTSIZE', (0, 1), (-1, -1), 9),
    ('ALIGNMENT', (0, 1), (-1, -1), 'CENTER'),
]))
story.append(findings_table)
story.append(Spacer(1, 10*mm))

# Page break before detailed findings
story.append(PageBreak())

# MAJOR FINDING 1
story.append(Paragraph("MAJOR FINDING 1: Incomplete Quarterly Access Reviews", heading_style))
story.append(Paragraph("<b>Finding ID:</b> AUD-001-MJ-001", body_style))
story.append(Paragraph("<b>Area:</b> Access Control", body_style))
story.append(Spacer(1, 3*mm))

story.append(Paragraph("<b>Description:</b>", body_style))
desc_text = """Quarterly access reviews for active user accounts across critical systems (EquiClaim, EquiPolicy, EquiQuote, Azure AD) have not been completed for Q3 2025 (July-September). Our review found that the last completed access review was for Q2 2025 (completed 30 June 2025). The Q3 review was due 30 September 2025 but has not been conducted. This represents a control breakdown in user access governance."""
story.append(Paragraph(desc_text, body_style))

story.append(Paragraph("<b>Evidence:</b>", body_style))
story.append(Paragraph("• Access Review Log - Q3 2025 marked as 'Not Commenced'<br/>• Email trail showing Q3 review was scheduled for 20 September but cancelled<br/>• System audit logs showing 12 user deactivations not formally reviewed in Q3<br/>• Interviews with Sarah Williams (Head of IT) confirming resource constraints", body_style))

story.append(Paragraph("<b>Risk Rating:</b> MAJOR", body_style))
story.append(Paragraph("<b>Risk Impact:</b> Unauthorised or obsolete user accounts may retain access to sensitive systems containing customer horse insurance data and claims information.", body_style))

story.append(Paragraph("<b>Recommendation:</b>", body_style))
story.append(Paragraph("• Complete Q3 2025 access review immediately with documented sign-off<br/>• Establish dedicated resource or allocate existing resource to prevent future delays<br/>• Implement automated reminders 2 weeks prior to review due dates<br/>• Consider quarterly access review checklist to ensure completeness", body_style))

story.append(Paragraph("<b>Management Response:</b>", body_style))
mgmt_text_1 = """Agreed. We acknowledge the delay in Q3 access review. Sarah Williams will prioritise completion of Q3 review by 30 November 2025. We will review resource allocation for IT governance activities. However, we believe the risk is mitigated by the fact that deactivated accounts are disabled in Azure AD automatically after 90 days of inactivity."""
story.append(Paragraph(mgmt_text_1, body_style))

story.append(Paragraph("<b>Target Completion Date:</b> 30 November 2025", body_style))
story.append(Paragraph("<b>Owner:</b> Sarah Williams, Head of IT", body_style))
story.append(Spacer(1, 8*mm))

# MAJOR FINDING 2
story.append(Paragraph("MAJOR FINDING 2: Emergency Change Process Not Documented", heading_style))
story.append(Paragraph("<b>Finding ID:</b> AUD-001-MJ-002", body_style))
story.append(Paragraph("<b>Area:</b> Change Management", body_style))
story.append(Spacer(1, 3*mm))

story.append(Paragraph("<b>Description:</b>", body_style))
desc_text = """The Change Management Policy (v2.1, approved June 2024) defines a standard change process requiring 5 business days advance notice and documented approval. However, no formal emergency change procedure exists for critical security patches or system outages requiring immediate remediation. Review of 2025 change logs identified 7 changes categorised as 'emergency' but implemented without documented approvals or impact assessments. Examples include: (1) security patches to claims system on 12 March, (2) database failover configuration on 5 August, (3) Azure AD policy update on 18 September."""
story.append(Paragraph(desc_text, body_style))

story.append(Paragraph("<b>Evidence:</b>", body_style))
story.append(Paragraph("• Change Management Policy v2.1 (no emergency procedure section)<br/>• Change request tickets #2025-0847, #2025-1263, #2025-1524, #2025-1687 marked 'Emergency' but no approval evidence<br/>• Interview with Sarah Williams and Marcus Lee (IT Security Analyst) confirming ad-hoc emergency processes<br/>• Network change logs showing 7 unscheduled changes in 2025", body_style))

story.append(Paragraph("<b>Risk Rating:</b> MAJOR", body_style))
story.append(Paragraph("<b>Risk Impact:</b> Undocumented emergency changes increase risk of unintended system disruptions, loss of audit trail, and inability to demonstrate change control compliance to regulators.", body_style))

story.append(Paragraph("<b>Recommendation:</b>", body_style))
story.append(Paragraph("• Develop and document formal Emergency Change Procedure defining scope, approval authority, notification requirements and post-implementation review<br/>• Establish emergency change committee with representatives from IT, Security and Operations<br/>• Implement weekly review of all emergency changes for post-implementation assessment<br/>• Train IT staff on new emergency change process", body_style))

story.append(Paragraph("<b>Management Response:</b>", body_style))
mgmt_text_2 = """We agree this requires formal documentation. David Chen will work with Sarah Williams to develop an Emergency Change Procedure by 15 January 2026. We note that emergency changes to date have been necessary to maintain system availability and data security."""
story.append(Paragraph(mgmt_text_2, body_style))

story.append(Paragraph("<b>Target Completion Date:</b> 15 January 2026", body_style))
story.append(Paragraph("<b>Owner:</b> David Chen, CIO/CISO", body_style))
story.append(Spacer(1, 8*mm))

# Page break
story.append(PageBreak())

# MAJOR FINDING 3
story.append(Paragraph("MAJOR FINDING 3: Third-Party Suppliers Without Security Assessments", heading_style))
story.append(Paragraph("<b>Finding ID:</b> AUD-001-MJ-003", body_style))
story.append(Paragraph("<b>Area:</b> Supplier Management / Access Control", body_style))
story.append(Spacer(1, 3*mm))

story.append(Paragraph("<b>Description:</b>", body_style))
desc_text = """Review of active supplier agreements identified three suppliers providing IT services or accessing company systems without documented security assessments: (1) ABC Printing Pty Ltd - provides document management services for policy documents with access to file server, (2) QuickFix IT Support Pty Ltd - remote access to claims system for technical support, (3) Regional IT Services - manages network infrastructure at Dubbo and Scone offices. No evidence of security questionnaires, risk assessments or contractual security obligations were found for any of these suppliers."""
story.append(Paragraph(desc_text, body_style))

story.append(Paragraph("<b>Evidence:</b>", body_style))
story.append(Paragraph("• Supplier register (Salesforce) listing 47 active suppliers, 3 with no security assessment recorded<br/>• Supplier agreements for ABC Printing, QuickFix IT Support and Regional IT Services lacking security clauses<br/>• Interview with Sarah Williams confirming assessments not performed<br/>• System access logs showing active accounts for all three suppliers with documented access rights", body_style))

story.append(Paragraph("<b>Risk Rating:</b> MAJOR", body_style))
story.append(Paragraph("<b>Risk Impact:</b> Unvetted suppliers with system access create risk of data breach, non-compliance with insurance regulations (ASIC, APRA), and liability exposure for customer data compromise.", body_style))

story.append(Paragraph("<b>Recommendation:</b>", body_style))
story.append(Paragraph("• Immediately conduct security assessments for three identified suppliers<br/>• Establish baseline supplier security questionnaire (align with ISO 27001 Annex A.15)<br/>• Update supplier agreements to include security obligations<br/>• Establish quarterly supplier risk assessment review schedule<br/>• Consider third-party risk scoring model (e.g., based on access level and data sensitivity)", body_style))

story.append(Paragraph("<b>Management Response:</b>", body_style))
mgmt_text_3 = """Acknowledged. Angela Torres will conduct security assessments of the three identified suppliers. We expect to have questionnaires completed by suppliers by end of November 2025, though we note that ABC Printing has been operating with document access for 3 years without incident."""
story.append(Paragraph(mgmt_text_3, body_style))

story.append(Paragraph("<b>Target Completion Date:</b> 30 November 2025", body_style))
story.append(Paragraph("<b>Owner:</b> Angela Torres, Compliance Manager", body_style))
story.append(Spacer(1, 8*mm))

# MINOR FINDING 1
story.append(Paragraph("MINOR FINDING 1: Incomplete Incident Response Training Records", heading_style))
story.append(Paragraph("<b>Finding ID:</b> AUD-001-MN-001", body_style))

story.append(Paragraph("<b>Description:</b>", body_style))
story.append(Paragraph("Training records for incident response team members were not consistently documented. Some staff indicated they received training but no formal record exists.", body_style))

story.append(Paragraph("<b>Risk Rating:</b> MINOR", body_style))
story.append(Paragraph("<b>Recommendation:</b> Implement centralised training tracking system for all security-related training.", body_style))

story.append(Paragraph("<b>Management Response:</b>", body_style))
story.append(Paragraph("James O'Brien will audit training records and update documentation.", body_style))

story.append(Paragraph("<b>Target Completion Date:</b> 31 December 2025", body_style))
story.append(Spacer(1, 6*mm))

# MINOR FINDING 2
story.append(Paragraph("MINOR FINDING 2: System Security Standards Documentation Gaps", heading_style))
story.append(Paragraph("<b>Finding ID:</b> AUD-001-MN-002", body_style))

story.append(Paragraph("<b>Description:</b>", body_style))
story.append(Paragraph("Documentation for system security standards (SAP Finance, Salesforce) lacks current review dates and sign-off evidence. Documentation appears outdated.", body_style))

story.append(Paragraph("<b>Risk Rating:</b> MINOR", body_style))
story.append(Paragraph("<b>Recommendation:</b> Schedule quarterly review and update of system security standards documentation with formal sign-off.", body_style))

story.append(Paragraph("<b>Management Response:</b>", body_style))
story.append(Paragraph("Sarah Williams to establish quarterly review schedule for system security standards. Initial review to be completed by 15 January 2026.", body_style))

story.append(Paragraph("<b>Target Completion Date:</b> 15 January 2026", body_style))
story.append(Spacer(1, 6*mm))

# MINOR FINDING 3
story.append(Paragraph("MINOR FINDING 3: Backup Restoration Testing Records", heading_style))
story.append(Paragraph("<b>Finding ID:</b> AUD-001-MN-003", body_style))

story.append(Paragraph("<b>Description:</b>", body_style))
story.append(Paragraph("Documentation of backup restoration testing for critical systems shows gaps in 2025. Testing was performed but not formally recorded.", body_style))

story.append(Paragraph("<b>Risk Rating:</b> MINOR", body_style))
story.append(Paragraph("<b>Recommendation:</b> Implement standardised backup testing checklist and maintain centralised log of all restoration tests.", body_style))

story.append(Paragraph("<b>Management Response:</b>", body_style))
story.append(Paragraph("Liam Foster will establish backup testing log and ensure all tests are documented going forward.", body_style))

story.append(Paragraph("<b>Target Completion Date:</b> 31 December 2025", body_style))
story.append(Spacer(1, 8*mm))

# Page break
story.append(PageBreak())

# OBSERVATIONS
story.append(Paragraph("OBSERVATIONS AND OPPORTUNITIES FOR IMPROVEMENT", heading_style))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("<b>Observation 1: Access Request Approval Timeliness</b>", body_style))
story.append(Paragraph("Review of access request processing times shows 85% are completed within target 5 business days, but 15% exceed targets due to approver unavailability. Consider implementing automated escalation or backup approver designation.", body_style))
story.append(Spacer(1, 6*mm))

story.append(Paragraph("<b>Observation 2: Incident Reporting Awareness</b>", body_style))
story.append(Paragraph("Staff interviews suggest moderate awareness of security incident reporting procedures, but awareness could be enhanced through more frequent reminders and refresher training. Current training is delivered at induction only.", body_style))
story.append(Spacer(1, 8*mm))

# Conclusion
story.append(Paragraph("CONCLUSION", heading_style))
conclusion_text = """This audit identified areas requiring remediation, particularly around access review timeliness, emergency change procedures and supplier security assessments. Management has committed to addressing major findings by specified target dates. The audit team will conduct follow-up assessment in Q1 2026 to verify remediation effectiveness."""
story.append(Paragraph(conclusion_text, body_style))
story.append(Spacer(1, 8*mm))

# Sign-off
story.append(Paragraph("<b>Report Prepared By:</b>", body_style))
story.append(Paragraph("Angela Torres<br/>Compliance Manager<br/>HorseInsure Pty Ltd<br/>Date: 25 October 2025", body_style))
story.append(Spacer(1, 4*mm))

story.append(Paragraph("<b>Supporting Auditor:</b>", body_style))
story.append(Paragraph("Jennifer Walsh<br/>Meridian Assurance Pty Ltd<br/>Date: 25 October 2025", body_style))

# Build PDF
doc.build(story)
print("Created: AUD-001_Internal_Audit_Report_Oct2025.pdf")
