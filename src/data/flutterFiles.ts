export interface FlutterFileEntry {
  path: string;
  label: string;
  language: 'yaml' | 'dart';
  phaseNote: string;
  content: string;
}

export const FLUTTER_FOLDER_TREE = `flutter_app/
├── pubspec.yaml
├── assets/
│   └── images/
├── test/
│   ├── note_repository_test.dart       # Phase 2: CRUD & LIMIT 20 pagination tests
│   ├── export_service_test.dart        # Phase 3: TXT/PDF/DOCX/XLSX & temp cleanup tests
│   └── ai_model_manager_test.dart      # Phase 4: AIModelManager, MockAIService, Batch Export & SyncStatus
└── lib/
    ├── main.dart                       # SharedPreferences + ProviderScope bootstrap
    ├── core/
    │   ├── constants/
    │   │   └── app_colors.dart
    │   └── theme/
    │       └── app_theme.dart
    ├── models/
    │   ├── note_preview.dart
    │   └── notebook_item.dart
    ├── providers/                      # Phases 2–4: Riverpod DB, Export & Local AI
    │   ├── database_providers.dart
    │   ├── notes_pagination_provider.dart
    │   └── ai_providers.dart
    ├── widgets/
    │   ├── top_app_bar.dart
    │   ├── segmented_tab_toggle.dart
    │   ├── note_card.dart
    │   ├── bottom_action_bar.dart
    │   ├── editor_toolbar.dart
    │   ├── export_bottom_sheet.dart
    │   └── sync_status_indicator.dart    # Pending / Saving / Synced visual badge
    ├── screens/
    │   ├── main_shell_screen.dart      # Wired Settings, More AI Chat & Batch Export
    │   ├── home_screen.dart
    │   ├── notebooks_screen.dart
    │   ├── note_editor_screen.dart
    │   ├── ai_chat_screen.dart         # Phase 4: Bengali offline ListView.builder chat
    │   └── settings_screen.dart        # Phase 4: .gguf import, swap, unload & prefs
    └── services/
        ├── db/                         # Phases 2–3: Drift + sqflite + indexed LIKE search
        ├── export/                     # Phases 3–4: Single & Batch Isolate PDF/DOCX export
        │   ├── quill_delta_parser.dart
        │   ├── txt_exporter.dart
        │   ├── pdf_exporter.dart
        │   ├── docx_exporter.dart
        │   ├── excel_exporter.dart
        │   ├── export_service.dart
        │   └── batch_export_service.dart
        └── ai/                         # Phase 4: llama.cpp Dart FFI in background Isolate
            ├── bengali_prompt_config.dart
            ├── ai_service.dart
            ├── llama_cpp_ai_service.dart
            ├── mock_ai_service.dart
            └── ai_model_manager.dart`;

export const PUBSPEC_YAML = `name: notegenie_ai
description: "NoteGenie AI — Fully offline, AI-powered note-taking mobile app optimized for 3GB RAM Android devices."
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.4.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter

  # UI, Typography & Layout (Phase 1)
  cupertino_icons: ^1.0.8
  google_fonts: ^6.2.1
  flutter_staggered_grid_view: ^0.7.0

  # State Management & Utilities (Phases 1 & 2)
  flutter_riverpod: ^2.5.1
  intl: ^0.19.0

  # Local Offline Database — SQLite + Drift (Phases 2 & 3)
  sqflite: ^2.3.3+1
  drift: ^2.20.3
  drift_sqflite: ^2.0.1
  path: ^1.9.0
  path_provider: ^2.1.4

  # Rich Text Editor (Phase 2)
  flutter_quill: ^10.5.0

  # File Handling, Compression & Export (Phases 3, 4 & 6)
  pdf: ^3.11.1
  docx_template: ^0.4.0
  archive: ^3.6.1
  excel: ^4.0.6
  share_plus: ^10.0.2
  file_picker: ^8.1.2
  image: ^4.2.0

  # Local Offline AI Engine — llama.cpp via Dart FFI (Phase 4)
  ffi: ^2.1.3
  llama_cpp_dart: ^0.1.0
  shared_preferences: ^2.3.2

  # Offline OCR, Bengali STT & Native TTS (Phase 5)
  google_mlkit_text_recognition: ^0.13.1
  vosk_flutter: ^0.3.48
  flutter_tts: ^4.0.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0
  drift_dev: ^2.20.3
  build_runner: ^2.4.12
  sqflite_common_ffi: ^2.3.3

flutter:
  uses-material-design: true
  assets:
    - assets/images/`;

