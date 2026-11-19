import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

class NoteGenieTopAppBar extends StatelessWidget {
  const NoteGenieTopAppBar({
    super.key,
    required this.onSearchTap,
    required this.onSettingsTap,
    this.onAvatarTap,
  });

  final VoidCallback onSearchTap;
  final VoidCallback onSettingsTap;
  final VoidCallback? onAvatarTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.background,
      padding: const EdgeInsets.fromLTRB(16, 10, 8, 6),
      child: Row(
        children: [
          GestureDetector(
            onTap: onAvatarTap,
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.primaryPurpleSoft,
                border: Border.all(
                  color: AppColors.borderHairline,
                  width: 1,
                ),
              ),
              child: const Center(
                child: Text(
                  'NG',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primaryPurple,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              'NoteGenie AI',
              style: Theme.of(context).textTheme.titleLarge,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          IconButton(
            onPressed: onSearchTap,
            tooltip: 'Search notes',
            icon: const Icon(
              Icons.search_rounded,
              color: AppColors.textPrimary,
              size: 24,
            ),
          ),
          IconButton(
            onPressed: onSettingsTap,
            tooltip: 'Settings & Local AI Models',
            icon: const Icon(
              Icons.settings_outlined,
              color: AppColors.textPrimary,
              size: 23,
            ),
          ),
        ],
      ),
    );
  }
}
