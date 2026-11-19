import test from 'node:test';
import assert from 'node:assert/strict';
import { SEED_NOTES } from '../data/phase1Data';
import { generateBatchExportArtifact } from './exportGenerators';
import {
  BASE_BENGALI_SYSTEM_PROMPT,
  buildBengaliChatPrompt,
  clampContextTokens,
  DEFAULT_GGUF_MODELS,
  estimateTokenCount,
  formatModelSize,
  generateMockBengaliReply,
  MAX_CONTEXT_TOKENS,
  registerGgufModel,
  swapSelectedModel,
  unloadActiveModel,
  type AIModelManagerState,
} from './phase4AiStore';

test('AIModelManager state persists import, swap, and RAM unload', () => {
  const initial: AIModelManagerState = {
    models: DEFAULT_GGUF_MODELS,
    selectedModelPath: DEFAULT_GGUF_MODELS[0].path,
    isLoaded: true,
  };

  assert.throws(() =>
    registerGgufModel(initial, {
      fileNameOrPath: 'invalid-model.bin',
      sizeBytes: 1000,
    })
  );

  const { state: afterImport, imported } = registerGgufModel(initial, {
    fileNameOrPath: 'Bangla-Qwen-Q4.gguf',
    sizeBytes: 912 * 1024 * 1024,
    nowMs: 1753100000000,
  });

  assert.equal(imported.name, 'Bangla-Qwen-Q4.gguf');
  assert.equal(afterImport.selectedModelPath, imported.path);
  assert.equal(afterImport.isLoaded, true);
  assert.equal(formatModelSize(imported.sizeBytes), '912 MB');

  const swapped = swapSelectedModel(afterImport, DEFAULT_GGUF_MODELS[1].path);
  assert.equal(swapped.selectedModelPath, DEFAULT_GGUF_MODELS[1].path);
  assert.equal(swapped.isLoaded, true);

  const unloaded = unloadActiveModel(swapped);
  assert.equal(unloaded.isLoaded, false);
});

test('Context window clamps strictly to 2048 tokens and injects hidden Bengali prompt', () => {
  assert.equal(clampContextTokens(4096), MAX_CONTEXT_TOKENS);
  assert.equal(clampContextTokens(2048), 2048);
  assert.equal(clampContextTokens(128), 256);

  const longHistory = Array.from({ length: 30 }, (_, idx) => ({
    id: `m_${idx}`,
    role: (idx % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
    text: 'Long Bengali conversation turn '.repeat(20),
    timestampMs: 1000 + idx,
  }));

  const prompt = buildBengaliChatPrompt('আমার নোটের সারাংশ দাও', longHistory);
  assert.ok(prompt.includes(BASE_BENGALI_SYSTEM_PROMPT));
  assert.ok(estimateTokenCount(prompt) <= MAX_CONTEXT_TOKENS);

  const reply = generateMockBengaliReply(
    'Summarize my notes',
    'Qwen-1.5B-Instruct (4-bit)',
    SEED_NOTES
  );
  assert.ok(reply.includes('আপনার সাম্প্রতিক নোটগুলোর'));
});

test('generateBatchExportArtifact bundles multiple notes into bulk PDF and DOCX', () => {
  const pdfBundle = generateBatchExportArtifact('pdf', SEED_NOTES.slice(0, 4));
  assert.equal(pdfBundle.noteCount, 4);
  assert.equal(pdfBundle.filename, 'NoteGenie_AI_Batch_Export.pdf');
  assert.equal(new TextDecoder().decode(pdfBundle.bytes.slice(0, 5)), '%PDF-');

  const docxBundle = generateBatchExportArtifact('docx', SEED_NOTES.slice(0, 4));
  assert.equal(docxBundle.noteCount, 4);
  assert.equal(docxBundle.filename, 'NoteGenie_AI_Batch_Export.docx');
  assert.deepEqual(Array.from(docxBundle.bytes.slice(0, 2)), [0x50, 0x4b]);
});
