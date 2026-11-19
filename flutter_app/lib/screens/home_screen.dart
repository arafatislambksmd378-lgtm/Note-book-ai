import 'package:flutter/material.dart';
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';
import '../core/constants/app_colors.dart';
import '../models/note_preview.dart';
import '../widgets/note_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.recentNotes,
    required this.notes,
    required this.isGridView,
    required this.hasMore,
    required this.isLoadingMore,
    required this.onLoadMore,
    required this.onNoteTap,
  });

  final List<NotePreview> recentNotes;
  final List<NotePreview> notes;
  final bool isGridView;
  final bool hasMore;
  final bool isLoadingMore;
  final VoidCallback onLoadMore;
  final ValueChanged<NotePreview> onNoteTap;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (!widget.hasMore || widget.isLoadingMore) return;
    final position = _scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 240) {
      widget.onLoadMore();
    }
  }

  @override
  void dispose() {
    _scrollController
      ..removeListener(_onScroll)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.notes.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'No notes yet. Tap + Page below to create your first offline note.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.textMuted,
              fontSize: 14,
            ),
          ),
        ),
      );
    }

    return CustomScrollView(
      controller: _scrollController,
      cacheExtent: 400,
      slivers: [
        if (widget.recentNotes.isNotEmpty)
          SliverToBoxAdapter(
            child: _RecentNotesCarousel(
              recentNotes: widget.recentNotes,
              onNoteTap: widget.onNoteTap,
            ),
          ),
        if (!widget.isGridView)
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
            sliver: SliverList.separated(
              itemCount: widget.notes.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final note = widget.notes[index];
                return NoteCard(
                  note: note,
                  onTap: () => widget.onNoteTap(note),
                );
              },
            ),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(14, 4, 14, 12),
            sliver: SliverMasonryGrid.count(
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childCount: widget.notes.length,
              addAutomaticKeepAlives: false,
              itemBuilder: (context, index) {
                final note = widget.notes[index];
                return NoteCard(
                  note: note,
                  onTap: () => widget.onNoteTap(note),
                );
              },
            ),
          ),
        if (widget.isLoadingMore)
          const SliverToBoxAdapter(child: _PaginationLoader()),
      ],
    );
  }
}

class _RecentNotesCarousel extends StatelessWidget {
  const _RecentNotesCarousel({
    required this.recentNotes,
    required this.onNoteTap,
  });

  final List<NotePreview> recentNotes;
  final ValueChanged<NotePreview> onNoteTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(16, 2, 16, 8),
          child: Text(
            'Recent Notes',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
        ),
        SizedBox(
          height: 106,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
            itemCount: recentNotes.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final note = recentNotes[index];
              return SizedBox(
                width: 174,
                child: Material(
                  color: AppColors.surfaceSubtle,
                  borderRadius: BorderRadius.circular(12),
                  child: InkWell(
                    onTap: () => onNoteTap(note),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.borderHairline),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            note.notebookName,
                            style: const TextStyle(
                              fontSize: 10.5,
                              color: AppColors.textMuted,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 3),
                          Text(
                            note.title,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const Spacer(),
                          Row(
                            children: [
                              Icon(
                                Icons.description_rounded,
                                size: 13,
                                color: note.accentColor,
                              ),
                              const Spacer(),
                              Text(
                                note.dateLabel,
                                style: const TextStyle(
                                  fontSize: 10.5,
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
            },
          ),
        ),
      ],
    );
  }
}

class _PaginationLoader extends StatelessWidget {
  const _PaginationLoader();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 16),
      child: Center(
        child: SizedBox(
          width: 22,
          height: 22,
          child: CircularProgressIndicator(
            strokeWidth: 2.2,
            color: AppColors.primaryPurple,
          ),
        ),
      ),
    );
  }
}
