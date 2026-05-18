'use client';

import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { EditorView, keymap } from '@codemirror/view';
import { acceptCompletion } from '@codemirror/autocomplete';
import { foldGutter, foldKeymap } from '@codemirror/language';
import { useTheme } from '../../contexts/theme-context';
import {
  createEditorTheme,
  createEditorHighlight,
} from '../../utils/codemirror-theme';
import { cn } from '../../utils/cn';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string | undefined) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
  className?: string;
}

function langExtension(language: string) {
  switch (language) {
    case 'json':
      return [json()];
    case 'js':
    case 'javascript':
    case 'ts':
    case 'typescript':
      return [javascript({ typescript: language.startsWith('t') })];
    case 'bash':
    case 'sh':
    case 'shell':
    default:
      return [];
  }
}

export const CodeEditor = ({
  value,
  onChange,
  onFocus,
  onBlur,
  language = 'json',
  readOnly = false,
  height = '400px',
  className,
}: CodeEditorProps) => {
  const { mode, palette } = useTheme();
  const isDark = mode === 'dark';

  const supportsFolding = language === 'json' || language === 'javascript' || language === 'js' || language === 'typescript' || language === 'ts';

  const extensions = useMemo(
    () => [
      ...langExtension(language),
      createEditorTheme(palette, isDark),
      createEditorHighlight(palette),
      ...(supportsFolding
        ? [
            foldGutter({
              markerDOM: (open) => {
                const el = document.createElement('span');
                el.textContent = open ? '▾' : '▸';
                el.style.cursor = 'pointer';
                el.style.color = 'var(--secondary)';
                el.style.fontSize = '10px';
                el.style.padding = '0 4px';
                return el;
              },
            }),
          ]
        : []),
      keymap.of([
        { key: 'Tab', run: acceptCompletion },
        ...foldKeymap,
      ]),
      EditorView.lineWrapping,
    ],
    [language, palette, isDark, supportsFolding]
  );

  return (
    <div
      className={cn(
        'border border-border rounded-md overflow-hidden',
        height === '100%' && 'h-full',
        className
      )}
    >
      <CodeMirror
        value={value}
        onChange={(v) => onChange?.(v)}
        onFocus={onFocus}
        onBlur={onBlur}
        extensions={extensions}
        editable={!readOnly}
        readOnly={readOnly}
        height={height === '100%' ? '100%' : height}
        theme="none"
        basicSetup={{
          lineNumbers: !readOnly,
          highlightActiveLineGutter: !readOnly,
          highlightActiveLine: !readOnly,
          bracketMatching: true,
          closeBrackets: !readOnly,
          autocompletion: !readOnly,
          foldGutter: false,
          indentOnInput: !readOnly,
        }}
      />
    </div>
  );
};
