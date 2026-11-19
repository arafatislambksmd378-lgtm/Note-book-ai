export type NoteCardTint = 'none' | 'yellow' | 'green' | 'purple';

export interface NotePreviewItem {
  id: string;
  notebookId?: string;
  notebookName: string;
  sectionName?: string;
  title: string;
  snippet?: string;
  contentDeltaJson?: string;
  dateLabel: string;
  imageUrl?: string;
  imageAlt?: string;
  tint: NoteCardTint;
  accentColor: string;
  isStickyStyle?: boolean;
  updatedAt?: number;
}

export interface NotebookEntry {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
  isClosed?: boolean;
  noteCount: number;
}

export interface PhaseRoadmapItem {
  phase: number;
  title: string;
  summary: string;
  status: 'completed' | 'upcoming';
}

export const USER_AVATAR_URL =
  '/src/assets/images/notegenie_user_avatar_1795002579663.jpg';

export const SEED_NOTES: NotePreviewItem[] = [
  {
    id: 'n1',
    notebookId: 'nb2',
    notebookName: 'Travel Journal',
    sectionName: 'France',
    title: 'France bike ride',
    snippet: 'The bike ride from Paris to Vernon is scenic along the Seine...',
    contentDeltaJson: JSON.stringify([
      { insert: 'France Route Notes', attributes: { header: 2 } },
      { insert: '\n' },
      { insert: 'The bike ride from Paris to Vernon is scenic along the Seine and passes Monet’s gardens at Giverny.' },
      { insert: '\n' },
    ]),
    dateLabel: '21/07',
    tint: 'none',
    accentColor: '#6B4EFF',
    updatedAt: 1753100800000,
  },
  {
    id: 'n2',
    notebookId: 'nb1',
    notebookName: 'My Notebook',
    sectionName: 'Paris',
    title: 'Paris Golden Hour',
    contentDeltaJson: JSON.stringify([
      { insert: 'Sunset viewpoint near Rue Saint-Dominique overlooking the Eiffel Tower.' },
      { insert: '\n' },
    ]),
    dateLabel: '21/07',
    imageUrl: '/src/assets/images/note_paris_eiffel_1795002578818.jpg',
    imageAlt: 'Eiffel Tower over Parisian rooftops at golden hour',
    tint: 'none',
    accentColor: '#6B4EFF',
    updatedAt: 1753100700000,
  },
  {
    id: 'n3',
    notebookId: 'nb3',
    notebookName: 'Work Notebook',
    sectionName: 'Inventory',
    title: 'Workshop Check',
    contentDeltaJson: JSON.stringify([
      { insert: 'Inspect cassette wear and rear derailleur alignment before weekend ride.' },
      { insert: '\n' },
    ]),
    dateLabel: '07/08',
    imageUrl: '/src/assets/images/note_bicycle_workshop_1795002579978.jpg',
    imageAlt: 'Cyclist inspecting bicycle wheel and chain in workshop',
    tint: 'none',
    accentColor: '#2979FF',
    updatedAt: 1753100600000,
  },
  {
    id: 'n4',
    notebookId: 'nb2',
    notebookName: 'Travel Journal',
    sectionName: 'France',
    title: "Grandma's Pies",
    snippet: 'Delicious and traditional pumpkin recipe notes and spice ratios...',
    contentDeltaJson: JSON.stringify([
      { insert: 'Delicious and traditional pumpkin recipe notes and spice ratios: cinnamon, nutmeg, ginger.' },
      { insert: '\n' },
    ]),
    dateLabel: '07/06',
    tint: 'none',
    accentColor: '#6B4EFF',
    updatedAt: 1753100500000,
  },
  {
    id: 'n5',
    notebookId: 'nb1',
    notebookName: 'My Notebook',
    title: 'Grocery List',
    snippet: 'Toothpaste · Harissa paste · Milk',
    contentDeltaJson: JSON.stringify([
      { insert: 'Toothpaste' },
      { insert: '\n', attributes: { list: 'checked' } },
      { insert: 'Harissa paste' },
      { insert: '\n', attributes: { list: 'unchecked' } },
      { insert: 'Milk' },
      { insert: '\n', attributes: { list: 'unchecked' } },
    ]),
    dateLabel: '21/07',
    tint: 'yellow',
    accentColor: '#FFD600',
    isStickyStyle: true,
    updatedAt: 1753100400000,
  },
  {
    id: 'n6',
    notebookId: 'nb3',
    notebookName: 'Work Notebook',
    sectionName: 'Onboarding',
    title: 'Build List',
    snippet: 'Spoke, Rim, Chains, Cog, Valve, Pedal',
    contentDeltaJson: JSON.stringify([
      { insert: 'Spoke, Rim, Chains, Cog, Valve, Pedal', attributes: { bold: true } },
      { insert: '\n' },
    ]),
    dateLabel: '21/07',
    tint: 'purple',
    accentColor: '#6B4EFF',
    updatedAt: 1753100300000,
  },
  {
    id: 'n7',
    notebookId: 'cb1',
    notebookName: 'School',
    sectionName: 'Astronomy',
    title: 'Astronomy Assignment',
    snippet: 'Rings of Saturn. Document the ring composition and orbital resonances...',
    contentDeltaJson: JSON.stringify([
      { insert: 'Rings of Saturn. Document the ring composition and orbital resonances with Titan.' },
      { insert: '\n' },
    ]),
    dateLabel: '14/07',
    tint: 'none',
    accentColor: '#6B4EFF',
    updatedAt: 1753100200000,
  },
  {
    id: 'n8',
    notebookId: 'nb1',
    notebookName: 'My Notebook',
    title: 'Confirmation code: XMALNSAD',
    contentDeltaJson: JSON.stringify([
      { insert: 'Booking reference stored offline.' },
      { insert: '\n' },
    ]),
    dateLabel: '02/07',
    tint: 'green',
    accentColor: '#00C853',
    isStickyStyle: true,
    updatedAt: 1753100100000,
  },
];

