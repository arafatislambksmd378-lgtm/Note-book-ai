import 'package:flutter/material.dart';

@immutable
class NotebookItem {
  const NotebookItem({
    required this.id,
    required this.name,
    required this.color,
    this.isDefault = false,
    this.isClosed = false,
  });

  final String id;
  final String name;
  final Color color;
  final bool isDefault;
  final bool isClosed;
}
