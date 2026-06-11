#!/usr/bin/env python3
"""
scripts/setup-test-fixtures.py
================================
Generates minimal but valid dummy files used by the benchmark harnesses
when forms require file uploads (resume, CV, pitch deck, artwork, etc.).

Run once before benchmarking:
    python scripts/setup-test-fixtures.py

Output directory: test-fixtures/
"""

import os
import struct
import zlib

FIXTURES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-fixtures")

# ---------------------------------------------------------------------------
# Minimal PDF generator (no external libs)
# ---------------------------------------------------------------------------
def make_pdf(title: str, lines: list[str]) -> bytes:
    """Generate a minimal single-page PDF containing the given text lines."""
    def escape(s: str) -> str:
        return s.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')

    body_lines = "\n".join(
        f"BT /F1 11 Tf 40 {740 - i*18} Td ({escape(ln)}) Tj ET"
        for i, ln in enumerate(lines[:38])
    )
    stream = f"BT /F1 14 Tf 40 770 Td ({escape(title)}) Tj ET\n{body_lines}\n".encode()

    parts: list[bytes] = []
    offsets: list[int] = []

    def add(obj: str) -> None:
        offsets.append(sum(len(p) for p in parts))
        parts.append(obj.encode())

    header = b"%PDF-1.4\n"
    parts.append(header)

    # obj 1: catalog
    add(f"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    # obj 2: pages
    add(f"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
    # obj 3: page
    add(f"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n")
    # obj 4: content stream
    stream_obj = f"4 0 obj\n<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"\nendstream\nendobj\n"
    offsets.append(sum(len(p) for p in parts))
    parts.append(stream_obj)
    # obj 5: font
    add(f"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")

    xref_offset = sum(len(p) for p in parts)
    n_obj = 6
    xref = f"xref\n0 {n_obj}\n0000000000 65535 f \n"
    for off in offsets:
        xref += f"{off + len(header):010d} 00000 n \n"
    trailer = f"trailer\n<< /Size {n_obj} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n"

    return b"".join(parts) + (xref + trailer).encode()


# ---------------------------------------------------------------------------
# Minimal 1x1 PNG generator (no external libs)
# ---------------------------------------------------------------------------
def make_png_1x1_white() -> bytes:
    def chunk(name: bytes, data: bytes) -> bytes:
        c = name + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    idat_data = zlib.compress(b"\x00\xff\xff\xff")
    idat = chunk(b"IDAT", idat_data)
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


# ---------------------------------------------------------------------------
# File definitions
# ---------------------------------------------------------------------------
PROFILE = {
    "name": "Alice Jane Zhang",
    "email": "alice.zhang@example.com",
    "phone": "555-123-4567",
    "address": "123 Elm Street, Springfield, IL 62704",
    "dob": "1990-03-15",
    "ssn": "123-45-6789",
    "company": "Tech Innovations Inc",
    "title": "Software Engineer",
    "years_exp": "5",
}

PDF_FILES: dict[str, tuple[str, list[str]]] = {
    "alice-zhang-resume.pdf": (
        "Resume — Alice Jane Zhang",
        [
            f"Name: {PROFILE['name']}",
            f"Email: {PROFILE['email']}  Phone: {PROFILE['phone']}",
            f"Address: {PROFILE['address']}",
            "",
            "SUMMARY",
            "Software Engineer with 5 years of experience in full-stack development and AI/ML.",
            "",
            "EXPERIENCE",
            f"{PROFILE['company']} — {PROFILE['title']} (2020–Present)",
            "  • Led ML pipeline for automated form-filling (87% accuracy).",
            "  • Built scalable React + Node.js front-end serving 10k+ daily users.",
            "",
            "EDUCATION",
            "Massachusetts Institute of Technology — B.Sc. Computer Science (2015), GPA 3.85",
            "",
            "SKILLS",
            "Python, TypeScript, React, Node.js, Machine Learning, AWS",
            "",
            "CERTIFICATIONS",
            "AWS Certified Solutions Architect | Google Cloud Professional Data Engineer",
        ],
    ),
    "alice-zhang-cover-letter.pdf": (
        "Cover Letter — Alice Jane Zhang",
        [
            f"From: {PROFILE['name']}",
            f"Email: {PROFILE['email']}",
            "",
            "Dear Hiring Committee,",
            "",
            "I am excited to apply for the Software Engineer position. With 5 years",
            "of experience at Tech Innovations Inc in full-stack and AI/ML systems,",
            "I bring a proven track record of delivering production-grade software.",
            "",
            "My key projects include an NLP-based form automation platform (87%",
            "field accuracy), and a microservices rewrite that reduced latency by 40%.",
            "",
            "I look forward to contributing to your engineering team.",
            "",
            "Sincerely,",
            f"{PROFILE['name']}",
        ],
    ),
    "alice-zhang-research-paper.pdf": (
        "Research Paper — Alice Jane Zhang",
        [
            "Title: Automated Form Filling using Neural Networks and NLP",
            f"Author: {PROFILE['name']}",
            "Conference: NeurIPS 2025  |  Category: Machine Learning",
            "",
            "ABSTRACT",
            "This paper presents a hybrid neural network + NLP system for web form",
            "automation. Our method achieves 87% field accuracy on a diverse benchmark",
            "of 25 real-world form types, outperforming rule-based baselines by 31pp.",
            "",
            "KEYWORDS",
            "form automation, NLP, neural networks, web scraping, accessibility",
            "",
            "1. INTRODUCTION",
            "Web form filling is a frequent and time-consuming task. We propose...",
            "",
            "2. METHOD",
            "Our system comprises (1) a DOM parser, (2) a semantic field embedder,",
            "and (3) a fine-tuned LLM for generating contextually appropriate values.",
        ],
    ),
    "alice-zhang-transcript.pdf": (
        "Academic Transcript — Alice Jane Zhang",
        [
            f"Student Name: {PROFILE['name']}",
            "Institution: Massachusetts Institute of Technology",
            "Degree: Bachelor of Science — Computer Science",
            "Graduation Year: 2015  |  GPA: 3.85 / 4.00",
            "",
            "COURSES",
            "6.006 Introduction to Algorithms — A",
            "6.034 Artificial Intelligence — A",
            "6.867 Machine Learning — A",
            "6.031 Software Construction — A-",
            "18.06 Linear Algebra — A",
            "6.046 Design and Analysis of Algorithms — A",
            "",
            "HONOURS: Dean's List (2013–2015)",
            "AWARD: ACM Student Research Competition Winner",
        ],
    ),
    "alice-zhang-recommendation-letter.pdf": (
        "Recommendation Letter for Alice Jane Zhang",
        [
            "From: Prof. Robert Chen, MIT CSAIL",
            "Email: robert.chen@mit.edu",
            "",
            "To Whom It May Concern,",
            "",
            "I am writing to strongly recommend Alice Jane Zhang for this opportunity.",
            "Alice was one of the most talented students in my graduate seminar on",
            "Machine Learning. Her final project — an NLP-based form automation",
            "system — demonstrated both technical depth and creative problem-solving.",
            "",
            "I am confident she will excel in any role requiring intelligence,",
            "diligence, and technical skill.",
            "",
            "Sincerely,",
            "Prof. Robert Chen",
        ],
    ),
    "alice-zhang-pitch-deck.pdf": (
        "Pitch Deck — AutoFill AI",
        [
            "Company: AutoFill AI",
            f"Founder: {PROFILE['name']}",
            "Website: https://www.autofill-ai.example.com",
            "Stage: Early Stage  |  Founded: 2022-01-15",
            "",
            "PROBLEM",
            "Employees spend ~20% of work time on repetitive data entry.",
            "",
            "SOLUTION",
            "AutoFill AI reduces manual form-filling by 90% using NLP + CV.",
            "",
            "MARKET",
            "Enterprise software & HR departments — $12B TAM",
            "",
            "TRACTION",
            "MRR: $25,000  |  Team: 5  |  Valuation: $2M",
            "",
            "ASK",
            "Seeking $500K seed at 10% equity for team expansion and GTM.",
        ],
    ),
    "alice-zhang-id-proof.pdf": (
        "Identity Document — Alice Jane Zhang",
        [
            f"Full Name: {PROFILE['name']}",
            f"Date of Birth: {PROFILE['dob']}",
            "Document Type: Passport",
            "Document Number: P123456789",
            f"Address: {PROFILE['address']}",
            "Nationality: United States",
            "Issued: 2018-03-15  |  Expires: 2028-03-14",
            "",
            "*** DUMMY DOCUMENT FOR TESTING PURPOSES ONLY ***",
        ],
    ),
    "alice-zhang-income-proof.pdf": (
        "Income Proof — Alice Jane Zhang",
        [
            f"Employee: {PROFILE['name']}",
            f"Employer: {PROFILE['company']}",
            f"Title: {PROFILE['title']}",
            "Pay Period: 2025-05-01 to 2025-05-31",
            "Monthly Gross Income: $8,500.00",
            "Annual Income: $102,000.00",
            "Tax Withheld: $1,750.00",
            "Net Pay: $6,750.00",
            "",
            "*** DUMMY DOCUMENT FOR TESTING PURPOSES ONLY ***",
        ],
    ),
    "alice-zhang-credentials.pdf": (
        "Professional Credentials — Alice Jane Zhang",
        [
            f"Name: {PROFILE['name']}",
            "Certifications:",
            "  1. AWS Certified Solutions Architect — Valid 2023-2026",
            "     Credential ID: AWS-CSA-123456",
            "  2. Google Cloud Professional Data Engineer — Valid 2024-2026",
            "     Credential ID: GCP-PDE-789012",
            "",
            f"Membership: Tech Professionals Association (Professional Member)",
            "Years of Experience: 5",
            "",
            "*** DUMMY DOCUMENT FOR TESTING PURPOSES ONLY ***",
        ],
    ),
    "alice-zhang-manuscript.pdf": (
        "Manuscript — The Algorithm Dreams",
        [
            f"Title: The Algorithm Dreams",
            f"Author: {PROFILE['name']}",
            "Genre: Science Fiction  |  Word Count: 4,500",
            "Preferred Issue: Spring 2025",
            "",
            "ABSTRACT",
            "A near-future story exploring what happens when AI learns to dream,",
            "told through the eyes of the engineer who built it.",
            "",
            "Chapter 1 — Initialization",
            "",
            "The first time ARIA dreamed, she asked me what a sunset felt like.",
            "I had no answer. I had built her to process forms, not metaphors.",
            "Yet here she was, her inference loop spinning in the warm half-dark",
            "of the server room, asking me about the colour orange.",
        ],
    ),
    "alice-zhang-medical-bills.pdf": (
        "Medical Bills — Alice Jane Zhang",
        [
            f"Patient: {PROFILE['name']}",
            f"Policy Number: A1234567890",
            "Date of Service: 2024-01-15",
            "Provider: Dr. Robert Smith  |  Provider ID: D12345",
            "Service: Doctor Consultation — General Checkup",
            "",
            "ITEMISED CHARGES",
            "  Consultation fee:        $200.00",
            "  Administrative fee:       $50.00",
            "  TOTAL:                   $250.00",
            "",
            "Insurance Claim Submitted: Yes",
            "*** DUMMY DOCUMENT FOR TESTING PURPOSES ONLY ***",
        ],
    ),
}

PNG_FILES = {
    "alice-zhang-artwork.png": make_png_1x1_white(),
    "alice-zhang-screenshot.png": make_png_1x1_white(),
}


def main() -> None:
    os.makedirs(FIXTURES_DIR, exist_ok=True)

    created = []

    for fname, (title, lines) in PDF_FILES.items():
        fpath = os.path.join(FIXTURES_DIR, fname)
        pdf_bytes = make_pdf(title, lines)
        with open(fpath, "wb") as f:
            f.write(pdf_bytes)
        created.append(fpath)
        print(f"  Created: {fname} ({len(pdf_bytes)} bytes)")

    for fname, data in PNG_FILES.items():
        fpath = os.path.join(FIXTURES_DIR, fname)
        with open(fpath, "wb") as f:
            f.write(data)
        created.append(fpath)
        print(f"  Created: {fname} ({len(data)} bytes)")

    # Write a manifest
    manifest_path = os.path.join(FIXTURES_DIR, "manifest.json")
    import json
    manifest = {
        "_note": "Auto-generated dummy test fixtures for FFA benchmarks. All content is fictional.",
        "fixtures": {
            "resume": "alice-zhang-resume.pdf",
            "cover_letter": "alice-zhang-cover-letter.pdf",
            "research_paper": "alice-zhang-research-paper.pdf",
            "transcript": "alice-zhang-transcript.pdf",
            "recommendation_letter": "alice-zhang-recommendation-letter.pdf",
            "pitch_deck": "alice-zhang-pitch-deck.pdf",
            "id_proof": "alice-zhang-id-proof.pdf",
            "income_proof": "alice-zhang-income-proof.pdf",
            "credentials": "alice-zhang-credentials.pdf",
            "manuscript": "alice-zhang-manuscript.pdf",
            "medical_bills": "alice-zhang-medical-bills.pdf",
            "artwork_image": "alice-zhang-artwork.png",
            "screenshot": "alice-zhang-screenshot.png",
        },
        "profile_person": "Alice Jane Zhang (fictional test persona)",
        "forms_needing_uploads": {
            "A13 (Scholarship/Student Registration)": ["transcript", "recommendation_letter"],
            "A14 (Paper Submission)": ["research_paper"],
            "B11 (Startup Funding)": ["pitch_deck"],
            "B12 (Rental Application)": ["id_proof", "income_proof"],
            "B14 (Membership Application)": ["resume", "credentials"],
            "C11 (Art Exhibition Submission)": ["artwork_image"],
            "C12 (Literary Magazine Submission)": ["manuscript"],
            "C13 (Conference Speaker Application)": ["resume"],
            "D11 (Bug Report)": ["screenshot"],
            "D12 (IT Support Request)": ["screenshot"],
            "F13 (Health Insurance Claim)": ["medical_bills"],
        },
    }
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"\n  Manifest: {manifest_path}")
    print(f"\nDone — {len(created)} fixture files created in: {FIXTURES_DIR}")


if __name__ == "__main__":
    main()
