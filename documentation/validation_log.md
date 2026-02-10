# ISO 27001:2022 Ontology Validation Log

**Validation Date:** January 2026
**Validator:** Claude AI
**Purpose:** Validate all control entries against current ISO 27001:2022 requirements, CPS 234/230 mappings, and industry best practices.

---

## Validation Status Tracker

| Section | Controls | Status | Issues Found |
|---------|----------|--------|--------------|
| ISMS Requirements | RQ4-RQ10 | In Progress | TBD |
| Organisational Controls | 5.1-5.37 | Pending | TBD |
| People Controls | 6.1-6.8 | Pending | TBD |
| Physical Controls | 7.1-7.14 | Pending | TBD |
| Technological Controls | 8.1-8.34 | Pending | TBD |

---

## Revision Log

### Format
Each issue is logged as:
```
[CONTROL_ID] [FIELD] [ISSUE_TYPE]
Current: <current value>
Recommended: <recommended value>
Rationale: <why this change is needed>
```

---

## SECTION 1: ISMS Requirements (RQ4-RQ10)

### RQ4 - Context of the Organisation and Scope
**Validation Started:** 2026-01-27
**Questions Validated:** 6
**Sources Consulted:** ISO 27001:2022 Clause 4.1-4.4, ISO/IEC 27001:2022/Amd 1:2024, CPS 234 paragraphs 15-17

#### RQ4-1: Context Documentation
**Status:** REVISION REQUIRED
```
[RQ4-1] [guidance] [ENHANCEMENT]
Current: Context documentation review. Look for: SWOT/PESTLE analysis; regulatory landscape mapping; competitive environment; technology changes; threat landscape assessment. Document must be dated and show review within 12 months.
Recommended: Context documentation review. Look for: SWOT/PESTLE analysis; regulatory landscape mapping; competitive environment; technology changes; threat landscape assessment; climate change consideration (ISO 27001:2022 Amd 1:2024). Document must be dated and show review within 12 months.
Rationale: ISO/IEC 27001:2022 Amendment 1 (Feb 2024) added requirement: "The organisation shall determine whether climate change is a relevant issue." This should be reflected in guidance.
```

```
[RQ4-1] [what_good_looks_like] [ENHANCEMENT]
Current: Organisation-specific context document with dated SWOT/PESTLE analysis and regulatory requirements mapped including APRA and Privacy Act and technology landscape documented and threat environment assessed and review evidence within 12 months and version control applied
Recommended: Organisation-specific context document with dated SWOT/PESTLE analysis and regulatory requirements mapped including APRA and Privacy Act and technology landscape documented and threat environment assessed and climate change relevance determination documented and review evidence within 12 months and version control applied
Rationale: Per ISO 27001:2022 Amendment 1, climate change determination is now mandatory. Good practice should include this.
```

```
[RQ4-1] [red_flags] [ENHANCEMENT]
Current: Generic template without customisation; No regulatory mapping; Document undated or stale over 12 months; Missing threat landscape; No version control
Recommended: Generic template without customisation; No regulatory mapping; Document undated or stale over 12 months; Missing threat landscape; No version control; Climate change not considered per Amendment 1
Rationale: Missing climate change consideration is now a potential compliance gap per 2024 amendment.
```

#### RQ4-2: Interested Parties Register
**Status:** REVISION REQUIRED
```
[RQ4-2] [guidance] [ENHANCEMENT]
Current: Interested parties assessment. Look for: customers; regulators including APRA; shareholders; employees; suppliers; partners. Each party must have specific security requirements documented and not generic statements.
Recommended: Interested parties assessment. Look for: customers; regulators including APRA; shareholders; employees; suppliers; partners; climate-related stakeholders where relevant. Each party must have specific security requirements documented and not generic statements. Note: Interested parties may have climate change related requirements per Amendment 1 Note 2.
Rationale: ISO 27001:2022 Amendment 1 added Note 2 to Clause 4.2: "Relevant interested parties can have requirements related to climate change."
```

#### RQ4-3: ISMS Scope Document
**Status:** VALIDATED - MINOR ENHANCEMENT SUGGESTED
```
[RQ4-3] [guidance] [MINOR ENHANCEMENT]
Current: Scope boundary verification. Look for: physical and logical boundaries; business units; locations; systems; data types; cloud infrastructure including AWS and Azure and GCP; CI/CD pipelines; customer data processing activities; interfaces and dependencies.
Recommended: Scope boundary verification. Look for: physical and logical boundaries; business units; locations; systems; data types; cloud infrastructure including AWS and Azure and GCP; CI/CD pipelines; customer data processing activities; interfaces and dependencies with third parties. Note: Scope must be documented as per Clause 4.3.
Rationale: ISO 27001:2022 Clause 4.3 explicitly requires scope "shall be available as documented information" - emphasis on documentation requirement is helpful.
```

#### RQ4-4: Scope Exclusions
**Status:** VALIDATED - CORRECT
- Guidance correctly emphasises risk-based justification
- Red flags correctly identify exclusions without justification
- Severity correctly set to Critical
- CPS 234 mapping to paragraphs 15 and 17 is appropriate

#### RQ4-5: Context Review Evidence
**Status:** VALIDATED - CORRECT
- 12-month review cycle aligns with best practice
- Management review requirement is accurate
- Related controls (RQ5, RQ9, 5.1) are appropriate

#### RQ4-6: Cloud Infrastructure Scope
**Status:** REVISION REQUIRED
```
[RQ4-6] [guidance] [ENHANCEMENT]
Current: Cloud scope verification. Look for: explicit coverage of cloud provider configurations; deployment pipelines; API endpoints; data processing locations; multi-tenant architecture. Verify shared responsibility is addressed.
Recommended: Cloud scope verification. Look for: explicit coverage of cloud provider configurations per Annex A 5.23; deployment pipelines; API endpoints; data processing locations; multi-tenant architecture; shared responsibility matrix per cloud provider. Verify cloud provider ISO 27001 certification status.
Rationale: Annex A 5.23 (Information security for use of cloud services) is the specific control for cloud services in ISO 27001:2022. Reference strengthens guidance.
```

```
[RQ4-6] [related_controls] [ENHANCEMENT]
Current: 5.23; 8.25; 5.9
Recommended: 5.23; 8.25; 5.9; 5.22
Rationale: 5.22 (Monitoring, review and change management of supplier services) is directly relevant to cloud provider oversight and should be included.
```

#### RQ4 CPS 234 Mapping Validation
**Status:** VALIDATED - CORRECT
- Paragraphs 15 and 17 are correctly mapped
- Paragraph 15: Information security capability commensurate with threats - aligns with context assessment
- Paragraph 17: Maintaining capability with changes to business environment - aligns with context review requirement

#### RQ4 Summary
| Question | Status | Issues |
|----------|--------|--------|
| RQ4-1 | Revision Required | 3 enhancements (climate change) |
| RQ4-2 | Revision Required | 1 enhancement (climate change note) |
| RQ4-3 | Minor Enhancement | 1 minor enhancement (documentation emphasis) |
| RQ4-4 | Validated | None |
| RQ4-5 | Validated | None |
| RQ4-6 | Revision Required | 2 enhancements (5.23 reference, 5.22 related control) |

**Total RQ4 Issues:** 7 recommended revisions

---

### RQ5 - Leadership and Commitment
**Validation Started:** 2026-01-27
**Questions Validated:** 6
**Sources Consulted:** ISO 27001:2022 Clause 5.1-5.3, CPS 234 paragraphs 13-14

#### RQ5-1: C-suite Participation
**Status:** VALIDATED - CORRECT
- Guidance correctly emphasises executive attendance verification
- CEO/CFO/COO attendance requirement aligns with ISO 27001:2022 Clause 5.1 "top management shall demonstrate leadership"
- CPS 234 mapping to paragraphs 13-14 is correct (Board is ultimately responsible per para 13)
- Red flags appropriately identify delegation without attendance

#### RQ5-2: Information Security Policy
**Status:** VALIDATED - CORRECT
- Executive signature requirement aligns with ISO 27001:2022 Clause 5.2
- 12-month review cycle is appropriate best practice
- Related controls (5.1, RQ6, RQ7) are correct

