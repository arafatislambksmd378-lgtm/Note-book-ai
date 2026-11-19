import 'dart:async';
import 'dart:io';
import 'dart:isolate';
import 'package:llama_cpp_dart/llama_cpp_dart.dart';
import 'ai_service.dart';
import 'bengali_prompt_config.dart';

sealed class _WorkerCommand {
  const _WorkerCommand(this.replyPort);
  final SendPort replyPort;
}

class _LoadCommand extends _WorkerCommand {
  const _LoadCommand(super.replyPort, this.modelPath, this.config);
  final String modelPath;
  final AIEngineConfig config;
}

class _GenerateCommand extends _WorkerCommand {
  const _GenerateCommand(super.replyPort, this.formattedPrompt, this.maxTokens);
  final String formattedPrompt;
  final int maxTokens;
}

class _UnloadCommand extends _WorkerCommand {
  const _UnloadCommand(super.replyPort);
}

class _ShutdownCommand extends _WorkerCommand {
  const _ShutdownCommand(super.replyPort);
}

/// Local offline inference engine backed by `llama.cpp` via `llama_cpp_dart` FFI.
/// All model loading, tokenization, and token generation execute inside a
/// persistent background [Isolate] so the Flutter UI never drops below 60fps.
class LlamaCppAIService implements AIService {
  LlamaCppAIService({
    this.config = const AIEngineConfig(
      maxContextTokens: 2048,
      quantizationBits: 4,
      useMmap: true,
      gpuLayers: 0,
    ),
  });

  @override
  final AIEngineConfig config;

  Isolate? _workerIsolate;
  SendPort? _workerSendPort;
  String? _loadedModelPath;
  bool _isModelLoaded = false;

  @override
  bool get isModelLoaded => _isModelLoaded;

  @override
  String? get loadedModelPath => _loadedModelPath;

  Future<void> _ensureWorkerSpawned() async {
    if (_workerSendPort != null) return;
    final handshakePort = ReceivePort();
    _workerIsolate = await Isolate.spawn(
      _llamaWorkerEntryPoint,
      handshakePort.sendPort,
      debugName: 'notegenie_llama_worker',
    );
    _workerSendPort = await handshakePort.first as SendPort;
    handshakePort.close();
  }

  Future<T> _sendCommand<T>(_WorkerCommand Function(SendPort reply) build) async {
    await _ensureWorkerSpawned();
    final responsePort = ReceivePort();
    _workerSendPort!.send(build(responsePort.sendPort));
    final result = await responsePort.first;
    responsePort.close();

    if (result is Map && result['error'] != null) {
      throw StateError(result['error'].toString());
    }
    return result as T;
  }

  @override
  Future<void> loadModel(String modelPath) async {
    final file = File(modelPath);
    if (!await file.exists()) {
      throw FileSystemException('GGUF model file not found', modelPath);
    }
    if (!modelPath.toLowerCase().endsWith('.gguf')) {
      throw ArgumentError.value(
        modelPath,
        'modelPath',
        'Only 4-bit quantized .gguf models are supported.',
      );
    }

    await _sendCommand<Object?>(
      (reply) => _LoadCommand(reply, modelPath, config),
    );
    _loadedModelPath = modelPath;
    _isModelLoaded = true;
  }

  @override
  Future<String> generateResponse({
    required String prompt,
    List<ChatMessage> history = const [],
  }) async {
    if (!_isModelLoaded || _loadedModelPath == null) {
      throw StateError('No GGUF model is loaded. Import and load a model in Settings.');
    }

    final formattedPrompt = BengaliPromptConfig.buildChatPrompt(
      userQuery: prompt,
      recentHistory: history,
    );

    final response = await _sendCommand<String>(
      (reply) => _GenerateCommand(
        reply,
        formattedPrompt,
        config.maxPredictTokens,
      ),
    );
    return response.trim();
  }

  @override
  Future<void> unloadModel() async {
    if (_workerSendPort == null) {
      _isModelLoaded = false;
      _loadedModelPath = null;
      return;
    }

    await _sendCommand<Object?>((reply) => _UnloadCommand(reply));
    _isModelLoaded = false;
    _loadedModelPath = null;
  }

  @override
  Future<void> dispose() async {
    if (_workerSendPort != null) {
      await _sendCommand<Object?>((reply) => _ShutdownCommand(reply));
    }
    _workerIsolate?.kill(priority: Isolate.immediate);
    _workerIsolate = null;
    _workerSendPort = null;
    _isModelLoaded = false;
    _loadedModelPath = null;
  }

  /// Dedicated background Isolate loop keeping all FFI allocations & inference
  /// isolated from the main UI thread.
  static Future<void> _llamaWorkerEntryPoint(SendPort mainSendPort) async {
    final inbox = ReceivePort();
    mainSendPort.send(inbox.sendPort);

    Llama? llamaEngine;

    await for (final message in inbox) {
      if (message is! _WorkerCommand) continue;

      try {
        switch (message) {
          case _LoadCommand():
            llamaEngine?.dispose();
            llamaEngine = null;

            final contextParams = ContextParams()
              ..nCtx = message.config.clampedContextTokens // Hard cap <= 2048
              ..nBatch = message.config.batchSize
              ..nThreads = message.config.threads
              ..nThreadsBatch = message.config.threads;

            final modelParams = ModelParams()
              ..nGpuLayers = message.config.gpuLayers
              ..useMemorymap = message.config.useMmap;

            llamaEngine = Llama(
              message.modelPath,
              modelParams,
              contextParams,
            );
            message.replyPort.send(true);

          case _GenerateCommand():
            if (llamaEngine == null) {
              message.replyPort.send({'error': 'Llama engine is not initialized'});
              break;
            }
            llamaEngine.setPrompt(message.formattedPrompt);
            final output = StringBuffer();
            var generatedCount = 0;

            await for (final token in llamaEngine.generateText()) {
              if (token.contains('<|im_end|>')) break;
              output.write(token);
              generatedCount += 1;
              if (generatedCount >= message.maxTokens) break;
            }
            message.replyPort.send(output.toString().trim());

          case _UnloadCommand():
            llamaEngine?.dispose();
            llamaEngine = null;
            message.replyPort.send(true);

          case _ShutdownCommand():
            llamaEngine?.dispose();
            llamaEngine = null;
            message.replyPort.send(true);
            inbox.close();
            return;
        }
      } catch (e) {
        message.replyPort.send({'error': e.toString()});
      }
    }
  }
}
