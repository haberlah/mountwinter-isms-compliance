# ISO 27001 for SaaS: The definitive audit and certification guide

**ISO 27001 certification for SaaS companies requires mastering 93 Annex A controls, navigating a rigorous two-stage audit process, and maintaining continuous compliance across cloud-native architectures.** The certification cycle spans three years with annual surveillance audits, costing startups $15,000-$40,000 and enterprises $150,000-$500,000+. SaaS companies face unique challenges: multi-tenant isolation verification, CI/CD pipeline security audits, and demonstrating shared responsibility with cloud providers. Approximately **80% of ISO 27001 controls overlap with SOC 2**, creating significant evidence reuse opportunities for companies pursuing multiple frameworks.

---

## Clauses 4-10: What auditors actually examine

ISO 27001's main body (Clauses 4-10) establishes the Information Security Management System framework. Auditors systematically evaluate each clause for documented conformance and operational effectiveness.

**Clause 4 (Context)** requires documented internal and external issues affecting the ISMS through SWOT or PESTLE analysis, with evidence of annual review. SaaS companies must define ISMS scope covering applications, cloud infrastructure (AWS/Azure/GCP configurations), CI/CD pipelines, and customer data processing activities. Auditors frequently cite "cookie-cutter" context documents lacking organization-specific detail as nonconformities.

**Clause 5 (Leadership)** demands evidence of top management involvement: meeting attendance records showing C-suite participation, signed policy approvals, budget allocation decisions documented in minutes, and RACI matrices showing clear accountability. The question "Did the CEO actually attend, or did they delegate?" appears consistently in audit interviews.

**Clause 6 (Planning)** focuses heavily on risk assessment methodology. Auditors verify documented risk criteria, consistent scoring across departments, and the "Golden Thread" connecting identified risks to selected controls. The Statement of Applicability must address all **93 Annex A controls** with justification for each inclusion or exclusion. Risk treatment plans require management approval with residual risk formally accepted.

**Clause 9 (Performance Evaluation)** generates the most common nonconformities. Internal audits must cover all ISMS requirements within the certification cycle, with auditors independent from areas being audited. Management reviews require documented coverage of mandatory inputs including nonconformity status, monitoring results, audit findings, and risk assessment status. Auditors consistently ask: "Show me the minutes from your last three Management Review meetings—do they explicitly cover all mandatory inputs?"

---

## The 93 Annex A controls for cloud-native companies

The 2022 revision reorganized controls into four themes: **Organizational (37)**, **People (8)**, **Physical (14)**, and **Technological (34)**. SaaS companies must demonstrate implementation appropriate to their cloud-native context.

### Critical organizational controls

**A.5.23 (Cloud Services)**, new in 2022, directly addresses SaaS operations. Auditors expect documented shared responsibility matrices with each cloud provider, Cloud Security Posture Management (CSPM) tool outputs, cloud service evaluation criteria, and exit strategy documentation. Common gaps include no documented exit strategy and inadequate configuration monitoring.

**A.5.19-A.5.22 (Supplier Relationships)** require security questionnaires (SIG, CAIQ), SOC 2/ISO 27001 certificates from critical vendors, and continuous monitoring through tools like SecurityScorecard. For cloud providers specifically, auditors review SOC 2 Type II reports for relevant exceptions, carve-out scoping, and user control considerations.

### Technological controls requiring technical evidence

**A.8.24 (Cryptography)** demands documented policies specifying approved algorithms: AES-256-GCM for symmetric encryption, RSA-2048+ or ECDSA for asymmetric, SHA-256+ for hashing. Auditors verify TLS 1.2+ enforcement with weak cipher suites disabled, and key management procedures including rotation schedules—typically quarterly for data encryption keys, annually for master keys.

**A.8.25-A.8.31 (Secure Development)** covers the entire SDLC:
- Security requirements in user stories with threat modeling artifacts
- SAST tools (SonarQube, Checkmarx) integrated into CI/CD blocking critical findings
- DAST scanning of running applications pre-production
- Code review records demonstrating four-eyes principle
- Dependency scanning with SBOM generation

**A.8.15-A.8.16 (Logging and Monitoring)** require centralized log aggregation with minimum **12-month retention**, protected from tampering. Required log components include user ID, system activity, date/time, device location, and IP information. Events to capture: authentication attempts, privileged account activity, configuration changes, data access events, and security system modifications.

