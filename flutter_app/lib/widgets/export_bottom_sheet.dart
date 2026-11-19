import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../services/export/export_service.dart';

class ExportBottomSheet extends StatefulWidget {
  const ExportBottomSheet({
    super.key,
    required this.noteTitle,
    required this.deltaJson,
    required this.exportService,
  });

  final String noteTitle;
  final String deltaJson;
  final ExportService exportService;

  @override
  State<ExportBottomSheet> createState() => _ExportBottomSheetState();
}

class _ExportBottomSheetState extends State<ExportBottomSheet> {
  ExportFormat? _activeFormat;
  String? _errorMessage;

  Future<void> _handleExport(ExportFormat format) async {
    if (_activeFormat != null) return;
    setState(() {
      _activeFormat = format;
      _errorMessage = null;
    });

    try {
      await widget.exportService.exportAndShare(
        format: format,
        title: widget.noteTitle,
        deltaJson: widget.deltaJson,
      );
      if (mounted) {
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _activeFormat = null;
          _errorMessage = 'Export failed: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isBusy = _activeFormat != null;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 38,
                height: 4,
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  color: AppColors.borderHairline,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const Text(
              'Export & Share Note',
              style: TextStyle(
                fontSize: 16.5,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Generated offline in a background Isolate and cleaned up after sharing.',
              style: TextStyle(fontSize: 12.5, color: AppColors.textMuted),
            ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 10),
              Text(
                _errorMessage!,
                style: const TextStyle(fontSize: 12.5, color: Colors.redAccent),
              ),
            ],
            const SizedBox(height: 12),
            _ExportOptionTile(
              icon: Icons.picture_as_pdf_rounded,
              iconColor: const Color(0xFFE53935),
              title: 'Export as PDF',
              subtitle: 'Formatted headings, bold, italics, and lists (.pdf)',
              isLoading: _activeFormat == ExportFormat.pdf,
              enabled: !isBusy,
              onTap: () => _handleExport(ExportFormat.pdf),
            ),
            _ExportOptionTile(
              icon: Icons.description_rounded,
              iconColor: AppColors.secondaryBlue,
              title: 'Export as DOCX',
              subtitle: 'Editable Word document preserving styles (.docx)',
              isLoading: _activeFormat == ExportFormat.docx,
              enabled: !isBusy,
              onTap: () => _handleExport(ExportFormat.docx),
            ),
            _ExportOptionTile(
              icon: Icons.text_snippet_outlined,
              iconColor: AppColors.primaryPurple,
              title: 'Export as TXT',
              subtitle: 'Lightweight plain text extracted from note (.txt)',
              isLoading: _activeFormat == ExportFormat.txt,
              enabled: !isBusy,
              onTap: () => _handleExport(ExportFormat.txt),
            ),
            _ExportOptionTile(
              icon: Icons.table_chart_outlined,
              iconColor: AppColors.secondaryGreen,
              title: 'Export as Excel',
              subtitle: 'Structured rows & columns spreadsheet (.xlsx)',
              isLoading: _activeFormat == ExportFormat.excel,
              enabled: !isBusy,
              onTap: () => _handleExport(ExportFormat.excel),
            ),
          ],
        ),
      ),
    );
  }
}

class _ExportOptionTile extends StatelessWidget {
  const _ExportOptionTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.isLoading,
    required this.enabled,
    required this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final bool isLoading;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      enabled: enabled,
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      leading: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: iconColor, size: 22),
      ),
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 14.5,
          fontWeight: FontWeight.w600,
          color: AppColors.textPrimary,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
      ),
      trailing: isLoading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2.2,
                color: AppColors.primaryPurple,
              ),
            )
          : const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
    );
  }
}
