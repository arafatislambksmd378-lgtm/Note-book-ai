import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/ai/ai_model_manager.dart';
import '../services/ai/ai_service.dart';
import '../services/ai/bengali_prompt_config.dart';
import '../services/ai/llama_cpp_ai_service.dart';

/// Overridden at bootstrap in `main.dart` with the initialized [SharedPreferences] instance.
final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('sharedPreferencesProvider must be overridden in ProviderScope');
});

/// Active local LLM inference engine (runs `llama.cpp` inside a background Isolate).
/// Can be overridden with [MockAIService] in widget tests.
final aiServiceProvider = Provider<AIService>((ref) {
  final service = LlamaCppAIService();
  ref.onDispose(() {
    service.dispose();
  });
  return service;
});

final aiModelManagerProvider = Provider<AIModelManager>((ref) {
  return AIModelManager(
    prefs: ref.watch(sharedPreferencesProvider),
    aiService: ref.watch(aiServiceProvider),
  );
});

class AIModelState {
  const AIModelState({
    required this.models,
    required this.selectedModel,
    required this.isLoaded,
    required this.isBusy,
    this.errorMessage,
  });

  final List<AIModelEntry> models;
  final AIModelEntry? selectedModel;
  final bool isLoaded;
  final bool isBusy;
  final String? errorMessage;

  AIModelState copyWith({
    List<AIModelEntry>? models,
    AIModelEntry? selectedModel,
    bool? isLoaded,
    bool? isBusy,
    String? errorMessage,
  }) {
    return AIModelState(
      models: models ?? this.models,
      selectedModel: selectedModel ?? this.selectedModel,
      isLoaded: isLoaded ?? this.isLoaded,
      isBusy: isBusy ?? this.isBusy,
      errorMessage: errorMessage,
    );
  }
}

class AIModelNotifier extends Notifier<AIModelState> {
  AIModelManager get _manager => ref.read(aiModelManagerProvider);
  AIService get _service => ref.read(aiServiceProvider);

  @override
  AIModelState build() {
    return AIModelState(
      models: _manager.getAvailableModels(),
      selectedModel: _manager.getSelectedModel(),
      isLoaded: _service.isModelLoaded,
      isBusy: false,
    );
  }

  Future<void> importModelFromPicker() async {
    state = state.copyWith(isBusy: true, errorMessage: null);
    try {
      final imported = await _manager.pickAndImportModel();
      state = state.copyWith(
        models: _manager.getAvailableModels(),
        selectedModel: imported ?? _manager.getSelectedModel(),
        isLoaded: _service.isModelLoaded,
        isBusy: false,
      );
    } catch (e) {
      state = state.copyWith(
        isBusy: false,
        isLoaded: _service.isModelLoaded,
        errorMessage: e.toString(),
      );
    }
  }

  Future<void> selectAndLoadModel(AIModelEntry model) async {
    state = state.copyWith(isBusy: true, errorMessage: null);
    try {
      await _manager.swapAndLoadModel(model.path);
      state = state.copyWith(
        models: _manager.getAvailableModels(),
        selectedModel: model,
        isLoaded: _service.isModelLoaded,
        isBusy: false,
      );
    } catch (e) {
      state = state.copyWith(
        selectedModel: model,
        isLoaded: _service.isModelLoaded,
        isBusy: false,
        errorMessage: e.toString(),
      );
    }
  }

  Future<void> unloadModel() async {
    state = state.copyWith(isBusy: true, errorMessage: null);
    await _manager.unloadActiveModel();
    state = state.copyWith(
      isLoaded: false,
      isBusy: false,
    );
  }
}

final aiModelControllerProvider =
    NotifierProvider<AIModelNotifier, AIModelState>(AIModelNotifier.new);

class AIChatState {
  const AIChatState({
    required this.messages,
    required this.isGenerating,
    this.errorMessage,
  });

  final List<ChatMessage> messages;
  final bool isGenerating;
  final String? errorMessage;

  AIChatState copyWith({
    List<ChatMessage>? messages,
    bool? isGenerating,
    String? errorMessage,
  }) {
    return AIChatState(
      messages: messages ?? this.messages,
      isGenerating: isGenerating ?? this.isGenerating,
      errorMessage: errorMessage,
    );
  }
}

class AIChatNotifier extends Notifier<AIChatState> {
  @override
  AIChatState build() {
    return AIChatState(
      isGenerating: false,
      messages: [
        ChatMessage(
          id: 'welcome_bn',
          role: ChatRole.assistant,
          text:
              'স্বাগতম! আমি NoteGenie AI (অফলাইন সহকারী)। আপনি বাংলায় বা ইংরেজিতে যেকোনো প্রশ্ন করতে পারেন—আমি বাংলায় সংক্ষিপ্ত উত্তর দেব।',
          timestampMs: DateTime.now().millisecondsSinceEpoch,
        ),
      ],
    );
  }

  Future<void> sendMessage(String rawText) async {
    final trimmed = rawText.trim();
    if (trimmed.isEmpty || state.isGenerating) return;

    final userMsg = ChatMessage(
      id: 'u_${DateTime.now().millisecondsSinceEpoch}',
      role: ChatRole.user,
      text: trimmed,
      timestampMs: DateTime.now().millisecondsSinceEpoch,
    );

    final historySnapshot = [...state.messages];
    state = state.copyWith(
      messages: [...state.messages, userMsg],
      isGenerating: true,
      errorMessage: null,
    );

    try {
      final service = ref.read(aiServiceProvider);
      if (!service.isModelLoaded) {
        final selected = ref.read(aiModelManagerProvider).getSelectedModel();
        if (selected != null) {
          await service.loadModel(selected.path);
          ref.invalidate(aiModelControllerProvider);
        }
      }

      final reply = await service.generateResponse(
        prompt: trimmed,
        history: historySnapshot,
      );

      final assistantMsg = ChatMessage(
        id: 'a_${DateTime.now().millisecondsSinceEpoch}',
        role: ChatRole.assistant,
        text: reply.isEmpty ? 'দুঃখিত, উত্তর তৈরি করা যায়নি।' : reply,
        timestampMs: DateTime.now().millisecondsSinceEpoch,
      );

      state = state.copyWith(
        messages: [...state.messages, assistantMsg],
        isGenerating: false,
      );
    } catch (e) {
      state = state.copyWith(
        isGenerating: false,
        errorMessage: 'Inference error: $e',
      );
    }
  }

  void clearChat() {
    state = AIChatState(
      isGenerating: false,
      messages: [state.messages.first],
    );
  }
}

final aiChatControllerProvider =
    NotifierProvider<AIChatNotifier, AIChatState>(AIChatNotifier.new);
