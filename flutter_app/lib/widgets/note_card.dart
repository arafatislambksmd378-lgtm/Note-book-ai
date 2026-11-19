import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../models/note_preview.dart';

class NoteCard extends StatelessWidget {
  const NoteCard({
    super.key,
    required this.note,
    required this.onTap,
  });

  final NotePreview note;
  final VoidCallback onTap;

  Color _resolveBackgroundColor() {
    switch (note.tint) {
      case NoteCardTint.yellow:
        return AppColors.cardYellowTint;
      case NoteCardTint.green:
        return AppColors.cardGreenTint;
      case NoteCardTint.purple:
        return AppColors.cardPurpleTint;
      case NoteCardTint.none:
        return AppColors.cardWhite;
    }
  }

  Color _resolveBorderColor() {
    switch (note.tint) {
      case NoteCardTint.yellow:
        return AppColors.cardYellowBorder;
      case NoteCardTint.green:
        return AppColors.cardGreenBorder;
      case NoteCardTint.purple:
        return AppColors.cardPurpleBorder;
      case NoteCardTint.none:
        return AppColors.borderHairline;
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    // RepaintBoundary isolates card repaints for smooth 60fps scrolling on 3GB RAM devices.
    return RepaintBoundary(
      child: Material(
        color: _resolveBackgroundColor(),
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: _resolveBorderColor(), width: 1),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (!note.isStickyStyle) ...[
                  Text(
                    note.breadcrumb,
                    style: textTheme.bodySmall?.copyWith(
                      fontSize: 11,
                      color: AppColors.textMuted,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                ],
                if (note.title.isNotEmpty)
                  Text(
                    note.title,
                    style: textTheme.titleMedium?.copyWith(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                if (note.imageAssetPath != null) ...[
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.asset(
                      note.imageAssetPath!,
                      height: 88,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      // Downscale decoded bitmap to conserve RAM on 3GB devices
                      cacheWidth: 360,
                    ),
                  ),
                ],
                if (note.snippet.isNotEmpty) ...[
                  const SizedBox(height: 5),
                  Text(
                    note.snippet,
                    style: textTheme.bodyMedium?.copyWith(
                      fontSize: 12.5,
                      color: AppColors.textSecondary,
                      height: 1.4,
                    ),
                    maxLines: 4,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(
                      note.isStickyStyle
                          ? Icons.sticky_note_2_rounded
                          : Icons.description_rounded,
                      size: 16,
                      color: note.accentColor,
                    ),
                    const Spacer(),
                    Text(
                      note.dateLabel,
                      style: textTheme.bodySmall?.copyWith(
                        fontSize: 11,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