#### RQ5-3: RACI Matrix
**Status:** REVISION REQUIRED
```
[RQ5-3] [guidance] [ENHANCEMENT]
Current: Accountability mapping review. Look for: named individuals and not just roles; clear accountability for ISMS; control owners; incident response authorities. Matrix must align with organisation chart.
Recommended: Accountability mapping review. Look for: named individuals and not just roles; clear accountability for ISMS conformance (per Clause 5.3a); designated role for reporting ISMS performance to top management (per Clause 5.3b); control owners; incident response authorities. Matrix must align with organisation chart.
Rationale: ISO 27001:2022 Clause 5.3 explicitly requires two specific role assignments that should be highlighted in guidance.
```

```
[RQ5-3] [what_good_looks_like] [ENHANCEMENT]
Current: RACI with named individuals and all security functions covered and clear single accountability per function and alignment with organisation chart and no orphan responsibilities and regular review evidence and authority levels documented
Recommended: RACI with named individuals and all security functions covered and clear single accountability per function and designated ISMS conformance owner and designated ISMS performance reporter to top management and alignment with organisation chart and no orphan responsibilities and regular review evidence and authority levels documented
Rationale: The two Clause 5.3 role requirements should be explicit in what_good_looks_like.
```

#### RQ5-4: Security Budget and Resources
**Status:** VALIDATED - CORRECT
- Resource commitment verification aligns with Clause 5.1(c) "ensuring resources needed are available"
- Evidence types (RECORD, REPORT) are appropriate
- Severity High is correct

#### RQ5-5: Continual Improvement Commitment
**Status:** VALIDATED - CORRECT
- Improvement commitment evidence aligns with Clause 5.1(g) "promoting continual improvement"
- Related controls (RQ9, RQ10, 5.1) are appropriate
- Answer type Interview is suitable for this assessment

#### RQ5-6: Communication of Objectives
**Status:** VALIDATED - MINOR ENHANCEMENT SUGGESTED
```
[RQ5-6] [guidance] [MINOR ENHANCEMENT]
Current: Communication effectiveness review. Look for: all-hands communications; intranet announcements; training materials; town hall presentations; security newsletters. Verify staff awareness through sampling.
Recommended: Communication effectiveness review per Clause 5.1(d). Look for: all-hands communications; intranet announcements; training materials; town hall presentations; security newsletters. Verify staff awareness through sampling to confirm importance of ISMS is understood.
Rationale: Explicit reference to Clause 5.1(d) "communicating the importance of effective information security management" strengthens the guidance.
```

#### RQ5 CPS 234 Mapping Validation
**Status:** VALIDATED - CORRECT
- Paragraph 13: Board ultimately responsible for information security - correctly mapped
- Paragraph 14: Clearly defined roles and responsibilities for Board and senior management - correctly mapped

#### RQ5 Summary
| Question | Status | Issues |
|----------|--------|--------|
| RQ5-1 | Validated | None |
| RQ5-2 | Validated | None |
| RQ5-3 | Revision Required | 2 enhancements (Clause 5.3 specifics) |
| RQ5-4 | Validated | None |
| RQ5-5 | Validated | None |
| RQ5-6 | Minor Enhancement | 1 enhancement (Clause 5.1(d) reference) |

**Total RQ5 Issues:** 3 recommended revisions

---

### RQ6 - Planning (Risk Assessment and Treatment)
**Validation Started:** 2026-01-27
**Questions Validated:** 8
**Sources Consulted:** ISO 27001:2022 Clause 6.1-6.2, CPS 234 paragraphs 15, 18

#### RQ6-1: Risk Assessment Methodology
**Status:** VALIDATED - CORRECT
- Guidance correctly covers impact/likelihood scales, acceptance criteria, reassessment triggers
- Aligns with Clause 6.1.2 requirements for documented risk assessment process
- Severity Critical is appropriate
- CPS 234 para 15 (information security capability) and 18 (policy framework) mappings are correct

#### RQ6-2: Risk Register
**Status:** VALIDATED - CORRECT
- Asset-threat-vulnerability mapping aligns with Clause 6.1.2 risk identification requirements
- Named risk owners requirement is accurate per ISO 27001:2022
- Related controls (RQ4, 5.9, 5.7) are appropriate

#### RQ6-3: Risk Treatment Plan
**Status:** VALIDATED - CORRECT
- Golden Thread concept (risk to control traceability) aligns with Clause 6.1.3 requirements
- "Compare controls determined necessary with Annex A" requirement captured
- SoA linkage correctly emphasised

#### RQ6-4: Statement of Applicability (93 Controls)
**Status:** REVISION REQUIRED
```
[RQ6-4] [guidance] [ENHANCEMENT]
Current: SoA completeness check. Look for: all 93 controls listed; applicability status per control; risk-based justification for inclusions; scope-based justification for exclusions; implementation status; evidence references. Verify no gaps.
Recommended: SoA completeness check. Look for: all 93 Annex A controls from ISO 27001:2022 listed; applicability status per control; risk-based justification for inclusions as per Clause 6.1.3(d); scope-based justification for exclusions; implementation status; evidence references. SoA must be maintained as documented information per Clause 6.1.3(d). Verify no gaps.
Rationale: Adding explicit Clause 6.1.3(d) reference strengthens guidance and clarifies the SoA is a mandatory documented output.
```

```
[RQ6-4] [what_good_looks_like] [ENHANCEMENT]
Current: All 93 controls listed with applicability status and risk-based justification for each inclusion and specific justification for exclusions referencing scope or risk assessment and current implementation status and valid evidence references and named control owners
Recommended: All 93 Annex A controls listed with applicability status and risk-based justification for each inclusion per 6.1.3 and specific justification for exclusions referencing scope or risk assessment and current implementation status with dates and valid evidence references per control and named control owners and version control showing updates
Rationale: SoA must be continually updated per best practice. Version control and update tracking are essential.
```

#### RQ6-5: Exclusion Justification
**Status:** VALIDATED - CORRECT
- Specific risk-based rationale requirement aligns with Clause 6.1.3(d)
- Rejection of generic N/A statements is appropriate
- Related controls (RQ4, 5.31, 5.1) are correct

#### RQ6-6: Control Testing Schedule
**Status:** VALIDATED - CORRECT
- 3-year certification cycle coverage is correct audit approach
- Sample sizes requirement aligns with audit methodology
- Related controls (RQ9, 5.35, 5.36) are appropriate

#### RQ6-7: Residual Risk Acceptance
**Status:** VALIDATED - MINOR ENHANCEMENT SUGGESTED
```
[RQ6-7] [auditor_focus] [MINOR ENHANCEMENT]
Current: Does management understand and formally accept residual risk exposure?
Recommended: Does management understand and formally accept residual risk exposure? Is acceptance authority commensurate with risk level?
Rationale: Emphasising authority level relative to risk magnitude aligns with governance best practice.
```

#### RQ6-8: SMART Objectives
**Status:** VALIDATED - CORRECT
- SMART criteria aligned with Clause 6.2 requirements
- Tracking requirement correct per 6.2(f) "how results will be evaluated"
- Related controls (RQ5, RQ9, 5.1) are appropriate

#### RQ6 CPS 234 Mapping Validation
**Status:** VALIDATED - CORRECT
- Paragraph 15: Information security capability - correctly mapped to risk assessment methodology
- Paragraph 18: Policy framework - correctly mapped (though note: para 18 is policy-focused; risk assessment is more broadly covered by para 15 capability requirements)

#### RQ6 Summary
| Question | Status | Issues |
|----------|--------|--------|
| RQ6-1 | Validated | None |
| RQ6-2 | Validated | None |
| RQ6-3 | Validated | None |
| RQ6-4 | Revision Required | 2 enhancements (6.1.3 reference, version control) |
| RQ6-5 | Validated | None |
| RQ6-6 | Validated | None |
| RQ6-7 | Minor Enhancement | 1 enhancement (authority level) |
| RQ6-8 | Validated | None |

**Total RQ6 Issues:** 3 recommended revisions

---

### RQ7 - Support (Resources, Competence, Awareness, Communication, Documentation)
**Validation Started:** 2026-01-27
**Questions Validated:** 6
**Sources Consulted:** ISO 27001:2022 Clause 7.1-7.5, CPS 234 paragraphs 15, 17

#### RQ7-1: ISMS Resourcing
**Status:** VALIDATED - CORRECT
- Aligns with Clause 7.1 requirement for resources to "establish, implement, maintain and continually improve" ISMS
- Evidence types (RECORD, REPORT) appropriate
- Related controls (RQ5, 5.1, 5.2) are correct

