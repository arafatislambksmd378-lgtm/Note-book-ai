import 'dart:typed_data';
import 'package:excel/excel.dart';
import 'quill_delta_parser.dart';

abstract final class ExcelExporter {
  /// Exports Quill Delta blocks into an .xlsx workbook.
  /// Detects delimited rows (|, comma, or key: value) into columns;
  /// otherwise exports structured note paragraphs and checklists as rows.
  static Uint8List generateBytes({
    required String title,
    required String deltaJson,
  }) {
    final blocks = QuillDeltaParser.parse(deltaJson);
    final excel = Excel.createExcel();
    final sheet = excel['NoteGenie Export'];
    if (excel.sheets.containsKey('Sheet1')) {
      excel.delete('Sheet1');
    }

    var rowIndex = 0;
    if (title.trim().isNotEmpty) {
      sheet
          .cell(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: rowIndex))
          .value = TextCellValue(title.trim());
      rowIndex += 2;
    }

    final nonEmptyLines = blocks
        .map((b) => b)
        .where((b) => b.plainText.trim().isNotEmpty)
        .toList();

    final hasDelimitedTable = nonEmptyLines.any(
      (b) => b.plainText.contains('|') || b.plainText.contains(','),
    );

    if (hasDelimitedTable) {
      for (final block in nonEmptyLines) {
        final raw = block.plainText.trim();
        final delimiter = raw.contains('|') ? '|' : ',';
        final cells = raw.split(delimiter).map((c) => c.trim()).toList();
        for (var col = 0; col < cells.length; col++) {
          sheet
              .cell(CellIndex.indexByColumnRow(columnIndex: col, rowIndex: rowIndex))
              .value = TextCellValue(cells[col]);
        }
        rowIndex += 1;
      }
    } else {
      // Structured row output: Type / Status | Content
      sheet
          .cell(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: rowIndex))
          .value = TextCellValue('Block Type');
      sheet
          .cell(CellIndex.indexByColumnRow(columnIndex: 1, rowIndex: rowIndex))
          .value = TextCellValue('Content');
      rowIndex += 1;

      for (final block in nonEmptyLines) {
        final typeLabel = switch (block.type) {
          ExportBlockType.heading1 => 'Heading 1',
          ExportBlockType.heading2 => 'Heading 2',
          ExportBlockType.bullet => 'Bullet',
          ExportBlockType.ordered => 'Numbered',
          ExportBlockType.checklistChecked => 'Done',
          ExportBlockType.checklistUnchecked => 'Todo',
          ExportBlockType.paragraph => 'Paragraph',
        };

        sheet
            .cell(CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: rowIndex))
            .value = TextCellValue(typeLabel);
        sheet
            .cell(CellIndex.indexByColumnRow(columnIndex: 1, rowIndex: rowIndex))
            .value = TextCellValue(block.plainText.trim());
        rowIndex += 1;
      }
    }

    final encoded = excel.encode();
    return Uint8List.fromList(encoded ?? const <int>[]);
  }
}
