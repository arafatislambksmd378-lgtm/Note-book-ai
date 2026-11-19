import 'dart:convert';

enum ExportBlockType {
  paragraph,
  heading1,
  heading2,
  bullet,
  ordered,
  checklistChecked,
  checklistUnchecked,
}

class ExportTextSpan {
  const ExportTextSpan({
    required this.text,
    this.bold = false,
    this.italic = false,
    this.underline = false,
  });

  final String text;
  final bool bold;
  final bool italic;
  final bool underline;
}

class ExportBlock {
  const ExportBlock({
    required this.type,
    required this.spans,
  });

  final ExportBlockType type;
  final List<ExportTextSpan> spans;

  String get plainText => spans.map((s) => s.text).join();
}

/// Pure Dart parser converting flutter_quill Delta JSON into structured blocks
/// safe to run inside a background Dart Isolate (`compute()`).
abstract final class QuillDeltaParser {
  static List<ExportBlock> parse(String deltaJson) {
    try {
      final decoded = jsonDecode(deltaJson);
      if (decoded is! List) {
        return [
          ExportBlock(
            type: ExportBlockType.paragraph,
            spans: [ExportTextSpan(text: deltaJson)],
          ),
        ];
      }

      final blocks = <ExportBlock>[];
      var currentSpans = <ExportTextSpan>[];

      void flushLine(Map<String, dynamic>? lineAttrs) {
        final type = _resolveBlockType(lineAttrs);
        blocks.add(
          ExportBlock(
            type: type,
            spans: List<ExportTextSpan>.unmodifiable(currentSpans),
          ),
        );
        currentSpans = <ExportTextSpan>[];
      }

      for (final rawOp in decoded) {
        if (rawOp is! Map) continue;
        final insert = rawOp['insert'];
        if (insert is! String) continue;

        final rawAttrs = rawOp['attributes'];
        final attrs = rawAttrs is Map
            ? Map<String, dynamic>.from(rawAttrs)
            : null;

        if (insert == '\n') {
          flushLine(attrs);
          continue;
        }

        final parts = insert.split('\n');
        for (var i = 0; i < parts.length; i++) {
          final segment = parts[i];
          if (segment.isNotEmpty) {
            currentSpans.add(
              ExportTextSpan(
                text: segment,
                bold: attrs?['bold'] == true,
                italic: attrs?['italic'] == true,
                underline: attrs?['underline'] == true,
              ),
            );
          }
          if (i < parts.length - 1) {
            flushLine(i == parts.length - 2 ? attrs : null);
          }
        }
      }

      if (currentSpans.isNotEmpty) {
        flushLine(null);
      }

      return blocks;
    } catch (_) {
      return [
        ExportBlock(
          type: ExportBlockType.paragraph,
          spans: [ExportTextSpan(text: deltaJson)],
        ),
      ];
    }
  }

  static ExportBlockType _resolveBlockType(Map<String, dynamic>? attrs) {
    if (attrs == null) return ExportBlockType.paragraph;
    if (attrs['header'] == 1) return ExportBlockType.heading1;
    if (attrs['header'] == 2) return ExportBlockType.heading2;

    final listAttr = attrs['list'];
    if (listAttr == 'bullet') return ExportBlockType.bullet;
    if (listAttr == 'ordered') return ExportBlockType.ordered;
    if (listAttr == 'checked') return ExportBlockType.checklistChecked;
    if (listAttr == 'unchecked') return ExportBlockType.checklistUnchecked;

    return ExportBlockType.paragraph;
  }
}
