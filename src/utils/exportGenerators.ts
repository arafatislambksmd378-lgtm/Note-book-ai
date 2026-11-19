import type { NotePreviewItem, NotebookEntry } from '../data/phase1Data';
import { deserializeQuillDelta, type RichBlock } from './phase2Store';

export type WebExportFormat = 'pdf' | 'docx' | 'txt' | 'xlsx';

export function buildExportFilename(title: string, format: WebExportFormat): string {
  const cleaned = title
    .trim()
    .replace(/[^\w\s-]+/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 40);
  const base = cleaned || 'NoteGenie_Note';
  return `${base}.${format}`;
}

export function getRecentNotes(
  notes: NotePreviewItem[],
  limit = 5
): NotePreviewItem[] {
  return [...notes]
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    .slice(0, limit);
}

export function searchIndexedNotebooks(
  notebooks: NotebookEntry[],
  query: string
): NotebookEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return notebooks;
  return notebooks.filter((nb) => nb.name.toLowerCase().includes(normalized));
}

export function formatPlainTextFromBlocks(
  title: string,
  blocks: RichBlock[]
): string {
  const lines: string[] = [];
  if (title.trim()) {
    lines.push(title.trim());
    lines.push('='.repeat(Math.min(40, Math.max(3, title.trim().length))));
    lines.push('');
  }

  let orderedIdx = 0;
  for (const block of blocks) {
    if (block.type === 'ordered') {
      orderedIdx += 1;
    } else {
      orderedIdx = 0;
    }

    switch (block.type) {
      case 'h1':
        lines.push(`# ${block.text}`);
        break;
      case 'h2':
        lines.push(`## ${block.text}`);
        break;
      case 'bullet':
        lines.push(`• ${block.text}`);
        break;
      case 'ordered':
        lines.push(`${orderedIdx}. ${block.text}`);
        break;
      case 'checklist':
        lines.push(`${block.checked ? '[x]' : '[ ]'} ${block.text}`);
        break;
      case 'paragraph':
      default:
        lines.push(block.text);
        break;
    }
  }

  return lines.join('\n').trimEnd();
}

export function generateTxtBytes(title: string, deltaJson: string): Uint8Array {
  const blocks = deserializeQuillDelta(deltaJson);
  const text = formatPlainTextFromBlocks(title, blocks);
  return new TextEncoder().encode(text);
}

