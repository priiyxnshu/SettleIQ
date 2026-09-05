"""
SettleIQ PDF Report Generator Module.

Compiles structured ReconciliationReportData into high-fidelity, institutional PDF documents
using ReportLab. Generates executive summaries, audit metrics tables, exception distribution
breakdowns, and grounded narrative findings with dynamic two-pass page numbering.
"""

import io
from datetime import datetime
from typing import List
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether
)
from reportlab.pdfgen import canvas

from app.schemas.report import ReconciliationReportData


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and stamp 'Page X of Y' along with running header/footer.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Running Top Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "SettleIQ  |  AI-Assisted Reconciliation Report")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)

        # Running Bottom Footer
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 45, 558, 45)

        self.drawString(54, 32, "Confidential — For Internal & Stakeholder Reconciliation Review Only")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_str)
        self.restoreState()


class PDFReportGenerator:
    """
    Generator compiling structured reconciliation report data into styled PDF documents.
    """

    @staticmethod
    def generate(report: ReconciliationReportData) -> bytes:
        """
        Compile ReconciliationReportData into an in-memory PDF binary stream.

        Builds structured Flowable elements including metadata banners, key financial metrics,
        exception type breakdowns, narrative findings, and compliance signatures using
        the custom NumberedCanvas.

        Args:
            report: Populated ReconciliationReportData schema instance.

        Returns:
            Raw PDF bytes suitable for HTTP streaming response or file storage.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=54,
            rightMargin=54,
            topMargin=54,
            bottomMargin=54
        )

        styles = getSampleStyleSheet()
        
        # Color Palette
        c_primary = colors.HexColor("#007ADE")
        c_navy = colors.HexColor("#0F172A")
        c_slate = colors.HexColor("#334155")
        c_muted = colors.HexColor("#64748B")
        c_light_bg = colors.HexColor("#F8FAFC")
        c_card_bg = colors.HexColor("#F1F5F9")
        c_border = colors.HexColor("#E2E8F0")

        # Custom Typography Styles
        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=c_navy
        )
        subtitle_style = ParagraphStyle(
            "ReportSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=15,
            textColor=c_primary,
            spaceAfter=14
        )
        h2_style = ParagraphStyle(
            "SectionHeading",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=c_navy,
            spaceBefore=14,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            "BodyDark",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=14,
            textColor=c_slate
        )
        callout_style = ParagraphStyle(
            "ExecutiveCallout",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=14.5,
            textColor=c_navy
        )
        bullet_style = ParagraphStyle(
            "ReportBullet",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=13.5,
            textColor=c_slate,
            leftIndent=14,
            firstLineIndent=-10
        )
        table_cell_style = ParagraphStyle(
            "TableCell",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=c_slate
        )
        table_cell_bold = ParagraphStyle(
            "TableCellBold",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=12,
            textColor=c_navy
        )
        table_header_style = ParagraphStyle(
            "TableHeader",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=12,
            textColor=colors.white
        )

        elements = []

        # =========================================================================
        # 1. REPORT HEADER
        # =========================================================================
        elements.append(Paragraph("SettleIQ", title_style))
        elements.append(Paragraph("AI-ASSISTED RECONCILIATION REPORT", subtitle_style))

        meta_data = [
            [
                Paragraph("<b>Batch / Run ID:</b>", body_style),
                Paragraph(report.run_id, body_style),
                Paragraph("<b>Status:</b>", body_style),
                Paragraph(f"<font color='#0284C7'><b>{report.run_status}</b></font>", body_style)
            ],
            [
                Paragraph("<b>Batch Reference:</b>", body_style),
                Paragraph(report.batch_reference or "N/A", body_style),
                Paragraph("<b>Generated Date:</b>", body_style),
                Paragraph(report.generated_at.strftime("%d %b %Y, %H:%M UTC"), body_style)
            ]
        ]
        meta_table = Table(meta_data, colWidths=[110, 150, 100, 144])
        meta_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), c_light_bg),
            ("BOX", (0, 0), (-1, -1), 0.5, c_border),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 14))

        # =========================================================================
        # 2. EXECUTIVE SUMMARY
        # =========================================================================
        elements.append(Paragraph("1. Executive Summary", h2_style))
        summary_table = Table(
            [[Paragraph(f"<b>Summary:</b> {report.narrative.executive_summary}", callout_style)]],
            colWidths=[504]
        )
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), c_card_bg),
            ("LINELEFT", (0, 0), (0, 0), 3, c_primary),
            ("BOX", (0, 0), (-1, -1), 0.5, c_border),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 14))

        # =========================================================================
        # 3. KEY RECONCILIATION METRICS (TABLE)
        # =========================================================================
        elements.append(Paragraph("2. Financial Reconciliation Metrics", h2_style))
        m = report.metrics

        diff_color = "#DC2626" if abs(m.difference_amount) > 0.01 else "#16A34A"
        metrics_rows = [
            [
                Paragraph("Metric Description", table_header_style),
                Paragraph("Reconciliation Value", table_header_style),
                Paragraph("Benchmark / Scope", table_header_style)
            ],
            [
                Paragraph("Total Transactions Processed", table_cell_bold),
                Paragraph(f"{m.total_transactions:,}", table_cell_style),
                Paragraph("100% Processed Ingestion Volume", table_cell_style)
            ],
            [
                Paragraph("Total Expected Gross Amount", table_cell_bold),
                Paragraph(f"INR {m.expected_amount:,.2f}", table_cell_style),
                Paragraph("Internal Ledger / Payment Records", table_cell_style)
            ],
            [
                Paragraph("Total Verified Settled Amount", table_cell_bold),
                Paragraph(f"INR {m.settled_amount:,.2f}", table_cell_style),
                Paragraph("Bank & Gateway Settlements", table_cell_style)
            ],
            [
                Paragraph("Net Settlement Discrepancy", table_cell_bold),
                Paragraph(f"<font color='{diff_color}'><b>INR {m.difference_amount:,.2f}</b></font>", table_cell_style),
                Paragraph("Variance (Expected - Settled)", table_cell_style)
            ],
            [
                Paragraph("Clean Matched Transactions", table_cell_bold),
                Paragraph(f"{m.matched_count:,} ({m.match_rate}%)", table_cell_style),
                Paragraph("Zero discrepancy, 1-to-1 match", table_cell_style)
            ],
            [
                Paragraph("Exceptions Flagged", table_cell_bold),
                Paragraph(f"{m.exceptions_count:,}", table_cell_style),
                Paragraph("Discrepancies identified by engine", table_cell_style)
            ],
            [
                Paragraph("Automated Guardrail Resolutions", table_cell_bold),
                Paragraph(f"{m.auto_resolved_count:,} ({m.auto_resolution_rate}%)", table_cell_style),
                Paragraph("Resolved via deterministic rules", table_cell_style)
            ],
            [
                Paragraph("Human-Approved Resolutions", table_cell_bold),
                Paragraph(f"{m.human_approved_count:,}", table_cell_style),
                Paragraph("Authorized via Maker-Checker queue", table_cell_style)
            ]
        ]
        metrics_table = Table(metrics_rows, colWidths=[200, 150, 154])
        metrics_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), c_navy),
            ("GRID", (0, 0), (-1, -1), 0.5, c_border),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, c_light_bg]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(metrics_table)
        elements.append(Spacer(1, 14))

        # =========================================================================
        # 4. EXCEPTION & RESOLUTION SUMMARY
        # =========================================================================
        elements.append(Paragraph("3. Exception Classification & Resolution Summary", h2_style))
        b = report.exception_breakdown
        exc_rows = [
            [
                Paragraph("Exception Category", table_header_style),
                Paragraph("Flagged Count", table_header_style),
                Paragraph("Resolution Method", table_header_style),
                Paragraph("Audit Status", table_header_style)
            ],
            [
                Paragraph("Amount Mismatch", table_cell_bold),
                Paragraph(str(b.get("AMOUNT_MISMATCH", 0)), table_cell_style),
                Paragraph("Fee Deductions & Variances", table_cell_style),
                Paragraph("Auto-resolved / Verified", table_cell_style)
            ],
            [
                Paragraph("Missing Settlement Record", table_cell_bold),
                Paragraph(str(b.get("MISSING_SETTLEMENT", 0)), table_cell_style),
                Paragraph("Unsettled Transactions", table_cell_style),
                Paragraph("Queued for Review", table_cell_style)
            ],
            [
                Paragraph("Duplicate Settlement Record", table_cell_bold),
                Paragraph(str(b.get("DUPLICATE", 0)), table_cell_style),
                Paragraph("Multi-Settlement Conflict", table_cell_style),
                Paragraph("Queued for Review", table_cell_style)
            ],
            [
                Paragraph("Order Reference Mismatch", table_cell_bold),
                Paragraph(str(b.get("REFERENCE_MISMATCH", 0)), table_cell_style),
                Paragraph("Correlation / Order ID Match", table_cell_style),
                Paragraph("Auto-resolved / Guardrail", table_cell_style)
            ]
        ]
        exc_table = Table(exc_rows, colWidths=[150, 80, 150, 124])
        exc_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), c_primary),
            ("GRID", (0, 0), (-1, -1), 0.5, c_border),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, c_light_bg]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(exc_table)
        elements.append(Spacer(1, 14))

        # =========================================================================
        # 5. KEY FINDINGS
        # =========================================================================
        elements.append(Paragraph("4. Key Operational Findings", h2_style))
        for finding in report.narrative.key_findings:
            elements.append(Paragraph(f"•  {finding}", bullet_style))
            elements.append(Spacer(1, 3))
        elements.append(Spacer(1, 10))

        # =========================================================================
        # 6. FINAL RECONCILIATION OUTCOME
        # =========================================================================
        outcome_elements = []
        outcome_elements.append(Paragraph("5. Final Reconciliation Outcome", h2_style))
        outcome_elements.append(Paragraph(report.narrative.reconciliation_outcome, body_style))
        outcome_elements.append(Spacer(1, 6))
        outcome_elements.append(Paragraph(report.narrative.conclusion, body_style))
        elements.append(KeepTogether(outcome_elements))

        # Build Document with NumberedCanvas
        doc.build(elements, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()
