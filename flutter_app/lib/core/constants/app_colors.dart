import 'package:flutter/material.dart';

/// Core color palette for NoteGenie AI.
/// Optimized for high readability and OneNote-inspired clean surfaces.
abstract final class AppColors {
  // Primary Canvas & Surfaces
  static const Color background = Color(0xFFFFFFFF);
  static const Color surfaceSubtle = Color(0xFFF6F6F9);
  static const Color borderHairline = Color(0xFFE6E6EC);
  static const Color divider = Color(0xFFF0F0F4);

  // Brand & Semantic Accents
  static const Color primaryPurple = Color(0xFF6B4EFF);
  static const Color primaryPurpleSoft = Color(0xFFEEEAFF);
  static const Color secondaryGreen = Color(0xFF00C853);
  static const Color secondaryBlue = Color(0xFF2979FF);
  static const Color secondaryYellow = Color(0xFFFFD600);
  static const Color travelCoral = Color(0xFFFF5252);

  // Specific Note Card Tints (Home Tab)
  static const Color cardWhite = Color(0xFFFFFFFF);
  static const Color cardYellowTint = Color(0xFFFFF8CC);
  static const Color cardYellowBorder = Color(0xFFF3E59A);
  static const Color cardGreenTint = Color(0xFFE6F9ED);
  static const Color cardGreenBorder = Color(0xFFC2EED2);
  static const Color cardPurpleTint = Color(0xFFF3F0FF);
  static const Color cardPurpleBorder = Color(0xFFDCD3FF);

  // Typography & Icons
  static const Color textPrimary = Color(0xFF1A1A24);
  static const Color textSecondary = Color(0xFF5F6368);
  static const Color textMuted = Color(0xFF8C8F99);
  static const Color closedNotebookIcon = Color(0xFFC4C6CE);
}
