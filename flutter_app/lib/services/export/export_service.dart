import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'docx_exporter.dart';
import 'excel_exporter.dart';
import 'pdf_exporter.dart';
import 'txt_exporter.dart';

enum ExportFormat {
  pdf('PDF', 'pdf'),
  docx('DOCX', 'docx'),
  txt('TXT', 'txt'),
  excel('Excel', 'xlsx');

  const ExportFormat(this.label, this.extension);
  final String label;
  final String extension;
}

class ExportPayload {
  const ExportPayload({
    required this.format,
    required this.title,
    required this.deltaJson,
  });

  final ExportFormat format;
  final String title;
  final String deltaJson;
}

/// Top-level Isolate entry point for `compute()` so large PDF/DOCX/XLSX generation
/// never blocks the 60fps UI thread on 3GB RAM devices.
Future<Uint8List> _generateExportBytesInIsolate(ExportPayload payload) async {
  switch (payload.format) {
    case ExportFormat.txt:
      return TxtExporter.generateBytes(
        title: payload.title,
        deltaJson: payload.deltaJson,
      );
    case ExportFormat.pdf:
      return PdfExporter.generateBytes(
        title: payload.title,
        deltaJson: payload.deltaJson,
      );
    case ExportFormat.docx:
      return DocxExporter.generateBytes(
        title: payload.title,
        deltaJson: payload.deltaJson,
      );
    case ExportFormat.excel:
      return ExcelExporter.generateBytes(
        title: payload.title,
        deltaJson: payload.deltaJson,
      );
  }
}

class ExportService {
  static const String _tempSubdir = 'notegenie_exports';

  /// Generates the file inside a background Isolate (`compute`), writes to
  /// `getTemporaryDirectory()`, opens the native Android Share Sheet, and cleans
  /// up stale/completed temporary files to protect 64GB ROM storage.
  Future<File> exportAndShare({
    required ExportFormat format,
    required String title,
    required String deltaJson,
    Directory? overrideTempDir,
    bool triggerShareSheet = true,
  }) async {
    final baseTempDir = overrideTempDir ?? await getTemporaryDirectory();
    final exportDir = Directory(p.join(baseTempDir.path, _tempSubdir));
    if (!await exportDir.exists()) {
      await exportDir.create(recursive: true);
    }

    // Remove expired temporary exports (> 10 min old) before creating new ones
    await cleanupStaleTempExports(exportDir);

    final bytes = await compute(
      _generateExportBytesInIsolate,
      ExportPayload(format: format, title: title, deltaJson: deltaJson),
    );

    final safeTitle = _sanitizeFilename(title);
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final fileName = '${safeTitle}_$timestamp.${format.extension}';
    final outFile = File(p.join(exportDir.path, fileName));
    await outFile.writeAsBytes(bytes, flush: true);

    if (triggerShareSheet) {
      await Share.shareXFiles(
        [XFile(outFile.path)],
        subject: title.trim().isEmpty ? 'NoteGenie AI Note' : title.trim(),
      );

      // Schedule delayed cleanup so receiving Android apps have time to read the URI
      unawaited(
        Future<void>.delayed(const Duration(minutes: 5), () async {
          if (await outFile.exists()) {
            await outFile.delete();
          }
        }),
      );
    }

    return outFile;
  }

  Future<void> cleanupStaleTempExports(
    Directory exportDir, {
    Duration maxAge = const Duration(minutes: 10),
  }) async {
    if (!await exportDir.exists()) return;
    final cutoff = DateTime.now().subtract(maxAge);
    await for (final entity in exportDir.list(followLinks: false)) {
      if (entity is File) {
        try {
          final stat = await entity.stat();
          if (stat.modified.isBefore(cutoff)) {
            await entity.delete();
          }
        } catch (_) {
          // Ignore locked temp file
        }
      }
    }
  }

  static String _sanitizeFilename(String raw) {
    final cleaned = raw
        .trim()
        .replaceAll(RegExp(r'[^\w\s-]+'), '')
        .replaceAll(RegExp(r'\s+'), '_');
    if (cleaned.isEmpty) return 'NoteGenie_Note';
    return cleaned.length > 40 ? cleaned.substring(0, 40) : cleaned;
  }
}
