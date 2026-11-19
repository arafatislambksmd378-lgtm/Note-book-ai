import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:notegenie_ai/providers/ai_providers.dart';
import 'package:notegenie_ai/screens/ai_chat_screen.dart';
import 'package:notegenie_ai/services/ai/ai_model_manager.dart';
import 'package:notegenie_ai/services/ai/ai_service.dart';
import 'package:notegenie_ai/services/ai/bengali_prompt_config.dart';
import 'package:notegenie_ai/services/ai/mock_ai_service.dart';
import 'package:notegenie_ai/services/db/app_database.dart';
import 'package:notegenie_ai/services/export/batch_export_service.dart';
import 'package:notegenie_ai/widgets/sync_status_indicator.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Phase 4 AIModelManager, Memory Limits & Batch Export', () {
    test('AIModelManager persists selected model path & imported models in SharedPreferences', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final mockAI = MockAIService(startLoaded: false);
      final manager = AIModelManager(prefs: prefs, aiService: mockAI);

      expect(manager.getAvailableModels().length, 2);

      const customPath = '/storage/emulated/0/Download/BanglaLlama-4bit.gguf';
      final imported = await manager.registerImportedModel(
        filePath: customPath,
        fileSizeBytes: 850 * 1024 * 1024,
      );

      expect(imported.name, 'BanglaLlama-4bit.gguf');
      expect(manager.getSavedModelPath(), customPath);

      await manager.swapAndLoadModel(customPath);
      expect(mockAI.isModelLoaded, true);
      expect(mockAI.loadedModelPath, customPath);

      // Re-create manager using same SharedPreferences to simulate app restart
      final reloadedManager = AIModelManager(prefs: prefs, aiService: mockAI);
      expect(reloadedManager.getSelectedModel()?.path, customPath);

      await reloadedManager.unloadActiveModel();
      expect(mockAI.isModelLoaded, false);
    });

    test('AIEngineConfig & BengaliPromptConfig enforce 2048 token max context and hidden Bengali prompt', () {
      const config = AIEngineConfig(maxContextTokens: 2048, quantizationBits: 4);
      expect(config.clampedContextTokens, 2048);
      expect(config.quantizationBits, 4);

      final prompt = BengaliPromptConfig.buildChatPrompt(
        userQuery: 'আমার নোটের সারাংশ দাও',
      );
      expect(prompt, contains('You must answer the user\'s queries naturally in Bengali'));
      expect(prompt, contains('Keep responses concise'));
      expect(BengaliPromptConfig.estimateTokens(prompt), lessThanOrEqualTo(2048));
    });

    test('BatchExportService exports multiple notes to bulk PDF and DOCX files', () async {
      final tempDir = await Directory.systemTemp.createTemp('notegenie_batch_test_');
      final service = BatchExportService();
      final sampleNotes = [
        const Note(
          id: 'n1',
          notebookId: 'nb1',
          title: 'Travel Plan',
          content: '[{"insert":"Visit Coxs Bazar\\n"}]',
          snippet: 'Visit Coxs Bazar',
          tint: 'none',
          createdAt: 1000,
          updatedAt: 2000,
        ),
        const Note(
          id: 'n2',
          notebookId: 'nb1',
          title: 'Grocery List',
          content: '[{"insert":"Rice & Tea\\n"}]',
          snippet: 'Rice & Tea',
          tint: 'yellow',
          createdAt: 1000,
          updatedAt: 3000,
        ),
      ];

      try {
        final pdfFile = await service.exportNotesBatch(
          notes: sampleNotes,
          format: BatchExportFormat.pdf,
          overrideTempDir: tempDir,
          triggerShareSheet: false,
        );
        expect(await pdfFile.exists(), true);
        expect(pdfFile.path.endsWith('.pdf'), true);

        final docxFile = await service.exportNotesBatch(
          notes: sampleNotes,
          format: BatchExportFormat.docx,
          overrideTempDir: tempDir,
          triggerShareSheet: false,
        );
        expect(await docxFile.exists(), true);
        expect(docxFile.path.endsWith('.docx'), true);
      } finally {
        if (await tempDir.exists()) {
          await tempDir.delete(recursive: true);
        }
      }
    });

    testWidgets('AIChatScreen renders Bengali reply using MockAIService', (tester) async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final mockAI = MockAIService(simulatedDelay: const Duration(milliseconds: 20));

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
            aiServiceProvider.overrideWithValue(mockAI),
          ],
          child: const MaterialApp(home: AIChatScreen()),
        ),
      );

      await tester.enterText(find.byType(TextField), 'Summarize my note');
      await tester.tap(find.byIcon(Icons.send_rounded));
      await tester.pump();
      expect(find.text('AI is thinking...'), findsOneWidget);

      await tester.pump(const Duration(milliseconds: 50));
      expect(find.textContaining('অফলাইনে ৪-বিট মডেলের মাধ্যমে'), findsOneWidget);
      expect(
        mockAI.lastFormattedPrompt,
        contains(BengaliPromptConfig.baseSystemPrompt),
      );
    });

    testWidgets('SyncStatusIndicator displays Pending, Saving, and Synced states', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                SyncStatusIndicator(status: NoteSyncStatus.pending),
                SyncStatusIndicator(status: NoteSyncStatus.saving),
                SyncStatusIndicator(status: NoteSyncStatus.synced),
              ],
            ),
          ),
        ),
      );

      expect(find.text('Pending'), findsOneWidget);
      expect(find.text('Saving'), findsOneWidget);
      expect(find.text('Synced'), findsOneWidget);
    });
  });
}
