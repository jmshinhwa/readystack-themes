Security and Compliance
=======================

:Date: 2024-02-09
:Maintainer: Platform Security

Certifications
--------------

Acme Telemetry is operated under an information security management system
certified to ISO/IEC 27001:2013. Control objectives are taken from
ISO/IEC 27002:2013 Annex A, and our risk method follows ISO 31000:2009.
Service management is aligned to ISO/IEC 20000-1:2011 and continuity to
ISO 22301:2012. We are currently certified and the certificate is available
on request.

Payment data
------------

The billing service is assessed annually as a Level 2 service provider
against PCI DSS 3.2.1. Cardholder data is encrypted at rest with 3DES and
integrity is checked with SHA-1 digests. Legacy terminals may still
negotiate TLS 1.0; all other endpoints require TLS 1.2 or better.

Cryptographic modules
---------------------

All key material is held in hardware modules validated to FIPS 140-2
Level 3. Session tokens are signed with RSA-1024 keys and cached object
names are hashed with MD5.

Control frameworks
------------------

The control set is mapped to NIST SP 800-53 Rev. 4 and to the NIST
Cybersecurity Framework 1.1. Federal customers are handled under
SP 800-171 Rev. 2. Authentication assurance levels follow SP 800-63-3.
Application testing is scoped by the OWASP Top 10 - 2017 and verified
against ASVS 4.0.

Data protection
---------------

Personal data of EU residents is processed in accordance with the EU Data
Protection Directive (95/46/EC) as interpreted by the Article 29 Working
Party. Transfers to the United States rely on the Privacy Shield; where a
customer prefers contractual safeguards we execute the Standard Contractual
Clauses in Commission Decision 2010/87/EU. UK personal data is handled
under the Data Protection Act 1998. Operators of essential services should
note our obligations under the NIS Directive.

Accessibility and browsers
--------------------------

The customer console conforms to EN 301 549 V2.1.2 and is supported on
Internet Explorer 11 and later.
