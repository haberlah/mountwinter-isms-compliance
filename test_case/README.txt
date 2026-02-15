================================================================================
ISO 27001 COMPLIANCE TEST DOCUMENTS - README
HorseInsure Pty Ltd Document Generation
================================================================================

OVERVIEW:
This directory contains 5 professionally formatted PDF documents for ISO 27001
compliance testing and auditor training. All documents are realistic and include
intentional control gaps for testing purposes.

================================================================================
QUICK START
================================================================================

All 5 PDF documents are ready to use:

1. SSA-001_Supplier_Assessment_CloudStable.pdf (2 pages)
   • Comprehensive supplier assessment (good example)
   • Risk: LOW | Status: COMPLIANT

2. SSA-002_Supplier_Assessment_DataVault.pdf (1 page)
   • Incomplete supplier assessment (poor example with gaps)
   • Risk: MEDIUM | Status: APPROVED (despite gaps)

3. PEN-001_Penetration_Test_Report_Aug2025.pdf (3 pages)
   • Professional pentesting report with unresolved findings
   • 1 Critical, 2 High, 3 Medium, 2 Low findings
   • Critical & High findings remain OPEN after 6+ months

4. FRM-001_Access_Request_Form_Template.pdf (1 page)
   • Blank access request form template
   • Missing: access review date and expiry date fields

5. ARCH-001_Network_Architecture_Diagram.pdf (2 pages)
   • Network architecture diagram
   • Missing: IDS/IPS (intrusion detection/prevention systems)

Total: 9 pages, ~23 KB

================================================================================
DOCUMENT DETAILS
================================================================================

COMPANY CONTEXT:
  Name: HorseInsure Pty Ltd
  Business: Horse insurance (including inflatable horses)
  ABN: 41 209 837 156
  Employees: 254
  Located: Australia

KEY SYSTEMS:
  • EquiClaim (claims management)
  • EquiPolicy (policy administration)
  • EquiQuote (underwriting)
  • Microsoft 365, Azure AD
  • Salesforce, SAP Finance

KEY PERSONNEL:
  • Margaret "Maggie" Thornton (CEO)
  • David Chen (CISO)
  • Sarah Williams (Head of IT)
  • Angela Torres (Compliance Manager)
  • Marcus Lee (IT Security Analyst)

================================================================================
INTENTIONAL CONTROL GAPS (FOR TESTING)
================================================================================

Document 1 - SSA-001 (CloudStable Assessment):
  Gap: NONE - This is a best-practice example for comparison

Document 2 - SSA-002 (DataVault Assessment):
  Gap 1: Incident notification "Not reviewed during assessment"
  Gap 2: Compliance certifications marked "N/A" (no validation)
  Gap 3: Weak risk justification
  Gap 4: Approved despite identified gaps
  Purpose: Test auditor's ability to identify incomplete assessments

Document 3 - PEN-001 (Penetration Test):
  Gap 1: Critical SQL injection vulnerability still "In Progress" (6+ months)
  Gap 2: Two High findings still "Open" (6+ months)
  Gap 3: No documented remediation completion dates
  Gap 4: Management response lacks specific timelines
  Purpose: Test auditor's vulnerability management assessment

Document 4 - FRM-001 (Access Request Form):
  Gap 1: NO "Access Review Date" field
  Gap 2: NO "Access Expiry Date" field
  Gap 3: Annual review noted only in footer (not enforced by form)
  Purpose: Test auditor's access control field completeness review

Document 5 - ARCH-001 (Network Architecture):
  Gap 1: NO IDS/IPS (Intrusion Detection/Prevention System) shown
  Gap 2: Missing intrusion detection capability documentation
  Gap 3: No monitoring/SIEM shown
  Purpose: Test auditor's network security architecture assessment

================================================================================
AUDIT TESTING SCENARIOS
================================================================================

SCENARIO 1 - Supplier Management Assessment
  Objective: Can auditor identify assessment quality differences?
  Compare: SSA-001 (good) vs SSA-002 (poor)
  Focus: Assessment completeness, evidence validation, risk rating
  Expected: Identify SSA-002 gaps and recommend resubmission
  Time: 1-2 hours

SCENARIO 2 - Vulnerability Management
  Objective: Can auditor identify unresolved critical findings?
  Review: PEN-001 findings and remediation status
  Focus: Remediation timelines, escalation procedures, tracking
  Expected: Identify 6-month delay on critical finding
  Time: 1-2 hours

SCENARIO 3 - Access Control Review
  Objective: Can auditor identify missing control fields?
  Review: FRM-001 form design
  Focus: Access review dates, expiry dates, approval workflows
  Expected: Identify missing date fields and weak compensating controls
  Time: 30-45 minutes

SCENARIO 4 - Network Security Architecture
  Objective: Can auditor identify missing security components?
  Review: ARCH-001 network diagram
  Focus: Detection/prevention systems, monitoring, segmentation
  Expected: Identify missing IDS/IPS and recommend implementation
  Time: 45-60 minutes

COMBINED AUDIT: 3.5-5 hours total

================================================================================
USING THESE DOCUMENTS
================================================================================

