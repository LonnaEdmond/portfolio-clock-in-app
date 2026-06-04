# Contractor Invoicing Pipeline

**[Live demo →](https://1099-invoice-app.vercel.app/)** · part of [lonnaedmond.com](https://lonnaedmond.com)

A validated data pipeline from jobsite to accounting: GPS-verified clock-ins, rule-based per-diem enrichment, and schema-conformant export ready for QuickBooks. The production deployment of this design has processed **$198K with 92% first-pass approval**.

## What it demonstrates

- **Validation at capture** — GPS verification at clock-in, so bad data never enters the pipeline
- **Rule-based enrichment** — per-diem auto-tagging applied consistently, not manually
- **Typed export contract** — invoices rendered to an accounting-ready format (jsPDF), one shape, every time
- Mobile-first UI built for people standing on a jobsite, not at a desk

## Stack

React + Vite, deployed on Vercel. Demo shows the full flow on synthetic data; the production system is private.
