import 'package:flutter/material.dart';
import 'package:flutter_quill/flutter_quill.dart';
import '../core/constants/app_colors.dart';

class EditorFormattingToolbar extends StatelessWidget {
  const EditorFormattingToolbar({
    super.key,
    required this.controller,
  });

  final QuillController controller;

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
          height: 52,
          child: ListenableBuilder(
            listenable: controller,
            builder: (context, _) {
              final attrs = controller.getSelectionStyle().attributes;

              return SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Row(
                  children: [
                    _FormatButton(
                      icon: Icons.format_bold_rounded,
                      tooltip: 'Bold',
                      isActive: attrs.containsKey(Attribute.bold.key),
                      onPressed: () => _toggleAttribute(Attribute.bold, attrs),
                    ),
                    _FormatButton(
                      icon: Icons.format_italic_rounded,
                      tooltip: 'Italic',
                      isActive: attrs.containsKey(Attribute.italic.key),
                      onPressed: () => _toggleAttribute(Attribute.italic, attrs),
                    ),
                    _FormatButton(
                      icon: Icons.format_underline_rounded,
                      tooltip: 'Underline',
                      isActive: attrs.containsKey(Attribute.underline.key),
                      onPressed: () => _toggleAttribute(Attribute.underline, attrs),
                    ),
                    const _ToolbarDivider(),
                    _FormatTextButton(
                      label: 'H1',
                      tooltip: 'Heading 1',
                      isActive: attrs[Attribute.header.key]?.value == 1,
                      onPressed: () => _toggleHeader(1, attrs),
                    ),
                    _FormatTextButton(
                      label: 'H2',
                      tooltip: 'Heading 2',
                      isActive: attrs[Attribute.header.key]?.value == 2,
                      onPressed: () => _toggleHeader(2, attrs),
                    ),
                    const _ToolbarDivider(),
                    _FormatButton(
                      icon: Icons.format_list_bulleted_rounded,
                      tooltip: 'Bullet list',
                      isActive: attrs[Attribute.list.key]?.value == 'bullet',
                      onPressed: () => _toggleList(Attribute.ul, attrs, 'bullet'),
                    ),
                    _FormatButton(
                      icon: Icons.format_list_numbered_rounded,
                      tooltip: 'Numbered list',
                      isActive: attrs[Attribute.list.key]?.value == 'ordered',
                      onPressed: () => _toggleList(Attribute.ol, attrs, 'ordered'),
                    ),
                    _FormatButton(
                      icon: Icons.check_box_outlined,
                      tooltip: 'Checklist',
                      isActive: attrs[Attribute.list.key]?.value == 'checked' ||
                          attrs[Attribute.list.key]?.value == 'unchecked',
                      onPressed: () => _toggleChecklist(attrs),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  void _toggleAttribute(Attribute attribute, Map<String, Attribute> attrs) {
    if (attrs.containsKey(attribute.key)) {
      controller.formatSelection(Attribute.clone(attribute, null));
    } else {
      controller.formatSelection(attribute);
    }
  }

  void _toggleHeader(int level, Map<String, Attribute> attrs) {
    final current = attrs[Attribute.header.key]?.value;
    if (current == level) {
      controller.formatSelection(Attribute.clone(Attribute.h1, null));
    } else {
      controller.formatSelection(level == 1 ? Attribute.h1 : Attribute.h2);
    }
  }

  void _toggleList(
    Attribute listAttr,
    Map<String, Attribute> attrs,
    String targetValue,
  ) {
    final current = attrs[Attribute.list.key]?.value;
    if (current == targetValue) {
      controller.formatSelection(Attribute.clone(Attribute.ul, null));
    } else {
      controller.formatSelection(listAttr);
    }
  }

  void _toggleChecklist(Map<String, Attribute> attrs) {
    final current = attrs[Attribute.list.key]?.value;
    if (current == 'checked' || current == 'unchecked') {
      controller.formatSelection(Attribute.clone(Attribute.unchecked, null));
    } else {
      controller.formatSelection(Attribute.unchecked);
    }
  }
}

class _FormatButton extends StatelessWidget {
  const _FormatButton({
    required this.icon,
    required this.tooltip,
    required this.isActive,
    required this.onPressed,
  });

  final IconData icon;
  final String tooltip;
  final bool isActive;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onPressed,
      tooltip: tooltip,
      style: IconButton.styleFrom(
        backgroundColor: isActive ? AppColors.primaryPurpleSoft : Colors.transparent,
        foregroundColor: isActive ? AppColors.primaryPurple : AppColors.textPrimary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      icon: Icon(icon, size: 20),
    );
  }
}

class _FormatTextButton extends StatelessWidget {
  const _FormatTextButton({
    required this.label,
    required this.tooltip,
    required this.isActive,
    required this.onPressed,
  });

  final String label;
  final String tooltip;
  final bool isActive;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
          decoration: BoxDecoration(
            color: isActive ? AppColors.primaryPurpleSoft : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.w700,
              color: isActive ? AppColors.primaryPurple : AppColors.textPrimary,
            ),
          ),
        ),
      ),
    );
  }
}

class _ToolbarDivider extends StatelessWidget {
  const _ToolbarDivider();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 20,
      margin: const EdgeInsets.symmetric(horizontal: 6),
      color: AppColors.borderHairline,
    );
  }
}
