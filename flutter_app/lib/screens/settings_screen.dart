import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/constants/app_colors.dart';
import '../providers/ai_providers.dart';
import '../services/ai/bengali_prompt_config.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final modelState = ref.watch(aiModelControllerProvider);
    final notifier = ref.read(aiModelControllerProvider.notifier);
    final selected = modelState.selectedModel;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        title: const Text(
          'Local AI & Settings',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          // Active Model Summary Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.primaryPurpleSoft.withValues(alpha: 0.55),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.primaryPurple.withValues(alpha: 0.25)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      modelState.isLoaded
                          ? Icons.memory_rounded
                          : Icons.pause_circle_outline_rounded,
                      color: modelState.isLoaded
                          ? AppColors.secondaryGreen
                          : AppColors.primaryPurple,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      modelState.isLoaded ? 'Model Loaded in RAM' : 'Model Unloaded (RAM Free)',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: modelState.isLoaded
                            ? AppColors.secondaryGreen
                            : AppColors.primaryPurple,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  selected?.name ?? 'No GGUF model selected',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Size: ${selected?.formattedSize ?? '--'} · ${selected?.quantization ?? '4-bit'} · Max Context: ${BengaliPromptConfig.maxContextTokens} tokens',
                  style: const TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
                ),
                if (selected != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    selected.path,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11.5, color: AppColors.textMuted),
                  ),
                ],
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: modelState.isBusy ? null : notifier.importModelFromPicker,
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primaryPurple,
                        ),
                        icon: const Icon(Icons.folder_open_rounded, size: 18),
                        label: const Text('Import .gguf'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    OutlinedButton.icon(
                      onPressed: (modelState.isBusy || !modelState.isLoaded)
                          ? null
                          : notifier.unloadModel,
                      icon: const Icon(Icons.eject_rounded, size: 18),
                      label: const Text('Unload'),
                    ),
                  ],
                ),
              ],
            ),
          ),

          if (modelState.isBusy) ...[
            const SizedBox(height: 14),
            const LinearProgressIndicator(color: AppColors.primaryPurple),
          ],

          if (modelState.errorMessage != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Text(
                modelState.errorMessage!,
                style: TextStyle(fontSize: 12.5, color: Colors.red.shade800),
              ),
            ),
          ],

          const SizedBox(height: 22),
          const Text(
            'Available Offline Models',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Tap a model to swap. Selection persists across restarts via SharedPreferences.',
            style: TextStyle(fontSize: 12.5, color: AppColors.textMuted),
          ),
          const SizedBox(height: 10),

          for (final model in modelState.models)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Material(
                color: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: BorderSide(
                    color: selected?.path == model.path
                        ? AppColors.primaryPurple
                        : AppColors.borderHairline,
                    width: selected?.path == model.path ? 1.5 : 1,
                  ),
                ),
                child: ListTile(
                  onTap: modelState.isBusy
                      ? null
                      : () => notifier.selectAndLoadModel(model),
                  leading: Icon(
                    Icons.smart_toy_outlined,
                    color: selected?.path == model.path
                        ? AppColors.primaryPurple
                        : AppColors.textMuted,
                  ),
                  title: Text(
                    model.name,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  subtitle: Text(
                    '${model.formattedSize} · ${model.quantization}',
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                  trailing: selected?.path == model.path
                      ? Icon(
                          modelState.isLoaded
                              ? Icons.check_circle_rounded
                              : Icons.radio_button_checked_rounded,
                          color: modelState.isLoaded
                              ? AppColors.secondaryGreen
                              : AppColors.primaryPurple,
                        )
                      : const Icon(Icons.swap_horiz_rounded, color: AppColors.textMuted),
                ),
              ),
            ),

          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.borderHairline),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '3GB RAM Guardrails',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                SizedBox(height: 6),
                Text(
                  '• 4-bit GGUF quantization with memory-mapped (mmap) weight loading.\n'
                  '• Context window strictly clamped to 2048 tokens.\n'
                  '• Inference executes inside a background Dart Isolate.\n'
                  '• Hidden English system prompt enforces concise natural Bengali replies.',
                  style: TextStyle(
                    fontSize: 12,
                    height: 1.5,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
