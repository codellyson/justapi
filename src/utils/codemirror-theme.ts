import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import type { PaletteHex } from '../contexts/theme-context';

function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function createEditorTheme(palette: PaletteHex, isDark: boolean) {
  return EditorView.theme(
    {
      '&': {
        backgroundColor: palette.bg,
        color: palette.textPrimary,
        fontFamily:
          'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: '13px',
      },
      '.cm-content': {
        caretColor: palette.accent,
        color: palette.textPrimary,
        padding: '10px 0',
      },
      '.cm-line': {
        padding: '0 12px',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: palette.accent,
        borderLeftWidth: '2px',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
        {
          backgroundColor: withAlpha(palette.accent, 0.18),
        },
      '.cm-gutters': {
        backgroundColor: palette.bgSecondary,
        color: palette.textMuted,
        border: 'none',
        borderRight: `1px solid ${palette.border}`,
      },
      '.cm-activeLineGutter': {
        backgroundColor: withAlpha(palette.accent, 0.12),
        color: palette.textPrimary,
      },
      '.cm-activeLine': {
        backgroundColor: withAlpha(palette.textPrimary, 0.04),
      },
      '.cm-matchingBracket': {
        backgroundColor: withAlpha(palette.accent, 0.15),
        outline: `1px solid ${palette.textMuted}`,
        borderRadius: '2px',
      },
      '.cm-placeholder': {
        color: palette.textMuted,
      },
      '.cm-scroller': {
        overflow: 'auto',
      },
      '.cm-tooltip': {
        backgroundColor: palette.bgSecondary,
        border: `1px solid ${palette.border}`,
        color: palette.textPrimary,
      },
      '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
        backgroundColor: withAlpha(palette.accent, 0.18),
        color: palette.textPrimary,
      },
      '.cm-foldPlaceholder': {
        backgroundColor: withAlpha(palette.accent, 0.12),
        color: palette.accent,
        border: `1px solid ${withAlpha(palette.accent, 0.3)}`,
        borderRadius: '3px',
        padding: '0 6px',
        margin: '0 2px',
        cursor: 'pointer',
        fontWeight: 'bold',
      },
      '.cm-foldGutter .cm-gutterElement': {
        cursor: 'pointer',
        userSelect: 'none',
      },
    },
    { dark: isDark }
  );
}

export function createEditorHighlight(palette: PaletteHex) {
  return syntaxHighlighting(
    HighlightStyle.define([
      { tag: tags.keyword, color: palette.accent, fontWeight: 'bold' },
      { tag: tags.string, color: palette.success },
      { tag: tags.number, color: palette.accent },
      { tag: tags.comment, color: palette.textMuted, fontStyle: 'italic' },
      { tag: tags.operator, color: palette.textPrimary },
      { tag: tags.typeName, color: palette.accent },
      { tag: tags.propertyName, color: palette.textPrimary },
      {
        tag: tags.function(tags.variableName),
        color: palette.textPrimary,
        fontWeight: 'bold',
      },
      { tag: tags.null, color: palette.danger, fontWeight: 'bold' },
      { tag: tags.bool, color: palette.warning, fontWeight: 'bold' },
    ])
  );
}
