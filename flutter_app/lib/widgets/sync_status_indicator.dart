import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

/// Persistence lifecycle states tracked in [NoteEditorScreen].
enum NoteSyncStatus {
  pending('Pending'),
  saving('Saving'),
  synced('Synced');

  const NoteSyncStatus(this.label);
  final String label;
}

/// Visual sync-status indicator showing Pending -> Saving -> Synced
/// transitions against local SQLite persistence.
class SyncStatusIndicator extends StatelessWidget {
  const SyncStatusIndicator({
    super.key,
    required this.status,
  });

  final NoteSyncStatus status;

  @override
  Widget build(BuildContext context) {
    final (Color accentColor, String tooltip) = switch (status) {
      NoteSyncStatus.pending => (
          const Color(0xFFB28900),
          'Pending local SQLite write (autosaves in 2s)',
        ),
      NoteSyncStatus.saving => (
          AppColors.primaryPurple,
          'Saving note to local SQLite...',
        ),
      NoteSyncStatus.synced => (
          AppColors.secondaryGreen,
          'Synced with local SQLite database',
        ),
    };

    return Tooltip(
      message: tooltip,
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 180),
        child: Container(
          key: ValueKey(status),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: accentColor.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              switch (status) {
                NoteSyncStatus.pending => Icon(
                    Icons.schedule_rounded,
                    size: 14,
                    color: accentColor,
                  ),
                NoteSyncStatus.saving => SizedBox(
                    width: 12,
                    height: 12,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: accentColor,
                    ),
                  ),
                NoteSyncStatus.synced => Icon(
                    Icons.check_circle_outline_rounded,
                    size: 14,
                    color: accentColor,
                  ),
              },
              const SizedBox(width: 5),
              Text(
                status.label,
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: accentColor,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