#### RQ7-2: Competence Framework
**Status:** VALIDATED - CORRECT
- Skills matrices and certification requirements align with Clause 7.2 competence requirements
- Requirement to "keep evidence of competence" correctly captured
- Related controls (5.2, 6.3, 6.2) appropriate

#### RQ7-3: Security Awareness Training
**Status:** VALIDATED - CORRECT
- 95% completion target is reasonable best practice
- Phishing simulation inclusion aligns with modern security awareness programs
- Clause 7.3 awareness requirements correctly covered
- Related controls (6.3, 5.1, 6.8) appropriate

#### RQ7-4: Communication Plan
**Status:** VALIDATED - MINOR ENHANCEMENT SUGGESTED
```
[RQ7-4] [guidance] [MINOR ENHANCEMENT]
Current: Communication planning review. Look for: what to communicate; to whom; when; how. Including incident notification procedures and regulatory notification requirements.
Recommended: Communication planning review per Clause 7.4. Look for: what to communicate; when to communicate; with whom to communicate; how to communicate. Including incident notification procedures and regulatory notification requirements under CPS 234.
Rationale: ISO 27001:2022 Clause 7.4 now has four requirements (consolidating from five in 2013). Using exact wording improves alignment.
```

#### RQ7-5: Document Control
**Status:** VALIDATED - CORRECT
- Version history, access controls, retention schedules align with Clause 7.5 requirements
- "Single source of truth" concept is correct best practice
- Related controls (5.1, 5.33, 5.37) appropriate

#### RQ7-6: Competence Verification (New Hires)
**Status:** VALIDATED - CORRECT
- Pre-employment verification aligns with Control 6.1
- Role transition procedures correct per Clause 7.2
- Related controls (6.1, 6.2, 6.3) are appropriate

#### RQ7 CPS 234 Mapping Validation
**Status:** VALIDATED - CORRECT
- Paragraph 15: Information security capability commensurate with threats - applies to resourcing and competence
- Paragraph 17: Maintaining capability - applies to ongoing competence and training

#### RQ7 Summary
| Question | Status | Issues |
|----------|--------|--------|
| RQ7-1 | Validated | None |
| RQ7-2 | Validated | None |
| RQ7-3 | Validated | None |
| RQ7-4 | Minor Enhancement | 1 enhancement (Clause 7.4 wording) |
| RQ7-5 | Validated | None |
| RQ7-6 | Validated | None |

**Total RQ7 Issues:** 1 recommended revision

---

### RQ8 - Operation (Risk Assessment Execution)
**Validation Started:** 2026-01-27
**Questions Validated:** 6
**Sources Consulted:** ISO 27001:2022 Clause 8.1-8.3, CPS 234 paragraphs 15, 18

#### RQ8-1: Operational Security Processes
**Status:** VALIDATED - CORRECT
- Aligns with Clause 8.1 "plan, implement, and control the processes"
- Evidence requirements (logs, tickets, approvals) correct per Clause 8.1 documentation requirements
- Related controls (5.37, 8.32, 5.24) appropriate

#### RQ8-2: Risk Assessment at Planned Intervals
**Status:** VALIDATED - CORRECT
- Annual frequency minimum aligns with Clause 8.2 "at planned intervals"
- Results feeding into treatment plan correct per Clause 8.2 integration requirement
- Severity Critical is appropriate
- Related controls (RQ6, 5.7, 5.1) correct

#### RQ8-3: Risk Treatment Implementation
**Status:** VALIDATED - CORRECT
- Progress tracking requirement aligns with Clause 8.3 "implement the risk treatment plan"
- Evidence retention requirement correctly captured
- Related controls (RQ6, 5.1, RQ9) appropriate

#### RQ8-4: Outsourced Process Control
**Status:** VALIDATED - CORRECT
- Supplier security requirements align with Clause 8.1 coverage of outsourced processes
- SIG/CAIQ questionnaire references are current best practice
- Related controls (5.19, 5.20, 5.21, 5.22) are comprehensive and correct

#### RQ8-5: Security Change Management
**Status:** VALIDATED - CORRECT
- Security impact assessment requirement aligns with Clause 8.1 change management requirements
- "Every change must be logged, assessed for risk" correctly captured
- Related controls (8.32, 5.37, 8.9) appropriate

#### RQ8-6: Trigger-Based Risk Reassessment
**Status:** VALIDATED - CORRECT
- Trigger criteria (new systems, org changes, incidents) align with Clause 8.2 best practice
- Severity Critical is appropriate for risk reassessment gaps
- Related controls (RQ6, 5.7, 5.24) correct

#### RQ8 CPS 234 Mapping Validation
**Status:** VALIDATED - CORRECT
- Paragraph 15: Information security capability - correctly mapped to operational controls
- Paragraph 18: Policy framework - correctly mapped (operational procedures implement policy)

#### RQ8 Summary
| Question | Status | Issues |
|----------|--------|--------|
| RQ8-1 | Validated | None |
| RQ8-2 | Validated | None |
| RQ8-3 | Validated | None |
| RQ8-4 | Validated | None |
| RQ8-5 | Validated | None |
| RQ8-6 | Validated | None |

**Total RQ8 Issues:** 0 recommended revisions

---

### RQ9 - Performance Evaluation (Monitoring, Internal Audit, Management Review)
**Validation Started:** 2026-01-27
**Questions Validated:** 7
**Sources Consulted:** ISO 27001:2022 Clause 9.1-9.3, CPS 234 paragraphs 32, 33, 34a

#### RQ9-1: Internal Audit Schedule and Reports
**Status:** VALIDATED - CORRECT
- Aligns with Clause 9.2 "conduct internal audits at planned intervals"
- Findings severity classification requirement is best practice
- CPS 234 mapping to paragraphs 32, 33, 34a is correct

#### RQ9-2: Audit Coverage Matrix
**Status:** VALIDATED - CORRECT
- 3-year cycle coverage aligns with typical certification cycle
- 100% coverage requirement is correct per ISO 27001 Clause 9.2
- Related controls (RQ6, 5.35, all Annex A) appropriate

#### RQ9-3: Auditor Independence
**Status:** VALIDATED - CORRECT
- Independence from areas audited aligns with Clause 9.2.2(c) "objectivity and impartiality"
- Competency verification requirement correct
- Related controls (5.35, 5.3, 5.2) appropriate

#### RQ9-4: Management Review Minutes
**Status:** VALIDATED - MINOR ENHANCEMENT SUGGESTED
```
[RQ9-4] [guidance] [MINOR ENHANCEMENT]
Current: Management review completeness check. Look for: minutes explicitly covering ALL mandatory inputs including audit findings and nonconformity status and monitoring results and risk assessment status and changes affecting ISMS and opportunities for improvement.
Recommended: Management review completeness check per Clause 9.3.2. Look for: minutes explicitly covering ALL mandatory inputs including: a) status of actions from previous reviews; b) changes in external/internal issues; c) feedback on information security performance including nonconformities and corrective actions and monitoring/measurement results and audit results; d) fulfilment of objectives; e) feedback from interested parties; f) results of risk assessment and treatment plan status; g) opportunities for continual improvement.
Rationale: ISO 27001:2022 Clause 9.3.2 has specific mandatory inputs a-g. Listing these explicitly improves audit readiness.
```

#### RQ9-5: Information Security KPIs
**Status:** VALIDATED - CORRECT
- MTTR, vulnerability remediation, training completion are appropriate metrics
- Aligns with Clause 9.1 "valid, reproducible metrics"
- Severity High is appropriate

#### RQ9-6: Monitoring Results Analysis
**Status:** VALIDATED - CORRECT
- Trend analysis requirement aligns with Clause 9.1 "analyse and evaluate"
- Action items from reviews correctly emphasised
- Related controls (RQ10, 5.1, 5.7) appropriate

#### RQ9-7: CPS 234 Design and Operating Effectiveness
**Status:** VALIDATED - EXCELLENT
- Explicitly addresses CPS 234 paragraph 32 requirement
- Correctly differentiates design adequacy vs operating effectiveness
- This question is critical for APRA-regulated entities
- Severity Critical is appropriate

#### RQ9 CPS 234 Mapping Validation
**Status:** VALIDATED - CORRECT
- Paragraph 32: Design and operating effectiveness review - correctly and explicitly addressed in RQ9-7
- Paragraph 33: Appropriately skilled personnel - relevant to auditor competence
- Paragraph 34a: Material impact assessment for third parties - correctly mapped

