import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:notegenie_ai/services/export/docx_exporter.dart';
import 'package:notegenie_ai/services/export/excel_exporter.dart';
import 'package:notegenie_ai/services/export/export_service.dart';
import 'package:notegenie_ai/services/export/pdf_exporter.dart';
import 'package:notegenie_ai/services/export/txt_exporter.dart';

void main() {
  final sampleDelta = jsonEncode([
    {'insert': 'Meeting Summary'},
    {
      'insert': '\n',
      'attributes': {'header': 1}
    },
    {
      'insert': 'Action Items',
      'attributes': {'bold': true}
    },
    {'insert': '\n'},
    {'insert': 'Finalize SQLite indexes'},
    {
      'insert': '\n',
      'attributes': {'list': 'checked'}
    },
    {'insert': 'Review Bengali STT model'},
    {
      'insert': '\n',
      'attributes': {'list': 'unchecked'}
    },
  ]);

  group('Phase 3 Export Generators & Temp Cleanup', () {
    test('TxtExporter extracts formatted plain text from Quill Delta', () {
      final bytes = TxtExporter.generateBytes(
        title: 'Sprint Plan',
        deltaJson: sampleDelta,
      );
      final text = utf8.decode(bytes);

      expect(text, contains('Sprint Plan'));
      expect(text, contains('# Meeting Summary'));
      expect(text, contains('[x] Finalize SQLite indexes'));
      expect(text, contains('[ ] Review Bengali STT model'));
    });

    test('PdfExporter, DocxExporter, and ExcelExporter produce valid file headers', () async {
      final pdfBytes = await PdfExporter.generateBytes(
        title: 'Sprint Plan',
        deltaJson: sampleDelta,
      );
      expect(utf8.decode(pdfBytes.take(5).toList()), '%PDF-');

      final docxBytes = DocxExporter.generateBytes(
        title: 'Sprint Plan',
        deltaJson: sampleDelta,
      );
      // OOXML .docx is a ZIP archive starting with 'PK'
      expect(docxBytes.take(2).toList(), [0x50, 0x4B]);

      final xlsxBytes = ExcelExporter.generateBytes(
        title: 'Sprint Plan',
        deltaJson: sampleDelta,
      );
      expect(xlsxBytes.take(2).toList(), [0x50, 0x4B]);
    });

    test('ExportService writes temp files with proper extensions and cleans stale files', () async {
      final tempDir = await Directory.systemTemp.createTemp('notegenie_export_test_');
      final service = ExportService();

      try {
        for (final format in ExportFormat.values) {
          final file = await service.exportAndShare(
            format: format,
            title: 'Test Note',
            deltaJson: sampleDelta,
            overrideTempDir: tempDir,
            triggerShareSheet: false,
          );

          expect(await file.exists(), true);
          expect(file.path.endsWith('.${format.extension}'), true);

          if (format == ExportFormat.txt) {
            final contents = await file.readAsString();
            expect(contents, contains('Finalize SQLite indexes'));
          }
        }

        // Verify cleanup removes stale temp files
        final exportSubdir = Directory('${tempDir.path}/notegenie_exports');
        await service.cleanupStaleTempExports(
          exportSubdir,
          maxAge: Duration.zero,
        );
        final remaining = await exportSubdir.list().toList();
        expect(remaining, isEmpty);
      } finally {
        if (await tempDir.exists()) {
          await tempDir.delete(recursive: true);
        }
      }
    });
  });
}