### Physical controls and shared responsibility

For SaaS companies operating entirely in cloud environments, physical security of infrastructure shifts to the cloud provider under the shared responsibility model. Auditors accept cloud provider SOC 2 reports and ISO 27001 certificates as evidence for controls A.7.1-A.7.14, but verify the organization has documented this reliance and reviewed the provider's certifications. Office and remote work physical security—badge access, clean desk policies, laptop encryption—remain customer responsibilities.

---

## Stage 1 and Stage 2 audit deep dive

### Stage 1: Readiness assessment

Stage 1 serves as documentation review and readiness confirmation, typically conducted **1-2 days** for small organizations, **2-4 days** for larger ones. The auditor verifies existence and adequacy of:

- ISMS scope statement with clear boundaries
- Information security policy approved by top management
- Risk assessment methodology and completed assessments
- Statement of Applicability with all 93 controls addressed
- Internal audit program and completed audits
- Management review minutes demonstrating mandatory topic coverage

**Common findings delaying Stage 2:**
1. Incomplete risk assessment missing identification or treatment
2. Statement of Applicability without justification for exclusions
3. No internal audit evidence or incomplete coverage
4. Management review not conducted with required inputs
5. Scope poorly defined or excluding critical systems

Stage 1 can typically be conducted **remotely** for document review under ISO 27006-1:2024, which removed the previous 30% remote audit limitation.

### Stage 2: Implementation verification

Stage 2 follows a **process-based approach** per ISO 19011, evaluating whether documented controls operate effectively. Duration ranges from **3-10+ days** depending on organization size and complexity.

**Sampling methodologies** determine how auditors select evidence:
- Higher-risk areas receive larger samples
- Automated controls require configuration verification; manual controls require multiple samples over time
- Typical guidance: 25-30 samples per manual control; square root of population with minimum 5-10 for statistical validity
- IAF MD 1 multi-site sampling: initial audit y=√x sites, surveillance y=0.6√x sites

**Technical verification includes:**
- Live demonstrations of access provisioning/deprovisioning
- System configuration exports (firewall rules, IAM policies, encryption settings)
- Log reviews showing monitoring effectiveness
- Vulnerability scan results with remediation tracking
- Incident response capability demonstration

### Interview protocols by role

**CISO/Security Leadership:**
- "How do you determine information security objectives and measure performance?"
- "Walk me through your risk assessment and treatment process"
- "What are your top security risks and how are they being addressed?"

**Developers/Engineers:**
- "How are security requirements incorporated into development?"
- "Walk me through your deployment process"
- "How do you manage secrets and credentials?"

**HR Personnel:**
- "What security checks are conducted for new hires?"
- "What is the process for employee offboarding?"
- "How are access rights revoked upon termination?"

**Red flags auditors watch for:** Inconsistent answers between staff, inability to explain own responsibilities, reference to undocumented processes, defensive responses, statements contradicting documentation.

---

## Evidence collection and documentation requirements

### Mandatory documentation (minimum requirements)

| Document | Clause Reference |
|----------|-----------------|
| ISMS Scope | 4.3 |
| Information Security Policy | 5.2 |
| Risk Assessment Process | 6.1.2 |
| Risk Treatment Process | 6.1.3 |
| Statement of Applicability | 6.1.3(d) |
| Information Security Objectives | 6.2 |
| Competence Evidence | 7.2 |
| Operational Information | 8.1 |
| Risk Assessment Results | 8.2 |
| Risk Treatment Results | 8.3 |
| Monitoring Results | 9.1 |
| Internal Audit Programme/Results | 9.2 |
| Management Review Results | 9.3 |
| Nonconformity/Corrective Actions | 10.2 |

### Statement of Applicability structure

The SoA must include for each of the 93 controls:
- Control reference and title
- Applicability status with justification
- Implementation status (Implemented/Partially/Planned/Not Yet)
- Implementation method and evidence reference
- Cross-reference to risk assessment

**Exclusion justifications** must demonstrate the control is not relevant to identified risks, no legal/regulatory requirement mandates it, and no contractual obligation requires it. "Not applicable because we're cloud-based" without substantiation fails audit.

### Risk assessment methodology options

