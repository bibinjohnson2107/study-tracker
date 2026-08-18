import React, { useState, useEffect } from 'react';
import { Bold, Italic, Code, Heading, List, Check, Save, Calendar, Clock, Image as ImageIcon } from 'lucide-react';
import api from '../api/client';

interface RichTextEditorProps {
  initialValue: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  onSave: (content: string) => Promise<void>;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialValue,
  createdAt,
  updatedAt,
  onSave,
  placeholder = 'Write your study notes here... (Markdown & image paste supported)',
}) => {
  const [content, setContent] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    setContent(initialValue);
  }, [initialValue]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(content);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSaved(timeStr);
    } catch (err) {
      console.error("Failed to save note:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('note-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
  };

  const uploadAndInsertImage = async (file: File, textarea: HTMLTextAreaElement | null) => {
    setIsSaving(true);
    setLastSaved('Uploading pasted image...');

    let imageUrl = '';
    try {
      const formData = new FormData();
      formData.append('file', file, file.name || `pasted_image_${Date.now()}.png`);
      const res = await api.post('/notes/upload-media/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      imageUrl = res.data.url;
    } catch (err) {
      console.warn("Upload failed, using base64 fallback:", err);
      imageUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    const start = textarea ? textarea.selectionStart : content.length;
    const end = textarea ? textarea.selectionEnd : content.length;
    const imageMarkdown = `\n![${file.name || 'Pasted Image'}](${imageUrl})\n`;
    const newContent = content.substring(0, start) + imageMarkdown + content.substring(end);

    setContent(newContent);
    setIsSaving(false);
    setLastSaved('Image pasted!');
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await uploadAndInsertImage(file, e.currentTarget);
        }
        break;
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        await uploadAndInsertImage(file, e.currentTarget);
        break;
      }
    }
  };

  const effectiveTimestamp = updatedAt || createdAt;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
      {/* Formatting Toolbar */}
      <div className="bg-slate-950/80 border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => insertFormatting('### ')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Heading"
          >
            <Heading className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('**', '**')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('*', '*')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('```\n', '\n```')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Code Block"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('- ')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-slate-500 ml-2 font-medium hidden sm:inline flex items-center gap-1">
            <ImageIcon className="w-3 h-3 text-cyan-400 inline" /> Paste (Ctrl+V) or drop images directly into text
          </span>
        </div>

        <div className="flex items-center gap-3">
          {effectiveTimestamp && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
              <span className="flex items-center gap-1 text-cyan-400">
                <Calendar className="w-3 h-3" />
                {new Date(effectiveTimestamp).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 text-sky-400">
                <Clock className="w-3 h-3" />
                {new Date(effectiveTimestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>
            </div>
          )}

          {lastSaved && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
              <Check className="w-3.5 h-3.5" />
              {lastSaved}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving Notes...' : 'Save Notes'}
          </button>
        </div>
      </div>

      {/* Full View Editor Body */}
      <textarea
        id="note-textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        placeholder={placeholder}
        rows={16}
        className="w-full bg-slate-900 p-5 text-slate-100 text-sm font-mono leading-relaxed placeholder-slate-600 focus:outline-none min-h-[300px] resize-y border-none"
      />
    </div>
  );
};
