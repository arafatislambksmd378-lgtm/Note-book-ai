import 'dart:convert';
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:path/path.dart' as p;
import 'package:shared_preferences/shared_preferences.dart';
import 'ai_service.dart';

class AIModelEntry {
  const AIModelEntry({
    required this.id,
    required this.name,
    required this.path,
    required this.sizeBytes,
    this.quantization = 'Q4_K_M (4-bit)',
  });

  final String id;
  final String name;
  final String path;
  final int sizeBytes;
  final String quantization;

  String get formattedSize {
    if (sizeBytes <= 0) return 'Not imported';
    final mb = sizeBytes / (1024 * 1024);
    if (mb >= 1024) {
      return '${(mb / 1024).toStringAsFixed(2)} GB';
    }
    return '${mb.toStringAsFixed(0)} MB';
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'path': path,
        'sizeBytes': sizeBytes,
        'quantization': quantization,
      };

  factory AIModelEntry.fromJson(Map<String, dynamic> json) {
    return AIModelEntry(
      id: json['id'] as String,
      name: json['name'] as String,
      path: json['path'] as String,
      sizeBytes: (json['sizeBytes'] as num?)?.toInt() ?? 0,
      quantization: (json['quantization'] as String?) ?? 'Q4_K_M (4-bit)',
    );
  }
}

/// Manages local `.gguf` models, `SharedPreferences` path persistence,
/// file_picker import, model swapping, and RAM unloading.
class AIModelManager {
  AIModelManager({
    required SharedPreferences prefs,
    required AIService aiService,
  })  : _prefs = prefs,
        _aiService = aiService;

  static const String selectedModelPathKey = 'selected_gguf_model_path';
  static const String importedModelsJsonKey = 'imported_gguf_models_v1';

  final SharedPreferences _prefs;
  final AIService _aiService;

  static const List<AIModelEntry> defaultPresets = [
    AIModelEntry(
      id: 'qwen_1_5b',
      name: 'Qwen-1.5B-Instruct (4-bit)',
      path: '/storage/emulated/0/Download/Qwen-1.5B-Instruct-Q4_K_M.gguf',
      sizeBytes: 1033895936, // ~986 MB
      quantization: 'Q4_K_M (4-bit)',
    ),
    AIModelEntry(
      id: 'phi_3_mini',
      name: 'Phi-3-Mini-4K (4-bit)',
      path: '/storage/emulated/0/Download/Phi-3-Mini-4K-Q4.gguf',
      sizeBytes: 2254857830, // ~2.10 GB
      quantization: 'Q4_K_M (4-bit)',
    ),
  ];

  List<AIModelEntry> getAvailableModels() {
    final raw = _prefs.getString(importedModelsJsonKey);
    if (raw == null || raw.isEmpty) {
      return List<AIModelEntry>.from(defaultPresets);
    }
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      final list = decoded
          .whereType<Map<String, dynamic>>()
          .map(AIModelEntry.fromJson)
          .toList();
      return list.isEmpty ? List<AIModelEntry>.from(defaultPresets) : list;
    } catch (_) {
      return List<AIModelEntry>.from(defaultPresets);
    }
  }

  String? getSavedModelPath() {
    return _prefs.getString(selectedModelPathKey);
  }

  AIModelEntry? getSelectedModel() {
    final savedPath = getSavedModelPath();
    final models = getAvailableModels();
    if (savedPath == null || savedPath.isEmpty) {
      return models.isNotEmpty ? models.first : null;
    }
    for (final model in models) {
      if (model.path == savedPath) return model;
    }
    return AIModelEntry(
      id: 'saved_custom',
      name: p.basenameWithoutExtension(savedPath),
      path: savedPath,
      sizeBytes: 0,
    );
  }

  Future<void> saveSelectedModelPath(String modelPath) async {
    await _prefs.setString(selectedModelPathKey, modelPath);
  }

  Future<AIModelEntry> registerImportedModel({
    required String filePath,
    int? fileSizeBytes,
  }) async {
    if (!filePath.toLowerCase().endsWith('.gguf')) {
      throw ArgumentError('Selected file must be a 4-bit quantized .gguf model.');
    }

    var resolvedSize = fileSizeBytes ?? 0;
    if (resolvedSize == 0) {
      final file = File(filePath);
      if (await file.exists()) {
        resolvedSize = await file.length();
      }
    }

    final entry = AIModelEntry(
      id: 'gguf_${DateTime.now().millisecondsSinceEpoch}',
      name: p.basename(filePath),
      path: filePath,
      sizeBytes: resolvedSize,
      quantization: 'Q4_K_M (4-bit)',
    );

    final existing = getAvailableModels()
        .where((m) => m.path != filePath)
        .toList();
    final updated = [entry, ...existing];

    await _prefs.setString(
      importedModelsJsonKey,
      jsonEncode(updated.map((m) => m.toJson()).toList()),
    );
    await saveSelectedModelPath(filePath);
    return entry;
  }

  /// Opens Android file picker to import a `.gguf` file from local storage.
  Future<AIModelEntry?> pickAndImportModel() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.any,
      allowMultiple: false,
    );
    final picked = result?.files.singleOrNull;
    if (picked == null || picked.path == null) return null;

    final entry = await registerImportedModel(
      filePath: picked.path!,
      fileSizeBytes: picked.size,
    );
    await swapAndLoadModel(entry.path);
    return entry;
  }

  /// Unloads any active model from RAM before loading the newly selected `.gguf`.
  Future<void> swapAndLoadModel(String modelPath) async {
    await saveSelectedModelPath(modelPath);
    if (_aiService.isModelLoaded) {
      await _aiService.unloadModel();
    }
    await _aiService.loadModel(modelPath);
  }

  Future<void> unloadActiveModel() async {
    await _aiService.unloadModel();
  }
}
