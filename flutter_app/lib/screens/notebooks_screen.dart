import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../models/notebook_item.dart';

class NotebooksScreen extends StatefulWidget {
  const NotebooksScreen({
    super.key,
    required this.openNotebooks,
    required this.closedNotebooks,
    required this.onNotebookTap,
    this.onDeleteNotebook,
  });

  final List<NotebookItem> openNotebooks;
  final List<NotebookItem> closedNotebooks;
  final ValueChanged<NotebookItem> onNotebookTap;
  final ValueChanged<NotebookItem>? onDeleteNotebook;

  @override
  State<NotebooksScreen> createState() => _NotebooksScreenState();
}

class _NotebooksScreenState extends State<NotebooksScreen> {
  bool _showAllClosed = false;

  @override
  Widget build(BuildContext context) {
    final visibleClosed = _showAllClosed
        ? widget.closedNotebooks
        : widget.closedNotebooks.take(5).toList();

    return ListView(
      padding: const EdgeInsets.only(top: 4, bottom: 24),
      children: [
        for (final notebook in widget.openNotebooks)
          _NotebookListTile(
            notebook: notebook,
            onTap: () => widget.onNotebookTap(notebook),
            onDelete: (!notebook.isDefault && widget.onDeleteNotebook != null)
                ? () => widget.onDeleteNotebook!(notebook)
                : null,
          ),
        const Padding(
          padding: EdgeInsets.fromLTRB(16, 20, 16, 8),
          child: Text(
            'Closed Notebooks',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
            ),
          ),
        ),
        for (final notebook in visibleClosed)
          _NotebookListTile(
            notebook: notebook,
            onTap: () => widget.onNotebookTap(notebook),
            onDelete: widget.onDeleteNotebook != null
                ? () => widget.onDeleteNotebook!(notebook)
                : null,
          ),
        if (widget.closedNotebooks.length > 5)
          Padding(
            padding: const EdgeInsets.only(left: 52, top: 4),
            child: Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: () {
                  setState(() {
                    _showAllClosed = !_showAllClosed;
                  });
                },
                child: Text(
                  _showAllClosed ? 'Show less' : 'Show more',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: AppColors.primaryPurple,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _NotebookListTile extends StatelessWidget {
  const _NotebookListTile({
    required this.notebook,
    required this.onTap,
    this.onDelete,
  });

  final NotebookItem notebook;
  final VoidCallback onTap;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 11),
        child: Row(
          children: [
            _NotebookGlyph(
              color: notebook.isClosed
                  ? AppColors.closedNotebookIcon
                  : notebook.color,
            ),
            const SizedBox(width: 18),
            Expanded(
              child: Text(
                notebook.name,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textPrimary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (notebook.isDefault)
              const Text(
                'Default',
                style: TextStyle(
                  fontSize: 12.5,
                  color: AppColors.textMuted,
                ),
              )
            else if (onDelete != null)
              IconButton(
                onPressed: onDelete,
                tooltip: 'Delete ${notebook.name}',
                visualDensity: VisualDensity.compact,
                icon: const Icon(
                  Icons.delete_outline_rounded,
                  size: 19,
                  color: AppColors.textMuted,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _NotebookGlyph extends StatelessWidget {
  const _NotebookGlyph({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 22,
      height: 24,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 20,
            height: 24,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          Positioned(
            right: 0,
            top: 4,
            child: Column(
              children: List.generate(
                3,
                (_) => Container(
                  width: 3,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 2),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.78),
                    borderRadius: const BorderRadius.horizontal(
                      right: Radius.circular(1.5),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