export const FLUTTER_UI_FILES: FlutterFileEntry[] = [
  {
    path: 'lib/services/ai/llama_cpp_ai_service.dart',
    label: 'llama_cpp_ai_service.dart',
    language: 'dart',
    phaseNote: 'Phase 4: Runs llama_cpp_dart inside a persistent background Isolate with 2048-token cap & unloadModel.',
    content: `class LlamaCppAIService implements AIService {
  LlamaCppAIService({
    this.config = const AIEngineConfig(
      maxContextTokens: 2048,
      quantizationBits: 4,
      useMmap: true,
      gpuLayers: 0,
    ),
  });

  static Future<void> _llamaWorkerEntryPoint(SendPort mainSendPort) async {
    final inbox = ReceivePort();
    mainSendPort.send(inbox.sendPort);
    Llama? llamaEngine;

    await for (final message in inbox) {
      switch (message) {
        case _LoadCommand():
          llamaEngine?.dispose();
          final contextParams = ContextParams()
            ..nCtx = message.config.clampedContextTokens // Hard cap <= 2048
            ..nBatch = message.config.batchSize
            ..nThreads = message.config.threads;
          final modelParams = ModelParams()
            ..nGpuLayers = message.config.gpuLayers
            ..useMemorymap = message.config.useMmap;
          llamaEngine = Llama(message.modelPath, modelParams, contextParams);
          message.replyPort.send(true);
        case _GenerateCommand():
          llamaEngine!.setPrompt(message.formattedPrompt);
          // Stream tokens safely on worker Isolate
        case _UnloadCommand():
          llamaEngine?.dispose();
          llamaEngine = null;
          message.replyPort.send(true);
      }
    }
  }
}`,
  },
  {
    path: 'lib/services/ai/bengali_prompt_config.dart',
    label: 'bengali_prompt_config.dart',
    language: 'dart',
    phaseNote: 'Phase 4: Hidden English system prompt enforcing natural Bengali replies & 2048-token budget.',
    content: `abstract final class BengaliPromptConfig {
  static const int maxContextTokens = 2048;
  static const int reservedResponseTokens = 384;

  static const String baseSystemPrompt =
      'You are NoteGenie AI, an offline assistant. You must answer the '
      "user's queries naturally in Bengali. Keep responses concise to save "
      'processing time.';

  static String buildChatPrompt({
    required String userQuery,
    List<ChatMessage> recentHistory = const [],
    String systemPromptOverride = baseSystemPrompt,
  }) {
    // Injects hidden system prompt & prunes old turns above 2048 tokens
  }
}`,
  },
  {
    path: 'lib/services/ai/ai_model_manager.dart',
    label: 'ai_model_manager.dart',
    language: 'dart',
    phaseNote: 'Phase 4: Picks .gguf via file_picker, tracks size, swaps models, unloads RAM & persists path.',
    content: `class AIModelManager {
  static const String selectedModelPathKey = 'selected_gguf_model_path';

  Future<AIModelEntry?> pickAndImportModel() async {
    final result = await FilePicker.platform.pickFiles(type: FileType.any);
    final picked = result?.files.singleOrNull;
    if (picked == null || picked.path == null) return null;
    final entry = await registerImportedModel(
      filePath: picked.path!,
      fileSizeBytes: picked.size,
    );
    await swapAndLoadModel(entry.path);
    return entry;
  }

  Future<void> swapAndLoadModel(String modelPath) async {
    await saveSelectedModelPath(modelPath);
    if (_aiService.isModelLoaded) await _aiService.unloadModel();
    await _aiService.loadModel(modelPath);
  }
}`,
  },
  {
    path: 'lib/screens/ai_chat_screen.dart',
    label: 'ai_chat_screen.dart',
    language: 'dart',
    phaseNote: 'Phase 4: ListView.builder Bengali chat UI with NoteGenie palette & "AI is thinking..." indicator.',
    content: `class AIChatScreen extends ConsumerStatefulWidget { ... }

// Scrollable ListView.builder with _ThinkingBubble when generating:
Expanded(
  child: ListView.builder(
    controller: _scrollController,
    itemCount: chatState.messages.length + (chatState.isGenerating ? 1 : 0),
    itemBuilder: (context, index) {
      if (chatState.isGenerating && index == chatState.messages.length) {
        return const _ThinkingBubble(); // "AI is thinking..."
      }
      ...
    },
  ),
)`,
  },
  {
    path: 'lib/screens/settings_screen.dart',
    label: 'settings_screen.dart',
    language: 'dart',
    phaseNote: 'Phase 4: Model Manager UI showing loaded GGUF size, swap cards, Import .gguf & Unload RAM.',
    content: `class SettingsScreen extends ConsumerWidget {
  // Displays active model name, formattedSize, 4-bit quantization & 2048 token cap.
  // Provides "Import .gguf" (file_picker), "Unload" (free RAM), and model swap list.
}`,
  },
  {
    path: 'lib/services/ai/mock_ai_service.dart',
    label: 'mock_ai_service.dart',
    language: 'dart',
    phaseNote: 'Phase 4: Deterministic MockAIService for testing AIChatScreen & AIModelManager without .gguf weights.',
    content: `class MockAIService implements AIService {
  @override
  Future<String> generateResponse({
    required String prompt,
    List<ChatMessage> history = const [],
  }) async {
    lastFormattedPrompt = BengaliPromptConfig.buildChatPrompt(
      userQuery: prompt,
      recentHistory: history,
    );
    await Future<void>.delayed(simulatedDelay);
    return 'হ্যালো! আমি NoteGenie AI (অফলাইন সহকারী)...';
  }
}`,
  },
  {
    path: 'lib/services/export/batch_export_service.dart',
    label: 'batch_export_service.dart',
    language: 'dart',
    phaseNote: 'Phase 4 Addendum: Background compute() Isolate batch PDF & DOCX export with progress callbacks.',
    content: `class BatchExportService {
  Future<File> exportNotesBatch({
    required List<Note> notes,
    required BatchExportFormat format,
    String bundleTitle = 'NoteGenie AI Batch Export',
    void Function(int processed, int total)? onProgress,
  }) async {
    final bytes = await compute(
      _generateBatchExportInIsolate,
      BatchExportRequest(format: format, bundleTitle: bundleTitle, notes: payloads),
    );
    ...
  }
}`,
  },
  {
    path: 'lib/widgets/sync_status_indicator.dart',
    label: 'sync_status_indicator.dart',
    language: 'dart',
    phaseNote: 'Phase 4 Addendum: Visual Pending -> Saving -> Synced indicator in NoteEditorScreen.',
    content: `enum NoteSyncStatus {
  pending('Pending'),
  saving('Saving'),
  synced('Synced');
}

class SyncStatusIndicator extends StatelessWidget {
  const SyncStatusIndicator({super.key, required this.status});
  final NoteSyncStatus status;
  // Smooth AnimatedSwitcher pill showing schedule, spinner, or check_circle_outline
}`,
  },
  {
    path: 'test/ai_model_manager_test.dart',
    label: 'ai_model_manager_test.dart',
    language: 'dart',
    phaseNote: 'Phase 4: Unit & widget tests for SharedPreferences model path persistence, 2048 cap, MockAI chat, BatchExport & SyncStatusIndicator.',
    content: `test('AIModelManager persists selected model path & imported models in SharedPreferences', () async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final mockAI = MockAIService(startLoaded: false);
  final manager = AIModelManager(prefs: prefs, aiService: mockAI);

  const customPath = '/storage/emulated/0/Download/BanglaLlama-4bit.gguf';
  await manager.registerImportedModel(filePath: customPath, fileSizeBytes: 850 * 1024 * 1024);
  await manager.swapAndLoadModel(customPath);
  expect(mockAI.isModelLoaded, true);
  expect(manager.getSavedModelPath(), customPath);
});`,
  },
];
