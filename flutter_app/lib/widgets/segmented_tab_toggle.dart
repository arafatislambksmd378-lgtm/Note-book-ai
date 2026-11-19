import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

enum MainTab { home, notebooks }

class SegmentedTabToggle extends StatelessWidget {
  const SegmentedTabToggle({
    super.key,
    required this.activeTab,
    required this.onTabChanged,
    this.showHomeActions = true,
    this.isGridView = true,
    this.onFilterTap,
    this.onViewModeToggle,
  });

  final MainTab activeTab;
  final ValueChanged<MainTab> onTabChanged;
  final bool showHomeActions;
  final bool isGridView;
  final VoidCallback? onFilterTap;
  final VoidCallback? onViewModeToggle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 6, 12, 10),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: AppColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.borderHairline, width: 0.8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _PillTabButton(
                  label: 'Home',
                  isSelected: activeTab == MainTab.home,
                  onTap: () => onTabChanged(MainTab.home),
                ),
                _PillTabButton(
                  label: 'Notebooks',
                  isSelected: activeTab == MainTab.notebooks,
                  onTap: () => onTabChanged(MainTab.notebooks),
                ),
              ],
            ),
          ),
          const Spacer(),
          if (showHomeActions) ...[
            IconButton(
              onPressed: onFilterTap,
              tooltip: 'Filter notes',
              visualDensity: VisualDensity.compact,
              icon: const Icon(
                Icons.tune_rounded,
                color: AppColors.textSecondary,
                size: 21,
              ),
            ),
            IconButton(
              onPressed: onViewModeToggle,
              tooltip: isGridView ? 'Switch to list view' : 'Switch to grid view',
              visualDensity: VisualDensity.compact,
              icon: Icon(
                isGridView
                    ? Icons.view_agenda_outlined
                    : Icons.grid_view_rounded,
                color: AppColors.textSecondary,
                size: 21,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PillTabButton extends StatelessWidget {
  const _PillTabButton({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryPurple : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13.5,
            fontWeight: FontWeight.w600,
            color: isSelected ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}
