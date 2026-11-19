import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import 'segmented_tab_toggle.dart';

class BottomActionBar extends StatelessWidget {
  const BottomActionBar({
    super.key,
    required this.activeTab,
    required this.onCreatePage,
    required this.onCreateNotebook,
    required this.onPenTap,
    required this.onCameraTap,
    required this.onMicTap,
    required this.onMoreTap,
  });

  final MainTab activeTab;
  final VoidCallback onCreatePage;
  final VoidCallback onCreateNotebook;
  final VoidCallback onPenTap;
  final VoidCallback onCameraTap;
  final VoidCallback onMicTap;
  final VoidCallback onMoreTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.background,
        border: Border(
          top: BorderSide(color: AppColors.divider, width: 1),
        ),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 58,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: activeTab == MainTab.home
                ? Row(
                    children: [
                      TextButton.icon(
                        onPressed: onCreatePage,
                        style: TextButton.styleFrom(
                          foregroundColor: AppColors.primaryPurple,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                        ),
                        icon: const Icon(Icons.add_rounded, size: 22),
                        label: const Text(
                          'Page',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      const Spacer(),
                      _BottomIconAction(
                        icon: Icons.edit_outlined,
                        tooltip: 'Drawing / Pen',
                        color: AppColors.primaryPurple,
                        onPressed: onPenTap,
                      ),
                      _BottomIconAction(
                        icon: Icons.camera_alt_outlined,
                        tooltip: 'Scan Document (OCR)',
                        color: AppColors.primaryPurple,
                        onPressed: onCameraTap,
                      ),
                      _BottomIconAction(
                        icon: Icons.mic_none_rounded,
                        tooltip: 'Voice Input (Bengali STT)',
                        color: AppColors.primaryPurple,
                        onPressed: onMicTap,
                      ),
                      _BottomIconAction(
                        icon: Icons.more_vert_rounded,
                        tooltip: 'More / Local AI Chat',
                        color: AppColors.primaryPurple,
                        onPressed: onMoreTap,
                      ),
                    ],
                  )
                : Row(
                    children: [
                      TextButton.icon(
                        onPressed: onCreateNotebook,
                        style: TextButton.styleFrom(
                          foregroundColor: AppColors.primaryPurple,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                        ),
                        icon: const Icon(Icons.add_rounded, size: 22),
                        label: const Text(
                          'Notebook',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primaryPurple,
                          ),
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

class _BottomIconAction extends StatelessWidget {
  const _BottomIconAction({
    required this.icon,
    required this.tooltip,
    required this.color,
    required this.onPressed,
  });

  final IconData icon;
  final String tooltip;
  final Color color;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onPressed,
      tooltip: tooltip,
      icon: Icon(icon, color: color, size: 22),
    );
  }
}
