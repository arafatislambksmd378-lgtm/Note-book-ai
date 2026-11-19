import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'quill_delta_parser.dart';

abstract final class PdfExporter {
  static Future<Uint8List> generateBytes({
    required String title,
    required String deltaJson,
  }) async {
    final blocks = QuillDeltaParser.parse(deltaJson);
    final doc = pw.Document(
      title: title,
      creator: 'NoteGenie AI',
    );

    var orderedIndex = 0;
    final widgets = <pw.Widget>[];

    if (title.trim().isNotEmpty) {
      widgets.add(
        pw.Padding(
          padding: const pw.EdgeInsets.only(bottom: 12),
          child: pw.Text(
            title.trim(),
            style: pw.TextStyle(
              fontSize: 22,
              fontWeight: pw.FontWeight.bold,
              color: PdfColor.fromHex('#1A1A24'),
            ),
          ),
        ),
      );
      widgets.add(
        pw.Divider(color: PdfColor.fromHex('#E6E6EC'), thickness: 1),
      );
      widgets.add(pw.SizedBox(height: 10));
    }

    for (final block in blocks) {
      if (block.type == ExportBlockType.ordered) {
        orderedIndex += 1;
      } else {
        orderedIndex = 0;
      }

      widgets.add(_buildBlockWidget(block, orderedIndex));
    }

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(36),
        build: (_) => widgets,
      ),
    );

    return doc.save();
  }

  static pw.Widget _buildBlockWidget(ExportBlock block, int orderedIndex) {
    final baseFontSize = switch (block.type) {
      ExportBlockType.heading1 => 18.0,
      ExportBlockType.heading2 => 14.5,
      _ => 11.5,
    };

    final isHeading = block.type == ExportBlockType.heading1 ||
        block.type == ExportBlockType.heading2;

    final richContent = pw.RichText(
      text: pw.TextSpan(
        children: block.spans.isEmpty
            ? [const pw.TextSpan(text: ' ')]
            : block.spans.map((span) {
                return pw.TextSpan(
                  text: span.text,
                  style: pw.TextStyle(
                    fontSize: baseFontSize,
                    fontWeight: (span.bold || isHeading)
                        ? pw.FontWeight.bold
                        : pw.FontWeight.normal,
                    fontStyle:
                        span.italic ? pw.FontStyle.italic : pw.FontStyle.normal,
                    decoration: span.underline
                        ? pw.TextDecoration.underline
                        : pw.TextDecoration.none,
                    color: PdfColor.fromHex('#1A1A24'),
                  ),
                );
              }).toList(),
      ),
    );

    final prefix = switch (block.type) {
      ExportBlockType.bullet => '•  ',
      ExportBlockType.ordered => '$orderedIndex.  ',
      ExportBlockType.checklistChecked => '[x]  ',
      ExportBlockType.checklistUnchecked => '[ ]  ',
      _ => null,
    };

    if (prefix != null) {
      return pw.Padding(
        padding: const pw.EdgeInsets.only(left: 10, bottom: 5),
        child: pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(
              prefix,
              style: pw.TextStyle(
                fontSize: 11.5,
                fontWeight: pw.FontWeight.bold,
                color: PdfColor.fromHex('#6B4EFF'),
              ),
            ),
            pw.Expanded(child: richContent),
          ],
        ),
      );
    }

    return pw.Padding(
      padding: pw.EdgeInsets.only(
        top: isHeading ? 8 : 0,
        bottom: isHeading ? 6 : 5,
      ),
      child: richContent,
    );
  }
}
