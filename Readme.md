# Learning Management

## Documentation

- [OMR-Based Offline Test Grading & Topic Analytics](docs/omr-grading.md) — instant grading and AI-driven topic-wise weak-area analytics for physical, pen-and-paper MCQ tests.
- [Subjective (Descriptive) Answer Grading & IQ/EQ Insights](docs/subjective-grading.md) — partial-credit grading, answer summaries, weak-topic analytics, and indicative IQ/EQ signals for handwritten descriptive answers.
- [Curriculum Taxonomy — Subtopic-Level Weak-Area Reports](docs/curriculum-taxonomy.md) — a manually-entered Subject → Chapter → Topic → Subtopic tree (renamed from "knowledge graph" — no AI ingestion, no embeddings, entered once per NCERT book from its own table of contents) that questions map onto, powering subtopic-level weak-area reports with direct links to what to re-read.
- [Accounts, Roster & Tenancy](docs/accounts-and-roster.md) — the Teacher ↔ Class ↔ Student scoping model, account creation, and how a student is identified when their sheet is uploaded.
- [Database Design](docs/backend/database-design.md) — MySQL ER diagram, table summary, design decisions, and full DDL for v1.
- [Backend Architecture](docs/backend/backend-architecture.md) — stack decision (Python/FastAPI), module/API inventory, auth, error catalog, core pipelines, and build order.
- [Backend Code Style Guide](docs/backend/backend-guide.md) — Result pattern, repositories, and the service-layer provider-abstraction pattern (AI/CV providers swappable behind an interface).
- [OMR Extraction Strategy](docs/backend/omr-extraction-strategy.md) — v1: one AI-vision read per sheet, no calibration, any layout, single-page. A cached-template/CV-first approach is documented as a future cost optimization, not built until real usage shows it's worth the added risk.