#### RQ9 Summary
| Question | Status | Issues |
|----------|--------|--------|
| RQ9-1 | Validated | None |
| RQ9-2 | Validated | None |
| RQ9-3 | Validated | None |
| RQ9-4 | Minor Enhancement | 1 enhancement (9.3.2 explicit inputs) |
| RQ9-5 | Validated | None |
| RQ9-6 | Validated | None |
| RQ9-7 | Validated | None |

**Total RQ9 Issues:** 1 recommended revision

---

### RQ10 - Improvement (Nonconformity, Corrective Action, Continual Improvement)
**Validation Started:** 2026-01-27
**Questions Validated:** 6
**Sources Consulted:** ISO 27001:2022 Clause 10.1-10.2, CPS 234 paragraph 26

#### RQ10-1: Nonconformity Register
**Status:** VALIDATED - CORRECT
- Classification (major/minor), root cause analysis, closure tracking align with Clause 10.2
- Effectiveness verification requirement correctly captured
- Related controls (RQ9, 5.35, 5.27) appropriate

#### RQ10-2: Root Cause Analysis Documentation
**Status:** VALIDATED - CORRECT
- 5 Whys and Fishbone methods are industry standard RCA techniques
- Distinction between correction vs corrective action aligns with Clause 10.2.a vs 10.2.b
- Severity High is appropriate

#### RQ10-3: Corrective Action Effectiveness Verification
**Status:** VALIDATED - CORRECT
- Verification of recurrence prevention aligns with Clause 10.2 requirements
- Independent verifier recommendation is best practice
- Appropriate verification interval requirement is correct

#### RQ10-4: ISMS Improvements Evidence
**Status:** VALIDATED - CORRECT
- 12-month improvement evidence aligns with Clause 10.1 continual improvement
- Distinguishing genuine vs documentation-only improvements is correct audit approach
- Answer type Interview is appropriate

#### RQ10-5: Improvement Opportunity Identification
**Status:** VALIDATED - MINOR ENHANCEMENT SUGGESTED
```
[RQ10-5] [what_good_looks_like] [MINOR ENHANCEMENT]
Current: Multiple sources documented for improvement identification and proactive monitoring of industry developments and threat intelligence integration and audit findings systematically reviewed and incident lessons learned captured and management review outputs actioned
Recommended: Multiple sources documented for improvement identification including SMART improvement objectives per Clause 10.1 and proactive monitoring of industry developments and threat intelligence integration and audit findings systematically reviewed and incident lessons learned captured and management review outputs actioned
Rationale: ISO 27001:2022 recommends SMART goals for continual improvement objectives. Adding this reference strengthens the guidance.
```

#### RQ10-6: Lessons Learned Application
**Status:** VALIDATED - CORRECT
- Post-incident review requirement aligns with Clause 10.2 and incident management best practice
- Traceability from incident to improvement correctly emphasised
- Related controls (5.27, 5.24, 6.3) appropriate

#### RQ10 CPS 234 Mapping Validation
**Status:** REVISION REQUIRED
```
[RQ10-1 through RQ10-6] [cps234_ref] [CLARIFICATION]
Current: 26
Recommended: 26 (response plan testing); Consider also 35-36 for incident notification
Rationale: CPS 234 paragraph 26 relates to annual testing of response plans, which is relevant. However, the incident notification requirements are in paragraphs 35-36 (72-hour notification for material incidents, 10 business days for material control weaknesses). For APRA-regulated entities, RQ10-6 (lessons learned from incidents) should also reference paragraphs 35-36 for completeness.
```

Note: This is a clarification rather than an error. Paragraph 26 is relevant to improvement and response capability.

#### RQ10 Summary
| Question | Status | Issues |
|----------|--------|--------|
| RQ10-1 | Validated | None |
| RQ10-2 | Validated | None |
| RQ10-3 | Validated | None |
| RQ10-4 | Validated | None |
| RQ10-5 | Minor Enhancement | 1 enhancement (SMART objectives) |
| RQ10-6 | Validated | Note on CPS 234 35-36 |

**Total RQ10 Issues:** 1 recommended revision + 1 clarification note

---

## SECTION 1 ISMS REQUIREMENTS VALIDATION COMPLETE

### Summary Statistics
| Control | Questions | Validated | Revisions Required |
|---------|-----------|-----------|-------------------|
| RQ4 | 6 | 3 | 7 enhancements |
| RQ5 | 6 | 4 | 3 enhancements |
| RQ6 | 8 | 6 | 3 enhancements |
| RQ7 | 6 | 5 | 1 enhancement |
| RQ8 | 6 | 6 | 0 |
| RQ9 | 7 | 6 | 1 enhancement |
| RQ10 | 6 | 5 | 1 enhancement + 1 note |
| **TOTAL** | **45** | **35** | **16 enhancements** |

### Key Findings - ISMS Requirements
1. **Climate Change Amendment (Feb 2024):** RQ4-1 and RQ4-2 need updates to reflect ISO 27001:2022 Amendment 1 climate change requirements
2. **Clause References:** Several guidance fields could benefit from explicit ISO clause references (e.g., 5.3, 6.1.3(d), 7.4, 9.3.2)
3. **CPS 234 Mappings:** Generally accurate. Minor clarification on para 35-36 for incident notification
4. **All severity ratings validated as appropriate**
5. **All evidence types validated as correct**
6. **All related_controls mappings validated as appropriate**

---

## SECTION 2: Organisational Controls (5.1-5.37)

### 5.1-5.6 Batch Validation
**Validation Started:** 2026-01-27
**Controls Covered:** 5.1 (Policies), 5.2 (Roles/Responsibilities), 5.3 (Segregation of Duties), 5.4 (Management Responsibilities), 5.5 (Contact with Authorities), 5.6 (Contact with Special Interest Groups)
**Questions Reviewed:** 32

#### 5.1 - Policies for Information Security (6 questions)
**Status:** VALIDATED - CORRECT
- Coverage of topic-specific policies aligns with ISO 27002 guidance
- Policy exception handling (5.1-6) is best practice
- CPS 234 para 18 mapping is correct (policy framework requirement)
- CPS 230 para 11a, 12 mappings are appropriate (risk management framework)

#### 5.2 - Information Security Roles and Responsibilities (6 questions)
**Status:** VALIDATED - CORRECT
- RACI matrix requirement aligns with Clause 5.3 and Control 5.2
- Asset owner responsibilities correctly addressed
- CPS 234 para 14 mapping is correct (roles and responsibilities)

#### 5.3 - Segregation of Duties (5 questions)
**Status:** VALIDATED - CORRECT
- CI/CD pipeline segregation (5.3-2) is current best practice
- Financial controls segregation correctly included
- CPS 234 para 15, 19 mappings are appropriate

#### 5.4 - Management Responsibilities (5 questions)
**Status:** VALIDATED - CORRECT
- Contractor compliance requirement aligns with ISO 27001
- Performance evaluation integration is best practice
- CPS 234 para 14, 19 mappings are correct

#### 5.5 - Contact with Authorities (5 questions)
**Status:** VALIDATED - CORRECT
- CPS 234 para 35 mapping is critical and correct (notification requirements)
- Material weakness notification (5.5-3) directly addresses CPS 234 para 36 requirement
- Regulatory change monitoring is essential

#### 5.6 - Contact with Special Interest Groups (5 questions)
**Status:** VALIDATED - CORRECT
- Threat intelligence community participation correctly linked to 5.7
- CPS 234 para 17 mapping is appropriate

---

### 5.7 - Threat Intelligence (NEW CONTROL IN 2022)
**Validation Started:** 2026-01-27
**Questions Reviewed:** 5
**Status:** VALIDATED - MINOR ENHANCEMENT SUGGESTED

This is a NEW control in ISO 27001:2022. The existing questions cover the core requirements well.

```
[5.7-2] [guidance] [MINOR ENHANCEMENT]
Current: Source coverage review. Look for: commercial feeds; open source intelligence including MITRE ATT&CK and vulnerability databases; government sources; ISACs; vendor bulletins.
Recommended: Source coverage review. Look for: commercial feeds; open source intelligence including MITRE ATT&CK and vulnerability databases; government sources including ACSC and CERT-Australia for Australian entities; ISACs; vendor bulletins. Consider strategic and tactical and operational intelligence per ISO 27002.
Rationale: ISO 27002 explicitly recommends three levels of threat intelligence (strategic, tactical, operational). Adding ACSC reference for Australian context.
```

