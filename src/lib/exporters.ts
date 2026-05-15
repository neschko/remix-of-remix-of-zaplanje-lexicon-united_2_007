import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import type { SanuEntry } from "./sanu/types";

function sortEntries(entries: SanuEntry[]): SanuEntry[] {
  return [...entries].sort((a, b) =>
    a.letter === b.letter ? a.headword.localeCompare(b.headword, "sr") : a.letter.localeCompare(b.letter, "sr")
  );
}

export async function exportPdf(entries: SanuEntry[], title = "Заплањски Речник") {
  const sorted = sortEntries(entries);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const lineH = 14;
  let y = margin;
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - margin * 2;

  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.text(title, pageW / 2, y, { align: "center" });
  y += 30;
  doc.setFontSize(10);
  doc.setFont("times", "italic");
  doc.text(`${sorted.length} одредница · ${new Date().toLocaleDateString("sr-Cyrl")}`, pageW / 2, y, { align: "center" });
  y += 24;

  let lastLetter = "";
  for (const e of sorted) {
    if (e.letter !== lastLetter) {
      if (y > pageH - 100) {
        doc.addPage();
        y = margin;
      }
      doc.setFont("times", "bold");
      doc.setFontSize(16);
      doc.text(e.letter, margin, y);
      y += 22;
      lastLetter = e.letter;
    }
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    const head = e.accented || e.headword;
    const headLines = doc.splitTextToSize(`${head}${e.pos ? `  ${e.pos}` : ""}`, maxW);
    if (y + headLines.length * lineH > pageH - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(headLines, margin, y);
    y += headLines.length * lineH;

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    for (const m of e.meanings) {
      const text = `${m.number}. ${m.definition}`;
      const lines = doc.splitTextToSize(text, maxW - 12);
      if (y + lines.length * lineH > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(lines, margin + 12, y);
      y += lines.length * lineH;
      if (m.examples) {
        for (const ex of m.examples) {
          const exLines = doc.splitTextToSize(`— ${ex.text}`, maxW - 24);
          if (y + exLines.length * lineH > pageH - margin) {
            doc.addPage();
            y = margin;
          }
          doc.setFont("times", "italic");
          doc.text(exLines, margin + 24, y);
          doc.setFont("times", "normal");
          y += exLines.length * lineH;
        }
      }
    }
    y += 6;
  }

  doc.save(`zaplanjski-recnik-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportDocx(entries: SanuEntry[], title = "Заплањски Речник") {
  const sorted = sortEntries(entries);
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: title, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `${sorted.length} одредница · ${new Date().toLocaleDateString("sr-Cyrl")}`, italics: true })],
    }),
    new Paragraph({ children: [new TextRun(" ")] }),
  ];

  let lastLetter = "";
  for (const e of sorted) {
    if (e.letter !== lastLetter) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: e.letter, bold: true })],
        })
      );
      lastLetter = e.letter;
    }
    const headRuns: TextRun[] = [
      new TextRun({ text: e.accented || e.headword, bold: true }),
    ];
    if (e.pos) headRuns.push(new TextRun({ text: `  ${e.pos}`, italics: true }));
    children.push(new Paragraph({ children: headRuns }));

    for (const m of e.meanings) {
      children.push(
        new Paragraph({
          children: [new TextRun(`${m.number}. ${m.definition}`)],
          indent: { left: 240 },
        })
      );
      if (m.examples) {
        for (const ex of m.examples) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `— ${ex.text}`, italics: true })],
              indent: { left: 480 },
            })
          );
        }
      }
    }
    children.push(new Paragraph({ children: [new TextRun(" ")] }));
  }

  const docDoc = new Document({
    styles: {
      default: { document: { run: { font: "Times New Roman", size: 22 } } },
    },
    sections: [{ children }],
  });
  const blob = await Packer.toBlob(docDoc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `zaplanjski-recnik-${new Date().toISOString().slice(0, 10)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
