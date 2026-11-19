class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.role,
    required this.text,
    required this.timestampMs,
  });

  final String id;
  final ChatRole role;
  final String text;
  final int timestampMs;
}

enum ChatRole { user, assistant }

/// Hidden Bengali system prompt & 2048-token budget utilities for low-RAM
/// on-device inference (Qwen-1.5B / Phi-3-Mini 4-bit GGUF).
abstract final class BengaliPromptConfig {
  static const int maxContextTokens = 2048;
  static const int reservedResponseTokens = 384;

  /// Base system prompt kept hidden from the chat bubble list.
  static const String baseSystemPrompt =
      'You are NoteGenie AI, an offline assistant. You must answer the '
      "user's queries naturally in Bengali. Keep responses concise to save "
      'processing time.';

  /// Rough 4-char-per-token budget estimate to prevent exceeding 2048 tokens.
  static int estimateTokens(String text) {
    if (text.trim().isEmpty) return 0;
    return (text.length / 3.5).ceil();
  }

  /// Builds a ChatML-compatible prompt capped to stay safely within [maxContextTokens].
  static String buildChatPrompt({
    required String userQuery,
    List<ChatMessage> recentHistory = const [],
    String systemPromptOverride = baseSystemPrompt,
  }) {
    final maxPromptTokens = maxContextTokens - reservedResponseTokens;
    final buffer = StringBuffer();
    buffer.writeln('<|im_start|>system');
    buffer.writeln(systemPromptOverride.trim());
    buffer.writeln('<|im_end|>');

    var usedTokens = estimateTokens(buffer.toString()) +
        estimateTokens(userQuery) +
        32;

    // Include only as many recent turns as fit safely under the 2048-token ceiling.
    final selectedHistory = <ChatMessage>[];
    for (final msg in recentHistory.reversed) {
      final msgTokens = estimateTokens(msg.text) + 12;
      if (usedTokens + msgTokens > maxPromptTokens) break;
      selectedHistory.insert(0, msg);
      usedTokens += msgTokens;
    }

    for (final msg in selectedHistory) {
      final roleTag = msg.role == ChatRole.user ? 'user' : 'assistant';
      buffer.writeln('<|im_start|>$roleTag');
      buffer.writeln(msg.text.trim());
      buffer.writeln('<|im_end|>');
    }

    buffer.writeln('<|im_start|>user');
    buffer.writeln(userQuery.trim());
    buffer.writeln('<|im_end|>');
    buffer.writeln('<|im_start|>assistant');

    return buffer.toString();
  }
}