Auditors accept multiple approaches:
- **Asset-based**: Identifies assets first, then threats and vulnerabilities
- **Scenario-based**: Starts with threat scenarios, evaluates likelihood and impact
- **NIST SP 800-30**: Technology-focused, structured 9-step process
- **OCTAVE**: Self-directed, three-phase organizational evaluation
- **FAIR**: Quantitative methodology calculating financial impact

The methodology must define: impact and likelihood scales, risk acceptance criteria, risk owner assignment process, and circumstances triggering reassessment. Documentation must show consistent application across the organization with assessments at least **annually** and when significant changes occur.

---

## Nonconformity management and corrective action

### Major versus minor classifications

**Major Nonconformity** (ISO 17021 Section 3.12): "Nonconformity that affects the capability of the management system to achieve the intended results"
- Certification **cannot be issued** until resolved
- Requires full verification by auditor
- Typical resolution timeline: **60-90 days maximum**

**Minor Nonconformity** (ISO 17021 Section 3.13): "Nonconformity that does not affect the capability of the management system to achieve the intended results"
- Can be certified with acceptable corrective action plan
- Verified at next surveillance audit
- Multiple minors in same area may become major (systemic failure)

**SaaS-specific major nonconformity examples:**
- No internal audit conducted within 12 months
- Complete absence of encryption for customer data
- Firewall misconfiguration allowing unauthorized access
- Systematic ignoring of security procedures

**Minor nonconformity examples:**
- Security policy not updated to current version
- Single user account not disabled upon termination
- One backup missed in a month
- Incomplete documentation of one specific audit

### Root cause analysis requirements

Auditors evaluate RCA quality using the **5 Whys** methodology or **Fishbone (Ishikawa) diagrams**. The distinction between correction (fixing the symptom) and corrective action (eliminating root cause) is critical.

**Correction example:** Patching a single vulnerable server
**Corrective action example:** Fixing the auto-patching process that failed

Required corrective action plan elements:
- Nonconformity description with clause reference
- Root cause analysis documentation
- Immediate correction taken
- Systemic corrective action to prevent recurrence
- Named owner and target date
- Effectiveness verification method

**Timeline requirements:**
- Corrective Action Plan: **14 days** from audit close
- Evidence of Correction: **30 days** from audit close
- Major NC Remediation: **60-90 days** maximum
- Minor NC closure: By next surveillance audit

---

## SaaS technical controls audit specifics

### Cloud security configuration verification

**AWS controls auditors check:**
- IAM roles using least privilege with MFA enforcement
- CloudTrail enabled with log file integrity validation
- VPC Flow Logs for network traffic monitoring
- Security Hub compliance dashboards
- KMS configuration for encryption key management
- GuardDuty threat detection enabled

**Encryption requirements:**
- At rest: AES-256 mandatory, key rotation per policy
- In transit: TLS 1.2+ required, TLS 1.3 preferred
- Key management: FIPS 140-2 validated systems, documented lifecycle

**Shared responsibility evidence:** Auditors verify documented understanding of provider versus customer responsibilities. The customer handles data classification, IAM configuration, application security, and logging/monitoring setup.

### CI/CD pipeline security audit

Auditors evaluate:
- Segregation of duties enforcement (developers cannot deploy to production)
- Secrets management using AWS Secrets Manager, HashiCorp Vault, or similar
- Code signing and artifact verification
- Deployment approval gates enforcing four-eyes principle
- IaC security scanning (Checkov, tfsec, Bridgecrew) integrated pre-deploy
- Pipeline audit logging retained for 12+ months

**Evidence required:**
- Pipeline configuration files in version control
- Security scan reports from SAST, DAST, SCA tools
- Approval records and deployment logs with timestamps
- Secrets scanning results showing no embedded credentials

### Container and Kubernetes security

**Container image security:**
- Vulnerability scanning (Trivy, Clair, Kubescape) blocking HIGH/CRITICAL CVEs
- Image signing with verification using Cosign
- SBOM generation for all images
- No `:latest` tags; images pinned by digest

**Kubernetes audit points:**
- RBAC policies demonstrating least privilege
- Network policies limiting pod-to-pod communication
- Pod Security Admission using `restricted` mode
- Secrets encrypted at rest and integrated with external management
- Comprehensive audit logging enabled

**CIS Kubernetes Benchmark compliance** reports serve as primary evidence, alongside configuration files stored in version control as source of truth.

### Multi-tenant isolation verification

