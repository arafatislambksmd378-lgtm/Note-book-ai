import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

enum NoteCardTint {
  none,
  yellow,
  green,
  purple,
}

@immutable
class NotePreview {
  const NotePreview({
    required this.id,
    required this.notebookName,
    this.sectionName,
    required this.title,
    this.snippet = '',
    required this.dateLabel,
    this.imageAssetPath,
    this.tint = NoteCardTint.none,
    this.accentColor = AppColors.primaryPurple,
    this.isStickyStyle = false,
  });

  final String id;
  final String notebookName;
  final String? sectionName;
  final String title;
  final String snippet;
  final String dateLabel;
  final String? imageAssetPath;
  final NoteCardTint tint;
  final Color accentColor;
  final bool isStickyStyle;

  String get breadcrumb =>
      sectionName != null && sectionName!.isNotEmpty
          ? '$notebookName » $sectionName'
          : notebookName;
}
