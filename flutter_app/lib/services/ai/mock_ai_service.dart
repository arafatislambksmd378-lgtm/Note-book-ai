import 'ai_service.dart';
import 'bengali_prompt_config.dart';

/// Deterministic offline mock implementation of [AIService] for UI verification
/// and widget tests without requiring a multi-hundred-MB `.gguf` binary on disk.
class MockAIService implements AIService {
  MockAIService({
    this.config = const AIEngineConfig(maxContextTokens: 2048),
    this.simulatedDelay = const Duration(milliseconds: 220),
    this.startLoaded = true,
    String initialModelPath = '/storage/emulated/0/Download/Qwen-1.5B-Instruct-Q4_K_M.gguf',
  })  : _isModelLoaded = startLoaded,
        _loadedModelPath = startLoaded ? initialModelPath : null;

  @override
  final AIEngineConfig config;

  final Duration simulatedDelay;
  bool _isModelLoaded;
  String? _loadedModelPath;
  String? lastFormattedPrompt;

  @override
  bool get isModelLoaded => _isModelLoaded;

  @override
  String? get loadedModelPath => _loadedModelPath;

  @override
  Future<void> loadModel(String modelPath) async {
    await Future<void>.delayed(const Duration(milliseconds: 40));
    _loadedModelPath = modelPath;
    _isModelLoaded = true;
  }

  @override
  Future<String> generateResponse({
    required String prompt,
    List<ChatMessage> history = const [],
  }) async {
    if (!_isModelLoaded) {
      throw StateError('No model loaded in MockAIService');
    }

    lastFormattedPrompt = BengaliPromptConfig.buildChatPrompt(
      userQuery: prompt,
      recentHistory: history,
    );

    await Future<void>.delayed(simulatedDelay);

    final lower = prompt.toLowerCase();
    if (lower.contains('summary') || lower.contains('সংক্ষিপ্ত') || lower.contains('নোট')) {
      return 'আপনার নোটের মূল অংশটি সংক্ষেপে প্রস্তুত করা হয়েছে। অফলাইনে ৪-বিট মডেলের মাধ্যমে দ্রুত সারাংশ তৈরি করা হয়েছে।';
    }
    if (lower.contains('list') || lower.contains('তালিকা') || lower.contains('todo')) {
      return 'অবশ্যই! এখানে আপনার কাজের সংক্ষিপ্ত তালিকা:\n• গুরুত্বপূর্ণ পয়েন্টগুলো নোটবুকে সংরক্ষণ করুন\n• অফলাইন SQLite ব্যাকআপ যাচাই করুন';
    }
    return 'হ্যালো! আমি NoteGenie AI (অফলাইন সহকারী)। আপনার প্রশ্ন "$prompt" বুঝেছি—৩ জিবি র‍্যামের ডিভাইসেও দ্রুত ও নিরাপদে বাংলায় সাহায্য করতে আমি প্রস্তুত।';
  }

  @override
  Future<void> unloadModel() async {
    _isModelLoaded = false;
    _loadedModelPath = null;
  }

  @override
  Future<void> dispose() async {
    await unloadModel();
  }
}
