import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../db/app_database.dart';
import 'docx_exporter.dart';
import 'export_service.dart';
import 'pdf_exporter.dart';

enum BatchExportFormat {
  pdf('PDF', 'pdf'),
  docx('DOCX', 'docx');

  const BatchExportFormat(this.label, this.extension);
  final String label;
  final String extension;
}

class BatchNotePayload {
  const BatchNotePayload({
    required this.title,
    required this.deltaJson,
  });

  final String title;
  final String deltaJson;
}

class BatchExportRequest {
  const BatchExportRequest({
    required this.format,
    required this.bundleTitle,
    required this.notes,
  });

  final BatchExportFormat format;
  final String bundleTitle;
  final List<BatchNotePayload> notes;
}

/// Top-level Isolate entry point for bulk PDF & DOCX generation so exporting
/// multiple notes never stalls the UI thread on 3GB RAM devices.
Future<Uint8List> _generateBatchExportInIsolate(BatchExportRequest request) async {
  final combinedOps = <Map<String, dynamic>>[];

  for (var i = 0; i < request.notes.length; i++) {
    final item = request.notes[i];
    final heading = item.title.trim().isEmpty ? 'Untitled Note' : item.title.trim();
    combinedOps.add({'insert': heading});
    combinedOps.add({
      'insert': '\n',
      'attributes': {'header': 1},
    });

    try {
      final decoded = jsonDecode(item.deltaJson);
      if (decoded is List) {
        for (final op in decoded) {
          if (op is Map) {
            combinedOps.add(Map<String, dynamic>.from(op));
          }
        }
      }
    } catch (_) {
      combinedOps.add({'insert': item.deltaJson});
      combinedOps.add({'insert': '\n'});
    }

    if (i < request.notes.length - 1) {
      combinedOps.add({'insert': '---'});
      combinedOps.add({'insert': '\n'});
    }
  }

  final mergedDeltaJson = jsonEncode(combinedOps);

  switch (request.format) {
    case BatchExportFormat.pdf:
      return PdfExporter.generateBytes(
        title: request.bundleTitle,
        deltaJson: mergedDeltaJson,
      );
    case BatchExportFormat.docx:
      return DocxExporter.generateBytes(
        title: request.bundleTitle,
        deltaJson: mergedDeltaJson,
      );
  }
}

/// Service layer for background batch export of multiple SQLite notes into a
/// combined PDF or DOCX document inside a Dart `compute()` Isolate.
class BatchExportService {
  BatchExportService({ExportService? exportService})
      : _exportService = exportService ?? ExportService();

  static const String _tempSubdir = 'notegenie_exports';
  final ExportService _exportService;

  Future<File> exportNotesBatch({
    required List<Note> notes,
    required BatchExportFormat format,
    String bundleTitle = 'NoteGenie AI Batch Export',
    Directory? overrideTempDir,
    bool triggerShareSheet = true,
    void Function(int processed, int total)? onProgress,
  }) async {
    if (notes.isEmpty) {
      throw ArgumentError('Select at least one note to batch export.');
    }

    onProgress?.call(0, notes.length);

    final payloads = <BatchNotePayload>[];
    for (var i = 0; i < notes.length; i++) {
      payloads.add(
        BatchNotePayload(title: notes[i].title, deltaJson: notes[i].content),
      );
      onProgress?.call(i + 1, notes.length);
    }

    final baseTempDir = overrideTempDir ?? await getTemporaryDirectory();
    final exportDir = Directory(p.join(baseTempDir.path, _tempSubdir));
    if (!await exportDir.exists()) {
      await exportDir.create(recursive: true);
    }

    await _exportService.cleanupStaleTempExports(exportDir);

    final bytes = await compute(
      _generateBatchExportInIsolate,
      BatchExportRequest(
        format: format,
        bundleTitle: bundleTitle,
        notes: payloads,
      ),
    );

    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final outFile = File(
      p.join(exportDir.path, 'NoteGenie_Batch_$timestamp.${format.extension}'),
    );
    await outFile.writeAsBytes(bytes, flush: true);

    if (triggerShareSheet) {
      await Share.shareXFiles(
        [XFile(outFile.path)],
        subject: '$bundleTitle (${notes.length} notes)',
      );
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
}