function escapePdfText(input: string): string {
  return input
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export function generatePdfBytes(title: string, deltaJson: string): Uint8Array {
  const blocks = deserializeQuillDelta(deltaJson);
  const lines = formatPlainTextFromBlocks(title, blocks).split('\n').slice(0, 42);

  const streamOps: string[] = ['BT', '/F1 12 Tf', '50 780 Td', '16 TL'];
  lines.forEach((line, idx) => {
    const escaped = escapePdfText(line);
    if (idx === 0) {
      streamOps.push(`/F1 16 Tf (${escaped}) Tj /F1 12 Tf`);
    } else {
      streamOps.push(`T* (${escaped}) Tj`);
    }
  });
  streamOps.push('ET');
  const stream = streamOps.join('\n');

  const objects: string[] = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${stream.length} >>\nstream\n${stream}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += `${obj}\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createStoreZip(entries: Array<{ name: string; content: string }>): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.content);
    const crc = crc32(dataBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dataBytes.length, true);
    lv.setUint32(22, dataBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dataBytes.length, true);
    cv.setUint32(24, dataBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((sum, p) => sum + p.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalLength = offset + centralSize + eocd.length;
  const output = new Uint8Array(totalLength);
  let cursor = 0;
  for (const part of localParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centralParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  output.set(eocd, cursor);
  return output;
}

export function generateDocxBytes(title: string, deltaJson: string): Uint8Array {
  const blocks = deserializeQuillDelta(deltaJson);
  const paragraphs: string[] = [];

  if (title.trim()) {
    paragraphs.push(
      `<w:p><w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr><w:t xml:space="preserve">${escapeXml(
        title.trim()
      )}</w:t></w:r></w:p>`
    );
  }

  for (const block of blocks) {
    const rPr = [
      block.bold || block.type === 'h1' || block.type === 'h2' ? '<w:b/>' : '',
      block.italic ? '<w:i/>' : '',
      block.underline ? '<w:u w:val="single"/>' : '',
    ].join('');
    const prefix =
      block.type === 'bullet'
        ? '• '
        : block.type === 'checklist'
        ? block.checked
          ? '[x] '
          : '[ ] '
        : '';
    paragraphs.push(
      `<w:p><w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${escapeXml(
        prefix + block.text
      )}</w:t></w:r></w:p>`
    );
  }

  const documentXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body>${paragraphs.join('')}<w:sectPr/></w:body></w:document>`;

  return createStoreZip([
    {
      name: '[Content_Types].xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'word/document.xml',
      content: documentXml,
    },
  ]);
}

export function generateExcelBytes(title: string, deltaJson: string): Uint8Array {
  const blocks = deserializeQuillDelta(deltaJson).filter((b) => b.text.trim().length > 0);
  const rows: string[][] = [];

  if (title.trim()) {
    rows.push([title.trim()]);
  }

  const hasDelimited = blocks.some(
    (b) => b.text.includes('|') || b.text.includes(',')
  );

  if (hasDelimited) {
    for (const block of blocks) {
      const delim = block.text.includes('|') ? '|' : ',';
      rows.push(block.text.split(delim).map((c) => c.trim()));
    }
  } else {
    rows.push(['Type', 'Content']);
    for (const block of blocks) {
      rows.push([block.type, block.text.trim()]);
    }
  }

  const rowXml = rows
    .map((cells, rIdx) => {
      const cellXml = cells
        .map((val, cIdx) => {
          const colLetter = String.fromCharCode(65 + (cIdx % 26));
          return `<c r="${colLetter}${rIdx + 1}" t="inlineStr"><is><t>${escapeXml(
            val
          )}</t></is></c>`;
        })
        .join('');
      return `<row r="${rIdx + 1}">${cellXml}</row>`;
    })
    .join('');

  const sheetXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetData>${rowXml}</sheetData></worksheet>`;

  return createStoreZip([
    {
      name: '[Content_Types].xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '</Types>',
    },
    {
      name: '_rels/.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'xl/workbook.xml',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="NoteGenie" sheetId="1" r:id="rId1"/></sheets></workbook>',
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      content: sheetXml,
    },
  ]);
}

export function generateExportArtifact(
  format: WebExportFormat,
  title: string,
  deltaJson: string
): { filename: string; mimeType: string; bytes: Uint8Array } {
  const filename = buildExportFilename(title, format);
  switch (format) {
    case 'txt':
      return {
        filename,
        mimeType: 'text/plain;charset=utf-8',
        bytes: generateTxtBytes(title, deltaJson),
      };
    case 'pdf':
      return {
        filename,
        mimeType: 'application/pdf',
        bytes: generatePdfBytes(title, deltaJson),
      };
    case 'docx':
      return {
        filename,
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        bytes: generateDocxBytes(title, deltaJson),
      };
    case 'xlsx':
      return {
        filename,
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        bytes: generateExcelBytes(title, deltaJson),
      };
  }
}

export function generateBatchExportArtifact(
  format: 'pdf' | 'docx',
  notes: NotePreviewItem[],
  bundleTitle = 'NoteGenie AI Batch Export'
): { filename: string; mimeType: string; bytes: Uint8Array; noteCount: number } {
  if (notes.length === 0) {
    throw new Error('At least one note is required for batch export.');
  }

  const combinedOps: Array<{ insert: string; attributes?: Record<string, unknown> }> = [];
  notes.forEach((note, idx) => {
    combinedOps.push({ insert: note.title.trim() || 'Untitled Note' });
    combinedOps.push({ insert: '\n', attributes: { header: 1 } });

    const blocks = note.contentDeltaJson
      ? deserializeQuillDelta(note.contentDeltaJson)
      : [{ id: `b_${idx}`, type: 'paragraph' as const, text: note.snippet ?? '' }];

    for (const b of blocks) {
      if (b.text.trim()) {
        combinedOps.push({ insert: b.text });
        combinedOps.push({ insert: '\n' });
      }
    }
    if (idx < notes.length - 1) {
      combinedOps.push({ insert: '---' });
      combinedOps.push({ insert: '\n' });
    }
  });

  const mergedDeltaJson = JSON.stringify(combinedOps);
  const artifact = generateExportArtifact(format, bundleTitle, mergedDeltaJson);
  return {
    ...artifact,
    noteCount: notes.length,
  };
}