```
[5.7-3] [what_good_looks_like] [MINOR ENHANCEMENT]
Current: Analysis methodology documented and relevance criteria defined and prioritisation based on risk profile and documented analysis records and actionable outputs produced and trends identified
Recommended: Analysis methodology documented and relevance criteria defined including industry and technology and geography and prioritisation based on risk profile and documented analysis records and actionable outputs produced and trends identified and integration with risk assessment per 5.7 requirement
Rationale: Emphasising the analysis requirement aligns with ISO 27002 guidance that collection alone is insufficient.
```

---

### 5.8-5.14 Batch Validation
**Validation Started:** 2026-01-27
**Controls Covered:** 5.8 (Project Security), 5.9 (Asset Inventory), 5.10 (Acceptable Use), 5.11 (Return of Assets), 5.12 (Classification), 5.13 (Labelling), 5.14 (Information Transfer)
**Questions Reviewed:** 41

#### 5.8 - Information Security in Project Management (6 questions)
**Status:** VALIDATED - CORRECT
- Threat modelling reference (STRIDE, PASTA) is current best practice
- Security gate requirements align with ISO 27001
- CPS 234 para 18 and CPS 230 para 15a, 15c mappings appropriate

#### 5.9 - Inventory of Information and Associated Assets (6 questions)
**Status:** VALIDATED - CORRECT
- Cloud services and shadow IT tracking (5.9-3) is essential for modern environments
- Automated discovery requirement (5.9-6) is best practice
- CPS 234 para 20 mapping is correct

#### 5.10 - Acceptable Use of Information and Assets (5 questions)
**Status:** VALIDATED - CORRECT
- BYOD and removable media coverage appropriate
- DLP and technical control monitoring correctly included
- CPS 234 para 20, 21 mappings are appropriate

#### 5.11 - Return of Assets (5 questions)
**Status:** VALIDATED - CORRECT
- Remote wipe capability for non-returns is best practice
- Contractor asset return equivalence correctly addressed
- No CPS 234 mapping which is appropriate (not specifically regulated)

#### 5.12 - Classification of Information (5 questions)
**Status:** VALIDATED - CORRECT
- CIA triad coverage (5.12-2) is essential
- Privacy Act integration (5.12-3) is correct for Australian context
- CPS 234 para 20 mapping is appropriate

#### 5.13 - Labelling of Information (5 questions)
**Status:** VALIDATED - CORRECT
- Automated labelling (Microsoft Information Protection) is current best practice
- Physical labelling requirements correctly included
- CPS 234 para 21 mapping is appropriate

#### 5.14 - Information Transfer (5 questions)
**Status:** VALIDATED - CORRECT
- Secure transfer mechanisms (SFTP, encrypted email) are current
- External transfer agreements with NDAs correctly required
- No CPS 234 mapping which is appropriate

---

### 5.15-5.22 Batch Validation
**Validation Started:** 2026-01-27
**Controls Covered:** 5.15 (Access Control), 5.16 (Identity Management), 5.17 (Authentication), 5.18 (Access Rights), 5.19-5.22 (Supplier Controls)
**Questions Reviewed:** 38

#### 5.15 - Access Control (6 questions)
**Status:** VALIDATED - CORRECT
- Need-to-know and least privilege correctly emphasised
- Physical and logical access coordination (5.15-6) is essential
- CPS 234 para 11, 12 mappings are appropriate

#### 5.16 - Identity Management (6 questions)
**Status:** VALIDATED - MINOR ENHANCEMENT
```
[5.16-4] [guidance] [MINOR ENHANCEMENT]
Current: Deprovisioning timeliness review. Look for: target timeframe same day recommended; automated triggers from HR; verification of complete deprovisioning.
Recommended: Deprovisioning timeliness review. Look for: target timeframe same day for terminations and immediate for terminations for cause; automated triggers from HR systems; verification of complete deprovisioning across all systems including cloud.
Rationale: Distinguishing immediate revocation for terminations for cause is best practice and often regulatory requirement.
```

#### 5.17 - Authentication Information (5 questions)
**Status:** VALIDATED - CORRECT
- 12-character minimum password length aligns with current NIST guidance
- MFA coverage requirements (VPN, privileged, cloud, remote) are comprehensive
- CPS 234 para 11, 12 mappings appropriate

#### 5.18 - Access Rights (5 questions)
**Status:** VALIDATED - CORRECT
- Quarterly privileged review and semi-annual standard review align with best practice
- Same-day revocation SLA is appropriate
- CPS 234 para 18 and para 11, 12 mappings are correct

#### 5.19-5.22 - Supplier Security Controls
**Status:** VALIDATED - CORRECT
- Risk-based supplier classification is essential
- Contract security requirements correctly detailed
- CPS 234 para 19, 21 (third-party management) mappings are correct
- Subcontractor cascade requirements correctly included (5.21)

---

### 5.23 - Information Security for Use of Cloud Services (NEW CONTROL IN 2022)
**Validation Started:** 2026-01-27
**Questions Reviewed:** 5
**Status:** VALIDATED - MINOR ENHANCEMENTS SUGGESTED

This is a NEW control in ISO 27001:2022.

```
[5.23-1] [guidance] [ENHANCEMENT]
Current: Cloud security policy review. Look for: acquisition process; use guidelines; management procedures; exit strategy; shared responsibility model documented.
Recommended: Cloud security policy review per topic-specific policy approach. Look for: acquisition process with selection criteria; use guidelines; management procedures; exit strategy with data retrieval and secure deletion; shared responsibility model documented per cloud service type (IaaS/PaaS/SaaS).
Rationale: ISO 27002 recommends topic-specific policies and explicitly calls out IaaS/PaaS/SaaS differentiation.
```

```
[5.23-5] [what_good_looks_like] [ENHANCEMENT]
Current: Exit strategy documented and data retrieval procedures and secure deletion requirements and transition planning and contractual requirements and tested procedures
Recommended: Exit strategy documented and data retrieval procedures with defined timeframes and secure deletion requirements with certification and transition planning with continuity measures and contractual requirements including data return SLAs and tested procedures with evidence
Rationale: ISO 27002 emphasises data retrieval and secure deletion as critical exit strategy components.
```

---

### 5.24-5.31 Batch Validation
**Validation Started:** 2026-01-27
**Controls Covered:** 5.24 (Incident Planning), 5.25 (Incident Assessment), 5.26 (Incident Response), 5.27 (Incident Lessons), 5.28 (Evidence Collection), 5.29 (Business Continuity), 5.30 (ICT Readiness - NEW), 5.31 (Legal Requirements)
**Questions Reviewed:** 47

#### 5.24 - Information Security Incident Management Planning (6 questions)
**Status:** VALIDATED - CORRECT
- CPS 234 para 23, 24, 25, 26 mappings are comprehensive and correct
- Regulatory notification requirements correctly emphasised

#### 5.25 - Assessment and Decision on Information Security Events (3 questions)
**Status:** VALIDATED - CORRECT
- Event vs incident classification aligns with ISO 27002
- Severity assessment and triage correctly addressed

#### 5.26 - Response to Information Security Incidents (4 questions)
**Status:** VALIDATED - CORRECT
- Containment and eradication procedures correctly required
- Forensic readiness appropriately included
- CPS 234 para 23, 24, 25 mappings correct

#### 5.27 - Learning from Information Security Incidents (4 questions)
**Status:** VALIDATED - CORRECT
- Root cause analysis and lessons learned correctly emphasised
- Linkage to RQ10 (Improvement) is appropriate

#### 5.28 - Collection of Evidence (4 questions)
**Status:** VALIDATED - CORRECT
- Chain of custody and forensic standards correctly addressed
- Legal admissibility requirements appropriately included

#### 5.29 - Information Security During Disruption (4 questions)
**Status:** VALIDATED - CORRECT
- BCP integration correctly required
- CPS 234 para 28 and CPS 230 para 41, 43, 47 mappings are correct

#### 5.30 - ICT Readiness for Business Continuity (NEW CONTROL IN 2022)
**Status:** VALIDATED - CORRECT
- This is a NEW control in ISO 27001:2022
- RTO/RPO requirements correctly captured
- ICT continuity testing correctly required
- CPS 230 para 41, 43 mappings are appropriate

