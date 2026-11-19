import 'dart:convert';
import 'dart:typed_data';
import 'package:archive/archive.dart';
import 'quill_delta_parser.dart';

abstract final class DocxExporter {
  /// Generates a valid OpenXML (.docx) package directly in memory inside an Isolate
  /// without requiring an external template file, preserving Headings, Bold, Italic,
  /// Underline, Bullet lists, Ordered lists, and Checklists.
  static Uint8List generateBytes({
    required String title,
    required String deltaJson,
  }) {
    final blocks = QuillDeltaParser.parse(deltaJson);
    final docXml = _buildDocumentXml(title: title, blocks: blocks);

    final archive = Archive();
    _addUtf8File(archive, '[Content_Types].xml', _contentTypesXml);
    _addUtf8File(archive, '_rels/.rels', _rootRelsXml);
    _addUtf8File(archive, 'word/_rels/document.xml.rels', _documentRelsXml);
    _addUtf8File(archive, 'word/document.xml', docXml);

    final encoded = ZipEncoder().encode(archive);
    return Uint8List.fromList(encoded ?? const <int>[]);
  }

  static void _addUtf8File(Archive archive, String path, String contents) {
    final bytes = utf8.encode(contents);
    archive.addFile(ArchiveFile(path, bytes.length, bytes));
  }

  static String _buildDocumentXml({
    required String title,
    required List<ExportBlock> blocks,
  }) {
    final body = StringBuffer();

    if (title.trim().isNotEmpty) {
      body.write(
        '<w:p><w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr>'
        '<w:t xml:space="preserve">${_escapeXml(title.trim())}</w:t></w:r></w:p>',
      );
    }

    var orderedIndex = 0;
    for (final block in blocks) {
      if (block.type == ExportBlockType.ordered) {
        orderedIndex += 1;
      } else {
        orderedIndex = 0;
      }

      body.write('<w:p>');

      final prefix = switch (block.type) {
        ExportBlockType.bullet => '• ',
        ExportBlockType.ordered => '$orderedIndex. ',
        ExportBlockType.checklistChecked => '[x] ',
        ExportBlockType.checklistUnchecked => '[ ] ',
        _ => null,
      };

      if (prefix != null) {
        body.write(
          '<w:r><w:t xml:space="preserve">${_escapeXml(prefix)}</w:t></w:r>',
        );
      }

      final fontSizeHalfPoints = switch (block.type) {
        ExportBlockType.heading1 => 32,
        ExportBlockType.heading2 => 26,
        _ => 22,
      };
      final isHeading = block.type == ExportBlockType.heading1 ||
          block.type == ExportBlockType.heading2;

      for (final span in block.spans) {
        body.write('<w:r><w:rPr>');
        if (span.bold || isHeading) body.write('<w:b/>');
        if (span.italic) body.write('<w:i/>');
        if (span.underline) body.write('<w:u w:val="single"/>');
        body.write('<w:sz w:val="$fontSizeHalfPoints"/>');
        body.write('</w:rPr>');
        body.write(
          '<w:t xml:space="preserve">${_escapeXml(span.text)}</w:t>',
        );
        body.write('</w:r>');
      }

      body.write('</w:p>');
    }

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:body>$body<w:sectPr/></w:body>'
        '</w:document>';
  }

  static String _escapeXml(String input) {
    return input
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
  }

  static const String _contentTypesXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      '<Default Extension="xml" ContentType="application/xml"/>'
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
      '</Types>';

  static const String _rootRelsXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
      '</Relationships>';

  static const String _documentRelsXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>';
}