**Methods auditors evaluate:**
- Separate VPCs or network segments per tenant
- Database isolation: separate databases (highest), separate schemas (medium), row-level security (lowest)
- Tenant-specific encryption keys
- Network policy enforcement preventing cross-tenant traffic

**Testing evidence required:** Penetration testing specifically targeting tenant boundaries, documentation of isolation architecture, access control matrices per tenant.

---

## Certification body selection and accreditation

### Accreditation requirements

Certification bodies must comply with **ISO/IEC 17021-1:2015** (general CB requirements) and **ISO/IEC 27006-1:2024** (ISMS-specific requirements). Verify accreditation through:
- **IAF CertSearch** (iafcertsearch.org): Global database for accredited certifications
- National accreditation body databases (UKAS, ANAB, DAkkS)

**Red flags indicating unaccredited or questionable CBs:**
- CB not listed on accreditation body databases
- Certificate lacks accreditation body logo
- Unusually low pricing or unrealistic timelines
- CB cannot provide accreditation scope documentation

### Lead auditor qualifications

- 5-day ISO 27001 Lead Auditor training with examination
- Information technology experience (competence-based per 27006-1:2024)
- Information security experience (minimum 2 years typical)
- Audit experience on ISMS audit teams
- Continuing professional development (20-30 hours annually)

### Conflicts of interest rules

ISO 17021 prohibits:
- CB providing management system consultancy to certification clients
- CB conducting internal audits for certified clients
- Personnel who provided consultancy auditing same client within **2 years**
- Commission payments to consultants for certification referrals

### Major certification bodies for SaaS

**Premium global (higher cost, strong brand recognition):**
- BSI, DNV, Bureau Veritas, SGS, LRQA

**US technology-focused (SOC 2 integration):**
- A-LIGN, Schellman (dual ANAB/UKAS accredited)

**Selection considerations:** Match CB expertise to your industry, verify references from similar SaaS companies, evaluate responsiveness during selection as indicator of ongoing service quality.

---

## Surveillance, recertification, and ongoing compliance

### Surveillance audit cycle

**Annual requirements (within 12 months of previous audit):**
- Management review evidence
- Internal audit results
- Corrective action status from previous audits
- Sample of ~50% of Annex A controls per surveillance
- All controls covered across two surveillance audits

**Missed surveillance consequences:**
- Certificate suspension if not conducted within timeframe
- Typically 3-month grace period available
- Failure beyond grace period: certificate withdrawal

### Recertification (every 3 years)

- Comprehensive reassessment of entire ISMS (similar to Stage 2)
- All clauses and applicable Annex A controls reviewed
- Approximately **2/3 of initial certification audit time**
- Conduct at least **3 months before certificate expiry**
- Stage 1 generally not required unless significant scope changes

### Continuous compliance calendar

**Monthly:**
- Review security metrics and incident trends
- Update asset inventory
- Process access requests/terminations
- Verify backup testing

**Quarterly:**
- Formal access reviews
- Risk register updates
- Supplier security assessments
- Control effectiveness sampling

**Annually:**
- Full internal audit
- Comprehensive risk assessment
- Management review (minimum)
- Security awareness training refresh
- BC/DR testing
- Statement of Applicability review

### Certification body transfer

Under IAF MD 2:2023, transfers require:
- Both CBs accredited by IAF MLA signatories
- Valid, non-suspended certification
- Accepting CB reviews: initial/most recent recertification report, latest surveillance report, outstanding nonconformity status
- Verification of corrections for major NCs before transfer acceptance

---

## Framework integration and evidence reuse

### ISO 27001 to SOC 2 mapping

**Approximately 80% control overlap** per AICPA mapping documentation. Common Criteria categories map extensively:
- CC1 (Control Environment) → Clauses 5-7, A.5 (Policies)
- CC3 (Risk Assessment) → Clause 6.1, A.8 (Asset Management)
- CC6 (Logical/Physical Access) → A.9 (Access Control), A.11 (Physical)
- CC7 (System Operations) → A.12 (Operations Security)

**Combined audit approach** saves 40-60% effort versus separate compliance programs. Many auditors (Schellman, A-LIGN) offer integrated assessments.

### Mapping to additional frameworks

**HIPAA:** ~70 ISO 27002 controls map directly; gaps include BAA specifics, 72-hour breach notification, minimum necessary standard