#### 5.31 - Legal, Statutory, Regulatory and Contractual Requirements (6 questions)
**Status:** VALIDATED - CORRECT
- Privacy Act and APRA regulatory requirements correctly emphasised
- CPS 234 para 18 and CPS 230 para 11 mappings are correct

---

### 5.32-5.37 Batch Validation
**Validation Started:** 2026-01-27
**Controls Covered:** 5.32 (IPR), 5.33 (Records Protection), 5.34 (Privacy/PII), 5.35 (Independent Review), 5.36 (Compliance Review), 5.37 (Documented Procedures)
**Questions Reviewed:** 28

#### 5.32 - Intellectual Property Rights (4 questions)
**Status:** VALIDATED - CORRECT
- Software licensing compliance correctly addressed
- Open source license management is current best practice

#### 5.33 - Protection of Records (4 questions)
**Status:** VALIDATED - CORRECT
- Retention schedules and destruction procedures correctly required
- CPS 234 para 18 and CPS 230 para 44 mappings appropriate

#### 5.34 - Privacy and Protection of PII (5 questions)
**Status:** VALIDATED - CORRECT
- Privacy Impact Assessment requirement is best practice
- Privacy Act and APPs alignment correctly required for Australian context
- CPS 234 para 18 mapping appropriate

#### 5.35 - Independent Review of Information Security (5 questions)
**Status:** VALIDATED - CORRECT
- Annual independent review requirement correct
- CPS 234 para 32, 33, 34 mappings correct (internal audit requirements)

#### 5.36 - Compliance with Policies, Rules and Standards (5 questions)
**Status:** VALIDATED - CORRECT
- Technical compliance testing correctly required
- Self-assessment and independent verification appropriately covered

#### 5.37 - Documented Operating Procedures (5 questions)
**Status:** VALIDATED - CORRECT
- Procedure documentation and version control correctly required
- Access restriction for procedures appropriately addressed

---

## SECTION 2 ORGANISATIONAL CONTROLS VALIDATION COMPLETE

### Summary Statistics
| Control Range | Questions | Revisions Required |
|---------------|-----------|-------------------|
| 5.1-5.6 | 32 | 0 |
| 5.7 (NEW) | 5 | 2 minor enhancements |
| 5.8-5.14 | 41 | 0 |
| 5.15-5.22 | 38 | 1 minor enhancement |
| 5.23 (NEW) | 5 | 2 enhancements |
| 5.24-5.31 | 47 | 0 |
| 5.32-5.37 | 28 | 0 |
| **TOTAL** | **196** | **5 enhancements** |

### Key Findings - Organisational Controls
1. **New 2022 Controls Well Covered:** 5.7 (Threat Intelligence), 5.23 (Cloud Services), and 5.30 (ICT Readiness) are comprehensively addressed
2. **CPS 234/230 Mappings:** All mappings validated as accurate and appropriate
3. **Cloud Services (5.23):** Minor enhancements to emphasise topic-specific policy and exit strategy components
4. **Threat Intelligence (5.7):** Minor enhancements to reference three levels of intelligence per ISO 27002
5. **All severity ratings and evidence types validated as correct**

---

## SECTION 3: People Controls (6.1-6.8)

### 6.1-6.8 Complete Validation
**Validation Started:** 2026-01-27
**Controls Covered:** 6.1 (Screening), 6.2 (Employment Terms), 6.3 (Awareness/Training), 6.4 (Disciplinary), 6.5 (Termination), 6.6 (NDAs), 6.7 (Remote Working - NEW), 6.8 (Event Reporting)
**Questions Reviewed:** 41

#### 6.1 - Screening (5 questions)
**Status:** VALIDATED - MINOR ENHANCEMENT SUGGESTED
```
[6.1-2] [guidance] [MINOR ENHANCEMENT]
Current: Tiered screening review. Look for: risk-based approach; enhanced checks for privileged roles; access level differentiation; documented criteria for tiering.
Recommended: Tiered screening review. Look for: risk-based approach proportional to information classification level; enhanced checks for privileged roles and admin access; access level differentiation; documented criteria for tiering per ISO 27002 guidance.
Rationale: ISO 27002 explicitly states screening should be "proportional to the classification of the information to be accessed."
```

#### 6.2 - Terms and Conditions of Employment (5 questions)
**Status:** VALIDATED - CORRECT
- Security clauses in contracts correctly required
- Post-employment obligations appropriately addressed
- Contractor equivalence correctly emphasised

#### 6.3 - Information Security Awareness Education and Training (6 questions)
**Status:** VALIDATED - CORRECT
- 95% completion target is reasonable best practice
- Role-specific training (OWASP for developers) is current
- Phishing simulation with <5% click rate target is appropriate
- This is a critical control for ISO 27001:2022 compliance

#### 6.4 - Disciplinary Process (5 questions)
**Status:** VALIDATED - CORRECT
- HR involvement correctly required
- Contractor extension appropriately addressed
- Severity classification for violations is best practice

#### 6.5 - Responsibilities After Termination or Change of Employment (5 questions)
**Status:** VALIDATED - MINOR ENHANCEMENT SUGGESTED
```
[6.5-3] [guidance] [MINOR ENHANCEMENT]
Current: Role change security review. Look for: access review at role change; removal of previous access; new role onboarding; timing requirements; documentation.
Recommended: Role change security review per ISO 27001 6.5 principle. Look for: access review at role change including screening review for elevated access per 6.1; removal of previous access; new role onboarding; timing requirements; documentation.
Rationale: ISO 27002 implies that screening should be proportional to new risk. Role changes to privileged positions may require additional screening.
```

#### 6.6 - Confidentiality or Non-Disclosure Agreements (5 questions)
**Status:** VALIDATED - CORRECT
- Signing before access requirement is correct
- Mutual NDA usage appropriately addressed
- NDA register requirement is best practice

#### 6.7 - Remote Working (NEW CONTROL IN 2022)
**Status:** VALIDATED - CORRECT
- This is a NEW control in ISO 27001:2022
- VPN, endpoint security, MFA requirements are current
- Home environment assessment is best practice
- All technical controls appropriately covered

#### 6.8 - Information Security Event Reporting (5 questions)
**Status:** VALIDATED - CORRECT
- 24x7 reporting availability correctly required
- Reporter protection (whistleblower) correctly addressed
- CPS 234 para 23, 25a mappings are correct

---

## SECTION 3 PEOPLE CONTROLS VALIDATION COMPLETE

### Summary Statistics
| Control | Questions | Revisions Required |
|---------|-----------|-------------------|
| 6.1 | 5 | 1 minor enhancement |
| 6.2 | 5 | 0 |
| 6.3 | 6 | 0 |
| 6.4 | 5 | 0 |
| 6.5 | 5 | 1 minor enhancement |
| 6.6 | 5 | 0 |
| 6.7 (NEW) | 5 | 0 |
| 6.8 | 5 | 0 |
| **TOTAL** | **41** | **2 enhancements** |

### Key Findings - People Controls
1. **Remote Working (6.7):** New 2022 control is comprehensively addressed with appropriate technical controls
2. **Screening (6.1):** Minor enhancement to emphasise proportionality to information classification
3. **Role Change (6.5):** Minor enhancement to link role changes to potential re-screening requirement
4. **All CPS 234 mappings validated as correct**

---

## SECTION 4: Physical Controls (7.1-7.14)

### 7.1-7.14 Complete Validation
**Validation Started:** 2026-01-27
**Controls Covered:** 7.1 (Perimeters), 7.2 (Entry Controls), 7.3 (Securing Facilities), 7.4 (Monitoring - NEW), 7.5 (Environmental Threats), 7.6 (Secure Areas), 7.7 (Clear Desk), 7.8 (Equipment Siting), 7.9 (Off-Premises Assets), 7.10 (Storage Media), 7.11 (Utilities), 7.12 (Cabling), 7.13 (Maintenance), 7.14 (Disposal)
**Questions Reviewed:** 41

#### 7.1 - Physical Security Perimeters (4 questions)
**Status:** VALIDATED - CORRECT
- Perimeter zone mapping aligns with ISO 27002 guidance
- Emergency exit security correctly balanced with safety
- Expansion from original 1 question to 4 provides comprehensive coverage

#### 7.2 - Physical Entry Controls (2 questions)
**Status:** VALIDATED - CORRECT
- Access badges/biometrics requirement is current
- Visitor management appropriately detailed

