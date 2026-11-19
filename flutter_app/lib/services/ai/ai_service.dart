import 'bengali_prompt_config.dart';

/// Runtime memory and quantization constraints enforced on 3GB RAM Android devices.
class AIEngineConfig {
  const AIEngineConfig({
    this.maxContextTokens = BengaliPromptConfig.maxContextTokens,
    this.maxPredictTokens = 320,
    this.quantizationBits = 4,
    this.threads = 4,
    this.batchSize = 256,
    this.useMmap = true,
    this.gpuLayers = 0,
  }) : assert(maxContextTokens <= 2048, 'Context window must not exceed 2048 tokens');

  final int maxContextTokens;
  final int maxPredictTokens;
  final int quantizationBits;
  final int threads;
  final int batchSize;
  final bool useMmap;
  final int gpuLayers;

  /// Hard-clamps any requested context size to 2048 tokens for OOM safety.
  int get clampedContextTokens =>
      maxContextTokens > 2048 ? 2048 : (maxContextTokens < 256 ? 256 : maxContextTokens);
}

/// Abstract local AI contract implemented by [LlamaCppAIService] (Dart FFI Isolate)
/// and [MockAIService] (UI & widget tests).
abstract interface class AIService {
  bool get isModelLoaded;
  String? get loadedModelPath;
  AIEngineConfig get config;

  Future<void> loadModel(String modelPath);

  Future<String> generateResponse({
    required String prompt,
    List<ChatMessage> history = const [],
  });

  Future<void> unloadModel();

  Future<void> dispose();
}