**GDPR:** High alignment with ISO 27701 extension; Article 32 (Security of Processing) maps directly to core ISMS

**PCI-DSS:** All 12 requirements map to Annex A controls; gaps include prescriptive encryption standards and ASV scanning requirements

**FedRAMP:** NIST 800-53 controls map extensively; gaps include FIPS 140-2/3 requirements and continuous monitoring frequency

### Compliance platform integration

Major platforms supporting multi-framework evidence reuse:
- **Vanta:** 35+ frameworks, hourly automated control tests
- **Drata:** 20+ frameworks, 270+ integrations, 90%+ control automation
- **Secureframe:** 25+ frameworks, pre-mapped control libraries
- **Sprinto:** 300+ integrations, 99% automation claims

These platforms reduce audit preparation from months to **2-3 weeks** through automated evidence collection and cross-framework mapping.

---

## Cost structure and timeline planning

### Cost ranges by organization size

| Size | Year 1 Total | Annual Ongoing |
|------|-------------|----------------|
| Startup (1-50) | $33,500-$73,000 | $13,000-$36,500 |
| SMB (50-250) | $73,000-$143,000 | $32,000-$75,000 |
| Mid-Market (250-1000) | $143,000-$255,000 | $67,500-$140,000 |
| Enterprise (1000+) | $200,000-$500,000+ | $100,000-$200,000+ |

**Cost breakdown:**
- GRC Platform: $7,500-$100,000+/year
- Consulting: $15,000-$200,000
- Certification audit: $5,000-$100,000+
- Annual surveillance: $3,000-$50,000

### Audit day calculation

Per ISO 27006 (Annex C), audit time depends on effective personnel count and complexity factors:

| Effective Personnel | Initial Audit Days |
|--------------------|--------------------|
| 1-10 | 5 |
| 11-25 | 6 |
| 26-45 | 7-8 |
| 46-65 | 8-9 |
| 86-125 | 10-11 |
| 126-175 | 12-13 |

**Surveillance:** ~1/3 of initial audit time annually
**Recertification:** ~2/3 of initial audit time

Complexity factors increasing audit days: multiple locations, high regulatory requirements, extensive technology diversity, large geographic dispersion.

### Implementation timeline

| Starting Maturity | Duration |
|------------------|----------|
| Very immature (no formal security) | 12-18+ months |
| Basic controls in place | 9-12 months |
| Moderate security program | 6-9 months |
| Mature program needing formalization | 3-6 months |
| With automation platform | 4-8 weeks possible |

---

## KPIs and metrics auditors evaluate

### Required measurement areas (Clause 9.1)

**Security incident metrics:**
- Number by severity, Mean Time to Detect/Respond/Resolve
- Target MTTR: 24-72 hours for critical incidents

**Vulnerability management:**
- Remediation within SLA (Critical: 7-14 days, High: 30 days, Medium: 60 days)
- Patch completion rates, outstanding vulnerabilities by age

**Access management:**
- Access reviews completed on time (quarterly minimum for privileged)
- Dormant accounts disabled within 30 days
- Provisioning/deprovisioning completion time

**Training and awareness:**
- Completion rate target: **95%+**
- Phishing simulation click rates (target: <5%)

**Compliance metrics:**
- Controls implemented and effective percentage
- Audit findings closure rate
- Corrective action completion within SLA

### Maturity assessment

Auditors evaluate control maturity using scales from "Not Implemented" through "Optimized," assessing:
- Documentation quality and completeness
- Evidence of process consistency
- Staff competency and awareness
- Management involvement
- Continuous improvement evidence
- Historical trend data

---

## Conclusion

Achieving and maintaining ISO 27001 certification as a SaaS company demands systematic attention to cloud-native security controls, rigorous documentation practices, and continuous compliance activities between audits. The **internal audit program** represents the most frequently cited nonconformity area, followed by management review gaps and risk assessment deficiencies. Organizations that invest in automated compliance platforms reduce preparation time by 50-70% and achieve significant evidence reuse across SOC 2, HIPAA, and other frameworks. The certification journey requires sustained commitment: initial implementation typically spans 6-12 months, followed by annual surveillance audits and comprehensive recertification every three years. Success depends on treating ISO 27001 not as a point-in-time certification exercise but as an operational framework continuously improving the organization's security posture.