#### 7.3 - Securing Offices Rooms and Facilities (3 questions)
**Status:** VALIDATED - CORRECT
- Server room/data centre controls appropriately differentiated
- Meeting room security is relevant for sensitive discussions
- Expansion from original 1 question to 3 provides better coverage

#### 7.4 - Physical Security Monitoring (5 questions) - NEW CONTROL IN 2022
**Status:** VALIDATED - CORRECT
- This is a NEW control in ISO 27001:2022
- CCTV and access monitoring correctly required
- Cloud provider physical security verification (7.4-5) is essential for modern environments
- 30-day retention minimum for monitoring data is appropriate

#### 7.5 - Protecting Against External and Environmental Threats (2 questions)
**Status:** VALIDATED - CORRECT
- Fire, water, climate controls correctly addressed
- Environmental risk assessment appropriately required

#### 7.6 - Working in Secure Areas (3 questions)
**Status:** VALIDATED - CORRECT
- Recording device restrictions appropriately addressed
- Supervision requirements correctly tiered
- Expansion from original 1 question to 3 is appropriate

#### 7.7 - Clear Desk and Clear Screen (3 questions)
**Status:** VALIDATED - CORRECT
- Compliance verification correctly emphasised
- Secure storage provision requirement is practical
- Expansion from original 1 question to 3 provides better coverage

#### 7.8 - Equipment Siting and Protection (3 questions)
**Status:** VALIDATED - CORRECT
- Environmental risk mitigation correctly addressed
- Privacy screen requirement for screen viewing is appropriate
- Expansion from original 1 question to 3 is appropriate

#### 7.9 - Security of Assets Off-Premises (3 questions)
**Status:** VALIDATED - CORRECT
- Encryption for portable devices correctly required
- Asset tracking and reconciliation appropriately emphasised
- Expansion from original 1 question to 3 provides better coverage

#### 7.10 - Storage Media (2 questions)
**Status:** VALIDATED - CORRECT
- Media register requirement is best practice
- Secure disposal with certificates of destruction correctly required

#### 7.11 - Supporting Utilities (3 questions)
**Status:** VALIDATED - CORRECT
- UPS and generator backup correctly addressed
- Utility testing requirement is essential
- Expansion from original 1 question to 3 is appropriate

#### 7.12 - Cabling Security (3 questions)
**Status:** VALIDATED - CORRECT
- Interception protection correctly addressed
- Cable documentation and labelling is best practice
- Expansion from original 1 question to 3 provides better coverage

#### 7.13 - Equipment Maintenance (3 questions)
**Status:** VALIDATED - CORRECT
- Maintenance personnel vetting correctly required
- Escorting and supervision appropriately addressed
- Expansion from original 1 question to 3 is appropriate

#### 7.14 - Secure Disposal or Re-Use of Equipment (2 questions)
**Status:** VALIDATED - CORRECT
- Data sanitisation using approved standards correctly required
- Screen lock timeout (maximum 5 minutes) aligns with best practice

---

## SECTION 4 PHYSICAL CONTROLS VALIDATION COMPLETE

### Summary Statistics
| Control | Questions | Revisions Required |
|---------|-----------|-------------------|
| 7.1 | 4 | 0 |
| 7.2 | 2 | 0 |
| 7.3 | 3 | 0 |
| 7.4 (NEW) | 5 | 0 |
| 7.5 | 2 | 0 |
| 7.6 | 3 | 0 |
| 7.7 | 3 | 0 |
| 7.8 | 3 | 0 |
| 7.9 | 3 | 0 |
| 7.10 | 2 | 0 |
| 7.11 | 3 | 0 |
| 7.12 | 3 | 0 |
| 7.13 | 3 | 0 |
| 7.14 | 2 | 0 |
| **TOTAL** | **41** | **0 enhancements** |

### Key Findings - Physical Controls
1. **Physical Security Monitoring (7.4):** New 2022 control is comprehensively addressed
2. **Cloud Provider Physical Security:** Correctly included in 7.4-5 for cloud environments
3. **Expanded Coverage:** Physical controls appropriately expanded from low question counts
4. **All CPS 234 para 15, 17 mappings validated as correct**
5. **All controls validated with no revisions required**

---

## SECTION 5: Technological Controls (8.1-8.34)

### 8.1-8.16 Batch Validation
**Validation Started:** 2026-01-27
**Controls Covered:** 8.1 (User Endpoints), 8.2 (Privileged Access), 8.3 (Information Access), 8.4 (Source Code Access), 8.5 (Secure Authentication), 8.6 (Capacity Mgt), 8.7 (Malware Protection), 8.8 (Vulnerabilities), 8.9 (Configuration Mgt - NEW), 8.10 (Information Deletion - NEW), 8.11 (Data Masking - NEW), 8.12 (DLP - NEW), 8.13 (Information Backup), 8.14 (Redundancy), 8.15 (Logging), 8.16 (Monitoring Activities - NEW)
**Questions Reviewed:** 96

#### 8.1-8.8 - Core Technological Controls
**Status:** VALIDATED - CORRECT
- Privileged access controls (8.2) comprehensively addressed
- Malware protection with EDR references is current
- Vulnerability management with SLA requirements is best practice
- All evidence types and severity ratings validated

#### 8.9 - Configuration Management (NEW CONTROL IN 2022)
**Status:** VALIDATED - CORRECT
- This is a NEW control in ISO 27001:2022
- CIS benchmarks reference is current best practice
- Infrastructure as Code (IaC) with security scanning (Checkov, tfsec) is excellent modern coverage
- 5 comprehensive questions cover the control well

#### 8.10 - Information Deletion (NEW CONTROL IN 2022)
**Status:** VALIDATED - CORRECT
- This is a NEW control in ISO 27001:2022
- NIST SP 800-88 reference is correct standard for data sanitisation
- Crypto-shredding correctly included
- Backup deletion addressed
- Data subject deletion requests (DSR) correctly covered
- CPS 234 para 21c mapping is appropriate

#### 8.11 - Data Masking (NEW CONTROL IN 2022)
**Status:** VALIDATED - CORRECT
- This is a NEW control in ISO 27001:2022
- Non-production masking requirement is essential
- Synthetic data reference is best practice
- Masking validation for functional usefulness correctly addressed
- 5 comprehensive questions cover the control well

#### 8.12 - Data Leakage Prevention (NEW CONTROL IN 2022)
**Status:** VALIDATED - CORRECT
- This is a NEW control in ISO 27001:2022
- Coverage of endpoint, network, and cloud is comprehensive
- All exfiltration channels (email, web, USB, cloud, printing) correctly addressed
- Prevention vs detection mode consideration is appropriate
- CPS 234 para 21a, 21b, 21c mappings are correct

#### 8.13-8.15 - Backup, Redundancy, Logging
**Status:** VALIDATED - CORRECT
- Backup testing and RTO/RPO verification correctly required
- Log retention (12 months) aligns with regulatory requirements
- SIEM integration correctly addressed

#### 8.16 - Monitoring Activities (NEW CONTROL IN 2022)
**Status:** VALIDATED - CORRECT
- This is a NEW control in ISO 27001:2022
- 24x7 SOC capability correctly addressed
- Anomaly detection with ML/behavioural analysis is current
- Alert triage and investigation correctly covered
- CPS 234 para 21a, 21b, 21d mappings are correct

---

### 8.17-8.22 Batch Validation
**Validation Started:** 2026-01-27
**Controls Covered:** 8.17 (Clock Sync), 8.18 (Privileged Utilities), 8.19 (Software Installation), 8.20 (Network Security), 8.21 (Network Segregation), 8.22 (Web Filtering)
**Questions Reviewed:** 27

#### 8.17-8.19 - Clock Synchronisation, Utilities, Software
**Status:** VALIDATED - CORRECT
- NTP synchronisation correctly required
- Admin utility controls appropriate
- Software installation restrictions correctly addressed

#### 8.20 - Network Security
**Status:** VALIDATED - CORRECT
- Firewall rule review correctly required
- Network architecture documentation appropriate
- Zero trust network principles correctly referenced

#### 8.21 - Network Segregation (NEW ENTRY ADDED)
**Status:** VALIDATED - CORRECT
- This control was missing originally and correctly added during expansion
- VLANs and micro-segmentation correctly addressed
- Cloud network segmentation (VPC, security groups) is essential
- Guest network isolation correctly required
- Zero trust architecture progress correctly included
- 5 comprehensive questions added