FOR INTERNAL AUDITS:
1. Distribute documents to internal audit team
2. Have auditors independently assess each document
3. Compare findings across auditors
4. Discuss identified gaps and control weaknesses
5. Use as training for junior auditors

FOR AUDITOR TRAINING:
1. Show SSA-001 as best-practice example
2. Have trainees identify gaps in SSA-002
3. Have trainees review PEN-001 for unresolved findings
4. Have trainees identify missing fields in FRM-001
5. Have trainees identify missing components in ARCH-001

FOR EXTERNAL AUDIT PREPARATION:
1. Use to test audit team's competency
2. Identify training needs in specific areas
3. Develop corrective action plans
4. Re-assess after implementing improvements

FOR ISO 27001 MOCK AUDIT:
1. Distribute as part of mock audit exercise
2. Score auditor responses
3. Identify auditor competency gaps
4. Provide targeted training

================================================================================
AUDITOR TESTING GUIDE
================================================================================

A comprehensive testing guide is available in:
  AUDITOR_TESTING_GUIDE.txt

This file contains:
- Detailed audit objectives for each document
- Questions auditors should ask
- Control gaps to identify
- Expected audit conclusions
- Remediation recommendations
- Compliance references

================================================================================
DOCUMENT GENERATION
================================================================================

The Python source code used to generate these documents is included:
  generate_iso27001_docs.py

This script uses:
  • Python 3
  • reportlab library (for PDF generation)
  • reportlab.platypus (for multi-page documents)
  • reportlab.graphics (for network diagram)

To regenerate documents:
  python3 generate_iso27001_docs.py

Requirements:
  pip install reportlab

The script demonstrates:
  • Professional PDF creation
  • Complex table layouts
  • Multi-page documents with headers/footers
  • Custom styling and colors
  • Drawing/graphics for diagrams

================================================================================
ADDITIONAL RESOURCES
================================================================================

Files in this directory:
  ✓ SSA-001_Supplier_Assessment_CloudStable.pdf (comprehensive example)
  ✓ SSA-002_Supplier_Assessment_DataVault.pdf (gap identification)
  ✓ PEN-001_Penetration_Test_Report_Aug2025.pdf (finding remediation)
  ✓ FRM-001_Access_Request_Form_Template.pdf (form completeness)
  ✓ ARCH-001_Network_Architecture_Diagram.pdf (architecture assessment)
  ✓ generate_iso27001_docs.py (Python source code)
  ✓ README.txt (this file)
  ✓ PDF_MANIFEST.txt (document inventory)
  ✓ AUDITOR_TESTING_GUIDE.txt (detailed testing procedures)

Related files in parent directories:
  ✓ GENERATION_SUMMARY.md (executive summary)

================================================================================
COMPLIANCE TESTING TIPS
================================================================================

1. DOCUMENT AUTHENTICITY:
   All documents appear genuine and professional. Remember these are TEST
   documents with intentional gaps for auditor assessment training.

2. REALISTIC CONTEXT:
   All details (company, personnel, systems, suppliers) are realistic and
   contextually appropriate for a 254-person Australian insurance company.

3. CONTROL GAPS ARE DELIBERATE:
   Gaps in these documents (incomplete assessments, unresolved findings,
   missing form fields, missing security components) are intentionally
   included for testing purposes.

4. MULTIPLE SEVERITY LEVELS:
   Documents demonstrate different levels of compliance:
   • SSA-001: Good (reference standard)
   • SSA-002: Poor (training example)
   • PEN-001: Professional report with operational gaps
   • FRM-001: Professional form with control gaps
   • ARCH-001: Professional diagram with missing components

5. AUDITOR ASSESSMENT:
   Use these documents to assess auditor competency in:
   • Identifying incomplete assessments
   • Recognizing control gaps
   • Understanding vulnerability management
   • Evaluating form design
   • Assessing network architecture

================================================================================
QUALITY ASSURANCE
================================================================================

All documents have been verified for:
✓ Valid PDF format (version 1.4)
✓ Proper page sizing (A4)
✓ Professional layout and formatting
✓ Realistic organizational context
✓ Consistent headers and footers
✓ Page numbering
✓ Professional color scheme
✓ Readable text and tables
✓ Proper image/diagram rendering

================================================================================
CONTACT & SUPPORT
================================================================================

These documents were generated for ISO 27001 compliance testing purposes.
For questions about specific gaps or testing scenarios, refer to:
  • AUDITOR_TESTING_GUIDE.txt (for detailed guidance)
  • GENERATION_SUMMARY.md (for technical details)
  • PDF_MANIFEST.txt (for document inventory)

================================================================================
LEGAL DISCLAIMER
================================================================================

These documents are FICTIONAL TEST CASE MATERIALS for:
• ISO 27001 compliance testing
• Auditor training and assessment
• Security control evaluation
• Internal audit exercises

HorseInsure Pty Ltd and all mentioned companies, personnel, and systems
are FICTIONAL. Any resemblance to real companies is coincidental.

These documents are intended for INTERNAL USE ONLY in compliance testing
and auditor training contexts.

================================================================================
End of README
================================================================================
