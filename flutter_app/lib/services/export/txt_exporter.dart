import 'dart:convert';
import 'dart:typed_data';
import 'quill_delta_parser.dart';

abstract final class TxtExporter {
  static Uint8List generateBytes({
    required String title,
    required String deltaJson,
  }) {
    final blocks = QuillDeltaParser.parse(deltaJson);
    final buffer = StringBuffer();

    if (title.trim().isNotEmpty) {
      buffer.writeln(title.trim());
      buffer.writeln('=' * title.trim().length.clamp(3, 40));
      buffer.writeln();
    }

    var orderedIndex = 0;
    for (final block in blocks) {
      final text = block.plainText;
      if (block.type == ExportBlockType.ordered) {
        orderedIndex += 1;
      } else {
        orderedIndex = 0;
      }

      switch (block.type) {
        case ExportBlockType.heading1:
          buffer.writeln('# $text');
          break;
        case ExportBlockType.heading2:
          buffer.writeln('## $text');
          break;
        case ExportBlockType.bullet:
          buffer.writeln('• $text');
          break;
        case ExportBlockType.ordered:
          buffer.writeln('$orderedIndex. $text');
          break;
        case ExportBlockType.checklistChecked:
          buffer.writeln('[x] $text');
          break;
        case ExportBlockType.checklistUnchecked:
          buffer.writeln('[ ] $text');
          break;
        case ExportBlockType.paragraph:
          buffer.writeln(text);
          break;
      }
    }

    return Uint8List.fromList(utf8.encode(buffer.toString().trimRight()));
  }
}