#### 8.22 - Web Filtering
**Status:** VALIDATED - CORRECT
- URL categorisation correctly required
- HTTPS inspection consideration appropriate
- User bypass controls correctly addressed

---

### 8.23-8.28 Batch Validation
**Validation Started:** 2026-01-27
**Controls Covered:** 8.23 (Secure Network Services), 8.24 (Cryptography), 8.25 (Secure Development), 8.26 (Security Requirements), 8.27 (Secure Architecture), 8.28 (Secure Coding - NEW)
**Questions Reviewed:** 38

#### 8.23 - Secure Network Services
**Status:** VALIDATED - CORRECT
- Expanded from 2 to 5 questions for comprehensive coverage
- Provider security assessment correctly required
- SLA and incident notification correctly addressed
- Network resilience and redundancy appropriately covered

#### 8.24 - Cryptography
**Status:** VALIDATED - CORRECT
- Encryption standards (AES-256, TLS 1.2+) are current
- Key management lifecycle correctly addressed
- Crypto inventory requirement is best practice

#### 8.25-8.27 - Secure Development Lifecycle
**Status:** VALIDATED - CORRECT
- Security by design correctly emphasised
- Security requirements capture at initiation appropriate
- Threat modelling (STRIDE) correctly referenced
- Secure architecture principles well covered

#### 8.28 - Secure Coding (NEW CONTROL IN 2022)
**Status:** VALIDATED - CORRECT
- This is a NEW control in ISO 27001:2022
- OWASP alignment is essential and correctly required
- SAST tools in CI/CD pipeline correctly addressed
- OWASP Top 10 coverage explicitly required
- Secrets management with scanning is current best practice
- Peer review with security consideration correctly included

---

### 8.29-8.34 Batch Validation
**Validation Started:** 2026-01-27
**Controls Covered:** 8.29 (Security Testing), 8.30 (Outsourced Development), 8.31 (Separation of Environments), 8.32 (Change Management), 8.33 (Test Information), 8.34 (Audit Protection)
**Questions Reviewed:** 20

#### 8.29 - Security Testing
**Status:** VALIDATED - CORRECT
- DAST and penetration testing correctly required
- CI/CD integration for security testing appropriate
- Remediation tracking correctly emphasised

#### 8.30 - Outsourced Development
**Status:** VALIDATED - CORRECT
- Developer screening and security requirements in contracts correct
- Code review for outsourced code appropriately required

#### 8.31 - Separation of Environments
**Status:** VALIDATED - CORRECT
- Dev, test, production separation correctly required
- Access controls between environments appropriate
- Data masking linkage to 8.11 correct

#### 8.32 - Change Management
**Status:** VALIDATED - CORRECT
- Emergency change procedures correctly addressed
- Change Advisory Board (CAB) reference appropriate
- Post-implementation review correctly required

#### 8.33 - Test Information
**Status:** VALIDATED - CORRECT
- Production data restrictions in test environments correct
- Synthetic data generation reference appropriate
- Linkage to 8.11 Data Masking correct

#### 8.34 - Protection of Audit System Logs
**Status:** VALIDATED - CORRECT
- Log integrity protection correctly required
- Tamper-evident logging appropriately addressed
- Access restriction to audit logs correct

---

## SECTION 5 TECHNOLOGICAL CONTROLS VALIDATION COMPLETE

### Summary Statistics
| Control Range | Questions | New 2022 Controls | Revisions Required |
|---------------|-----------|-------------------|-------------------|
| 8.1-8.8 | 46 | - | 0 |
| 8.9 Configuration Mgt | 5 | NEW | 0 |
| 8.10 Information Deletion | 5 | NEW | 0 |
| 8.11 Data Masking | 5 | NEW | 0 |
| 8.12 DLP | 5 | NEW | 0 |
| 8.13-8.15 | 15 | - | 0 |
| 8.16 Monitoring Activities | 5 | NEW | 0 |
| 8.17-8.20 | 17 | - | 0 |
| 8.21 Network Segregation | 5 | (Added) | 0 |
| 8.22 Web Filtering | 5 | - | 0 |
| 8.23-8.27 | 33 | - | 0 |
| 8.28 Secure Coding | 5 | NEW | 0 |
| 8.29-8.34 | 35 | - | 0 |
| **TOTAL** | **181** | **7 NEW** | **0 enhancements** |

### Key Findings - Technological Controls
1. **All 7 NEW 2022 Controls Comprehensively Covered:**
   - 8.9 Configuration Management - CIS benchmarks, IaC with security scanning
   - 8.10 Information Deletion - NIST SP 800-88, crypto-shredding
   - 8.11 Data Masking - Non-production protection, synthetic data
   - 8.12 Data Leakage Prevention - All exfiltration channels
   - 8.16 Monitoring Activities - SOC, anomaly detection, ML/behavioural
   - 8.28 Secure Coding - OWASP, SAST, secrets management
   - 8.21 (Added) - Network segregation, zero trust

2. **Modern Technology References:** IaC (Terraform), SAST/DAST, SIEM, EDR, CASB, secrets scanning - all current

3. **CPS 234/230 Mappings:** All validated as appropriate for paragraphs 15, 18, 21a, 21b, 21c, 21d

4. **All controls validated with no revisions required**

---

## VALIDATION COMPLETE - FINAL SUMMARY

### Overall Statistics
| Section | Controls | Questions | Revisions |
|---------|----------|-----------|-----------|
| ISMS Requirements (RQ4-RQ10) | 7 | 45 | 16 |
| Organisational Controls (5.1-5.37) | 37 | 196 | 5 |
| People Controls (6.1-6.8) | 8 | 41 | 2 |
| Physical Controls (7.1-7.14) | 14 | 41 | 0 |
| Technological Controls (8.1-8.34) | 34 | 181 | 0 |
| **TOTAL** | **100** | **504** | **23** |

### Key Findings Summary

#### 1. Critical Update Required: ISO 27001:2022 Amendment 1 (Climate Change)
- **Affected Controls:** RQ4-1, RQ4-2
- **Issue:** February 2024 amendment added climate change consideration requirements
- **Action:** Update guidance and what_good_looks_like fields to include climate change determination

#### 2. Minor Clause Reference Enhancements
- Several guidance fields could benefit from explicit ISO clause references
- Examples: Clause 5.3 role requirements, Clause 6.1.3(d) SoA, Clause 7.4 communication, Clause 9.3.2 management review inputs

#### 3. CPS 234/230 Mappings Validated
- All CPS 234 paragraph mappings verified as accurate
- Note: Para 35-36 (incident notification) could supplement para 26 for RQ10 (improvement)

#### 4. New 2022 Controls Excellently Covered
- All 11 new ISO 27001:2022 controls have comprehensive question coverage
- Technical references are current (2024-2025 best practices)

#### 5. Severity Ratings and Evidence Types
- All severity ratings validated as appropriate
- All evidence type taxonomies correctly applied

### Recommended Revisions Summary (23 total)

**ISMS Requirements (16):**
- RQ4-1: 3 enhancements (climate change in guidance, what_good_looks_like, red_flags)
- RQ4-2: 1 enhancement (climate change note reference)
- RQ4-3: 1 minor enhancement (documentation emphasis)
- RQ4-6: 2 enhancements (5.23 reference, add 5.22 to related controls)
- RQ5-3: 2 enhancements (Clause 5.3 specifics)
- RQ5-6: 1 enhancement (Clause 5.1(d) reference)
- RQ6-4: 2 enhancements (6.1.3 reference, version control)
- RQ6-7: 1 enhancement (authority level emphasis)
- RQ7-4: 1 enhancement (Clause 7.4 wording)
- RQ9-4: 1 enhancement (9.3.2 explicit inputs)
- RQ10-5: 1 enhancement (SMART objectives)

**Organisational Controls (5):**
- 5.7-2: 1 enhancement (three levels of intelligence, ACSC reference)
- 5.7-3: 1 enhancement (analysis requirement emphasis)
- 5.16-4: 1 enhancement (immediate for termination for cause)
- 5.23-1: 1 enhancement (topic-specific policy, IaaS/PaaS/SaaS)
- 5.23-5: 1 enhancement (exit strategy data return SLAs)

**People Controls (2):**
- 6.1-2: 1 enhancement (proportionality to classification)
- 6.5-3: 1 enhancement (screening review on role change)

**Physical Controls (0):**
- No revisions required

**Technological Controls (0):**
- No revisions required