export const OPEN_NOTEBOOKS: NotebookEntry[] = [
  {
    id: 'nb1',
    name: 'My Notebook',
    color: '#6B4EFF',
    isDefault: true,
    noteCount: 14,
  },
  {
    id: 'nb2',
    name: 'Travel Journal',
    color: '#FF5252',
    noteCount: 9,
  },
  {
    id: 'nb3',
    name: 'Work Notebook',
    color: '#2979FF',
    noteCount: 18,
  },
];

export const CLOSED_NOTEBOOKS: NotebookEntry[] = [
  { id: 'cb1', name: 'School', color: '#C4C6CE', isClosed: true, noteCount: 12 },
  { id: 'cb2', name: 'Class work', color: '#C4C6CE', isClosed: true, noteCount: 8 },
  { id: 'cb3', name: 'Maths', color: '#C4C6CE', isClosed: true, noteCount: 16 },
  { id: 'cb4', name: 'Science', color: '#C4C6CE', isClosed: true, noteCount: 11 },
  { id: 'cb5', name: 'English', color: '#C4C6CE', isClosed: true, noteCount: 7 },
  { id: 'cb6', name: 'Bangla Literature', color: '#C4C6CE', isClosed: true, noteCount: 6 },
  { id: 'cb7', name: 'Physics Notes', color: '#C4C6CE', isClosed: true, noteCount: 10 },
];

export const PHASE_ROADMAP: PhaseRoadmapItem[] = [
  {
    phase: 1,
    title: 'Setup & UI',
    summary: 'pubspec.yaml, folder tree, theme tokens, Home & Notebooks screens, Bottom Action Bar.',
    status: 'completed',
  },
  {
    phase: 2,
    title: 'Database & Editor',
    summary: 'SQLite + Drift schema, Repository pattern, LIMIT 20 pagination, Riverpod providers, Rich Text Editor with 2s debounced autosave.',
    status: 'completed',
  },
  {
    phase: 3,
    title: 'File System & Export',
    summary: 'Isolate-powered TXT, PDF, DOCX, Excel export, share_plus, temp cleanup & indexed search.',
    status: 'completed',
  },
  {
    phase: 4,
    title: 'Local AI Engine',
    summary: 'llama.cpp via Dart FFI in Isolate, 4-bit .gguf model manager, 2048-token Bengali chat.',
    status: 'completed',
  },
  {
    phase: 5,
    title: 'OCR & Bengali STT',
    summary: 'Vosk offline Bengali voice-to-text, ML Kit OCR document scanning, AI summarization.',
    status: 'upcoming',
  },
  {
    phase: 6,
    title: '3GB RAM Optimization',
    summary: 'Isolate profiling, bitmap downscaling, and 60fps memory audit on low-RAM Android.',
    status: 'upcoming',
  },
];
