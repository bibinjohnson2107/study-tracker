import React, { useState, useEffect, useRef } from 'react';
import { CanvasObject, CanvasObjectType } from '../types';
import { marked } from 'marked';
import {
  FileText, Image as ImageIcon, Video, Music, FileCode, Link as LinkIcon,
  Paperclip, Globe, Plus, Trash2, ChevronUp, ChevronDown, GripVertical,
  ExternalLink, Download, Maximize2, X, Sparkles, Upload, Copy, Move,
  Layers, ArrowUp, ArrowDown, Scaling, Type, Heading as HeadingIcon
} from 'lucide-react';
import api from '../api/client';

interface AdvancedNoteWorkspaceProps {
  noteId?: number | null;
  topicId?: number | null;
  goalId?: number | null;
  initialContent?: string;
  onSaved?: (savedNoteId: number) => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

const getYouTubeEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(url.match(regExp) ? regExp : '');
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
};

const getVimeoEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const regExp = /(?:vimeo\.com\/|^)(\d+)/;
  const match = url.match(regExp);
  return match ? `https://player.vimeo.com/video/${match[1]}` : null;
};

const formatBytes = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const parseContentToCanvasObjects = (content?: string): CanvasObject[] => {
  if (!content || !content.trim()) {
    return [{
      id: `obj-${Date.now()}-1`,
      type: 'text',
      posX: 30,
      posY: 30,
      width: 650,
      zIndex: 1,
      textContent: '# Study Notes\nDouble click anywhere on the canvas to write notes or place resources.',
    }];
  }
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type) {
      return parsed.map((item, idx) => ({
        id: item.id || `obj-${Date.now()}-${idx}`,
        type: item.type || 'text',
        posX: typeof item.posX === 'number' ? item.posX : 30,
        posY: typeof item.posY === 'number' ? item.posY : 30 + idx * 120,
        width: item.width || item.widthPx || 550,
        height: item.height || item.heightPx,
        zIndex: item.zIndex || idx + 1,
        textContent: item.textContent || item.content || '',
        url: item.url,
        fileUrl: item.fileUrl,
        fileName: item.fileName,
        fileSize: item.fileSize,
        mimeType: item.mimeType,
        title: item.title,
        caption: item.caption,
      }));
    }
  } catch (e) {
    // Legacy markdown content
  }
  return [{
    id: `obj-${Date.now()}-1`,
    type: 'text',
    posX: 30,
    posY: 30,
    width: 650,
    zIndex: 1,
    textContent: content,
  }];
};

export const AdvancedNoteWorkspace: React.FC<AdvancedNoteWorkspaceProps> = ({
  noteId: initialNoteId = null,
  topicId,
  goalId,
  initialContent = '',
  onSaved,
  onDelete,
  readOnly = false,
}) => {
  const [noteId, setNoteId] = useState<number | null>(initialNoteId);
  const [objects, setObjects] = useState<CanvasObject[]>(() => parseContentToCanvasObjects(initialContent));
  const [selectedObjId, setSelectedObjId] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<'saved' | 'saving' | 'error' | 'uploading'>('saved');
  const [saveMessage, setSaveMessage] = useState<string>('Saved');
  
  // Canvas Click Spawning Popover
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);

  // Resource Upload Modal
  const [modalBlockType, setModalBlockType] = useState<CanvasObjectType | null>(null);
  const [modalTargetPos, setModalTargetPos] = useState<{ x: number; y: number } | null>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [inputCaption, setInputCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dragging & Resizing State
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastSavedContentRef = useRef<string>(initialContent);

  // Sync initialContent from props ONLY if it changed from an external source (not our own save)
  useEffect(() => {
    if (initialContent !== lastSavedContentRef.current) {
      lastSavedContentRef.current = initialContent;
      setObjects(parseContentToCanvasObjects(initialContent));
    }
  }, [initialContent]);

  // Max Z-Index helper
  const getMaxZIndex = () => {
    if (objects.length === 0) return 1;
    return Math.max(...objects.map(o => o.zIndex || 1));
  };

  // Debounced Autosave
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (readOnly) return;

    const serialized = JSON.stringify(objects);
    if (serialized === lastSavedContentRef.current) {
      return;
    }

    setSavingStatus('saving');
    setSaveMessage('Saving...');

    const timer = setTimeout(async () => {
      try {
        if (noteId) {
          await api.patch(`/notes/${noteId}/`, { content: serialized });
          lastSavedContentRef.current = serialized;
          setSavingStatus('saved');
          setSaveMessage('Saved');
          if (onSaved) onSaved(noteId);
        } else if (topicId || goalId) {
          let res;
          if (topicId) {
            res = await api.post(`/notes/by-topic/${topicId}/`, { content: serialized });
          } else {
            res = await api.post(`/notes/by-goal/${goalId}/`, { content: serialized });
          }
          if (res && res.data && res.data.id) {
            setNoteId(res.data.id);
            lastSavedContentRef.current = serialized;
            setSavingStatus('saved');
            setSaveMessage('Saved');
            if (onSaved) onSaved(res.data.id);
          }
        }
      } catch (err) {
        console.error("Failed to save notebook canvas:", err);
        setSavingStatus('error');
        setSaveMessage('Failed to save');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [objects]);

  // Object Manipulation Methods
  const updateObject = (id: string, updatedFields: Partial<CanvasObject>) => {
    setObjects((prev) => prev.map(o => o.id === id ? { ...o, ...updatedFields } : o));
  };

  const removeObject = (id: string) => {
    setObjects((prev) => prev.filter(o => o.id !== id));
    if (selectedObjId === id) setSelectedObjId(null);
  };

  const bringToFront = (id: string) => {
    const nextZ = getMaxZIndex() + 1;
    updateObject(id, { zIndex: nextZ });
  };

  const sendToBack = (id: string) => {
    updateObject(id, { zIndex: 1 });
  };

  const duplicateObject = (obj: CanvasObject) => {
    const newObj: CanvasObject = {
      ...obj,
      id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      posX: obj.posX + 25,
      posY: obj.posY + 25,
      zIndex: getMaxZIndex() + 1,
    };
    setObjects((prev) => [...prev, newObj]);
  };

  const addObject = (type: CanvasObjectType, posX: number, posY: number, data: Partial<CanvasObject> = {}) => {
    const newObj: CanvasObject = {
      id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      posX: Math.max(10, posX),
      posY: Math.max(10, posY),
      width: type === 'text' || type === 'heading' ? 500 : 480,
      zIndex: getMaxZIndex() + 1,
      ...data,
    };
    setObjects((prev) => [...prev, newObj]);
    setSelectedObjId(newObj.id);
    setPopoverPos(null);
  };

  // Canvas Click Spawning Handler
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    // Only spawn if clicked directly on canvas background
    if (e.target === canvasRef.current || (e.target as HTMLElement).id === 'canvas-bg') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setPopoverPos({ x, y });
    }
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    if (e.target === canvasRef.current || (e.target as HTMLElement).id === 'canvas-bg') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      addObject('text', x, y, { textContent: '' });
    }
  };

  // Dragging Object Handler
  const startDrag = (id: string, e: React.MouseEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    setSelectedObjId(id);
    setDraggingId(id);
    bringToFront(id);

    const obj = objects.find(o => o.id === id);
    if (!obj) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialPosX = obj.posX;
    const initialPosY = obj.posY;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const newX = Math.max(0, initialPosX + deltaX);
      const newY = Math.max(0, initialPosY + deltaY);
      updateObject(id, { posX: newX, posY: newY });
    };

    const onMouseUp = () => {
      setDraggingId(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Corner Resizing Handler
  const startCornerResize = (id: string, e: React.MouseEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    e.preventDefault();

    const obj = objects.find(o => o.id === id);
    if (!obj) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialWidth = obj.width || 400;
    const initialHeight = obj.height || 280;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const newWidth = Math.max(160, Math.min(1200, initialWidth + deltaX));
      const newHeight = Math.max(80, Math.min(900, initialHeight + deltaY));
      updateObject(id, { width: newWidth, height: newHeight });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // File Upload Handler
  const handleFileUpload = async (file: File, type?: CanvasObjectType, posX = 50, posY = 100) => {
    setIsUploading(true);
    setSavingStatus('uploading');
    setSaveMessage(`Uploading ${file.name || 'image'}...`);

    let url = '';
    let file_name = file.name || `pasted_image_${Date.now()}.png`;
    let file_size = file.size || 0;
    let mime_type = file.type || 'image/png';

    try {
      const formData = new FormData();
      formData.append('file', file, file_name);

      const res = await api.post('/notes/upload-media/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      url = res.data.url;
      file_name = res.data.file_name || file_name;
      file_size = res.data.file_size || file_size;
      mime_type = res.data.mime_type || mime_type;
    } catch (err) {
      console.warn("Upload via API failed, using base64 fallback:", err);
      url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    let determinedType: CanvasObjectType = type || 'file';
    if (!type || type === 'file') {
      if (mime_type.startsWith('image/')) determinedType = 'image';
      else if (mime_type.startsWith('video/')) determinedType = 'video';
      else if (mime_type.startsWith('audio/')) determinedType = 'audio';
      else if (mime_type.includes('pdf')) determinedType = 'pdf';
      else if (mime_type.includes('word') || mime_type.includes('spreadsheet') || mime_type.includes('presentation') || mime_type.includes('text')) determinedType = 'document';
    }

    addObject(determinedType, posX, posY, {
      url,
      fileUrl: url,
      fileName: file_name,
      fileSize: file_size,
      mimeType: mime_type,
      title: file_name.startsWith('pasted_image') ? 'Pasted Image' : file_name,
      width: determinedType === 'image' ? 480 : undefined,
    });

    setSavingStatus('saved');
    setSaveMessage('Image added');
    setIsUploading(false);
    setModalBlockType(null);
    return url;
  };

  // Clipboard Paste Handler (Ctrl+V)
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement | HTMLTextAreaElement>) => {
    if (readOnly) return;
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        let posX = 50;
        let posY = 50;
        if (popoverPos) {
          posX = popoverPos.x;
          posY = popoverPos.y;
        } else if (selectedObjId) {
          const selObj = objects.find(o => o.id === selectedObjId);
          if (selObj) {
            posX = selObj.posX + 20;
            posY = selObj.posY + (selObj.height || 180) + 15;
          }
        } else {
          posX = 40 + (objects.length % 5) * 35;
          posY = 40 + Math.floor(objects.length / 5) * 50;
        }

        await handleFileUpload(file, 'image', posX, posY);
        break;
      }
    }
  };

  // Drag & Drop Handler
  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLElement>) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    const dropX = rect ? e.clientX - rect.left : 50;
    const dropY = rect ? e.clientY - rect.top : 50;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImg = file.type.startsWith('image/');
      await handleFileUpload(file, isImg ? 'image' : undefined, dropX + i * 25, dropY + i * 25);
    }
  };

  const openResourceModalAt = (type: CanvasObjectType, x = 100, y = 100) => {
    setModalBlockType(type);
    setModalTargetPos({ x, y });
    setInputUrl('');
    setInputTitle('');
    setInputCaption('');
    setPopoverPos(null);
  };

  const handleConfirmModal = () => {
    if (!modalBlockType || !modalTargetPos || !inputUrl.trim()) return;

    addObject(modalBlockType, modalTargetPos.x, modalTargetPos.y, {
      url: inputUrl.trim(),
      title: inputTitle.trim() || inputUrl.trim(),
      caption: inputCaption.trim(),
    });

    setModalBlockType(null);
  };

  const applyTextFormatting = (objId: string, prefix: string, suffix: string = '') => {
    const obj = objects.find(o => o.id === objId);
    if (!obj) return;
    const current = obj.textContent || '';
    updateObject(objId, { textContent: `${prefix}${current || 'text'}${suffix}` });
  };

  const getObjectHeight = (obj: CanvasObject): number => {
    if (obj.height) return obj.height;
    if (obj.type === 'text' || obj.type === 'heading') {
      const lines = (obj.textContent || '').split('\n').length;
      return Math.max(120, lines * 28 + 50);
    }
    return 300;
  };

  // Calculate dynamic canvas height based on farthest object
  const calculateCanvasHeight = () => {
    if (objects.length === 0) return 750;
    const maxBottom = Math.max(...objects.map(o => o.posY + getObjectHeight(o)));
    return Math.max(750, maxBottom + 180);
  };

  return (
    <div className="space-y-4">
      {/* Sleek Minimal Toolbar Top Header */}
      {!readOnly && (
        <div className="flex items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-lg flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 mr-2">
              <Sparkles className="w-4 h-4 text-cyan-400" /> Digital Paper Canvas
            </span>

            <button
              type="button"
              onClick={() => addObject('text', 40, 40)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Type className="w-3.5 h-3.5 text-cyan-400" /> + Add Text Box
            </button>

            <button
              type="button"
              onClick={() => openResourceModalAt('image', 100, 100)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-400" /> Image
            </button>

            <button
              type="button"
              onClick={() => openResourceModalAt('video', 120, 120)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Video className="w-3.5 h-3.5 text-rose-400" /> Video
            </button>

            <button
              type="button"
              onClick={() => openResourceModalAt('pdf', 140, 140)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-amber-400" /> PDF
            </button>

            <button
              type="button"
              onClick={() => openResourceModalAt('link', 160, 160)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <LinkIcon className="w-3.5 h-3.5 text-sky-400" /> Link
            </button>

            <button
              type="button"
              onClick={() => {
                setModalBlockType('file');
                setModalTargetPos({ x: 100, y: 100 });
                fileInputRef.current?.click();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Paperclip className="w-3.5 h-3.5 text-indigo-400" /> Upload File
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              {savingStatus === 'saving' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
              {savingStatus === 'saved' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              {savingStatus === 'uploading' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
              {saveMessage}
            </span>

            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                title="Delete note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0], modalBlockType || undefined, modalTargetPos?.x || 100, modalTargetPos?.y || 100);
          }
        }}
      />

      {/* TRUE UNRESTRICTED DIGITAL CANVAS */}
      <div
        id="canvas-bg"
        ref={canvasRef}
        tabIndex={0}
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ height: `${calculateCanvasHeight()}px` }}
        className="w-full bg-slate-950/80 border border-slate-800/80 rounded-3xl relative overflow-hidden transition-all shadow-2xl cursor-crosshair bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
      >
        {/* Canvas Instructions Overlay (if empty) */}
        {objects.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 pointer-events-none space-y-2">
            <Sparkles className="w-10 h-10 text-cyan-400 opacity-60 animate-pulse" />
            <h4 className="text-base font-bold text-slate-300">Infinite Digital Notebook Canvas</h4>
            <p className="text-xs text-slate-500 max-w-md leading-relaxed">
              Click anywhere on the paper to place text, playable videos, images, PDFs, files & links.<br/>
              <span className="text-cyan-400 font-semibold">Tip: Copy & Paste (Ctrl+V) or Drag & Drop images directly onto the paper!</span>
            </p>
          </div>
        )}

        {/* CLICK SPAWNING POPOVER MENU */}
        {popoverPos && !readOnly && (
          <div
            style={{ left: `${popoverPos.x}px`, top: `${popoverPos.y}px` }}
            className="absolute z-50 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl flex items-center gap-1.5 animate-in fade-in zoom-in-95"
          >
            <button
              onClick={() => addObject('text', popoverPos.x, popoverPos.y)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1"
            >
              <Type className="w-3.5 h-3.5 text-cyan-400" /> Text
            </button>
            <button
              onClick={() => openResourceModalAt('image', popoverPos.x, popoverPos.y)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1"
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-400" /> Image
            </button>
            <button
              onClick={() => openResourceModalAt('video', popoverPos.x, popoverPos.y)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1"
            >
              <Video className="w-3.5 h-3.5 text-rose-400" /> Video
            </button>
            <button
              onClick={() => openResourceModalAt('pdf', popoverPos.x, popoverPos.y)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1"
            >
              <FileCode className="w-3.5 h-3.5 text-amber-400" /> PDF
            </button>
            <button
              onClick={() => setPopoverPos(null)}
              className="p-1 text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CANVAS OBJECTS GRAPH RENDERER */}
        {objects.map((obj) => {
          const isSelected = selectedObjId === obj.id;
          const isText = obj.type === 'text' || obj.type === 'heading';

          let containerStyle: React.CSSProperties = {
            left: `${obj.posX}px`,
            top: `${obj.posY}px`,
            width: `${obj.width}px`,
            zIndex: obj.zIndex || 1,
          };
          if (obj.height) {
            containerStyle.height = `${obj.height}px`;
          } else if (isText) {
            containerStyle.minHeight = `${getObjectHeight(obj)}px`;
          }

          return (
            <div
              key={obj.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedObjId(obj.id);
              }}
              style={containerStyle}
              className={`absolute group transition-shadow duration-150 rounded-2xl ${
                isSelected
                  ? 'ring-2 ring-cyan-400 shadow-2xl bg-slate-900/90'
                  : 'hover:ring-1 hover:ring-slate-700/80 bg-slate-900/70'
              }`}
            >
              {/* CONTEXTUAL OBJECT TOOLBAR (Hover / Selection) */}
              {!readOnly && (
                <div className="absolute -top-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-xl z-50 backdrop-blur-md">
                  {/* Move Drag Grip Handle */}
                  <div
                    onMouseDown={(e) => startDrag(obj.id, e)}
                    className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-cyan-400"
                    title="Drag object anywhere on canvas"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Text Formatting inside Toolbar for text objects */}
                  {isText && (
                    <>
                      <button
                        type="button"
                        onClick={() => applyTextFormatting(obj.id, '### ')}
                        className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300"
                      >
                        H3
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTextFormatting(obj.id, '**', '**')}
                        className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTextFormatting(obj.id, '*', '*')}
                        className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] italic font-bold text-slate-300"
                      >
                        I
                      </button>
                      <div className="h-3 w-px bg-slate-800 mx-0.5" />
                    </>
                  )}

                  {/* Layering Z-Index Controls */}
                  <button
                    onClick={() => bringToFront(obj.id)}
                    className="p-1 text-slate-400 hover:text-cyan-400"
                    title="Bring to Front"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => sendToBack(obj.id)}
                    className="p-1 text-slate-400 hover:text-cyan-400"
                    title="Send to Back"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => duplicateObject(obj)}
                    className="p-1 text-slate-400 hover:text-cyan-400"
                    title="Duplicate Object"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-3 w-px bg-slate-800 mx-0.5" />

                  <button
                    onClick={() => removeObject(obj.id)}
                    className="p-1 text-slate-400 hover:text-rose-400"
                    title="Delete Object"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* OBJECT BODY */}
              <div className={`p-3.5 h-full w-full ${isText ? '' : 'overflow-hidden'}`}>
                {/* 1. TEXT / HEADING OBJECT */}
                {isText && (
                  <div className="h-full w-full">
                    {!readOnly ? (
                      <textarea
                        value={obj.textContent || ''}
                        onChange={(e) => updateObject(obj.id, { textContent: e.target.value })}
                        onPaste={handlePaste}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        rows={Math.max(2, (obj.textContent || '').split('\n').length)}
                        placeholder={obj.type === 'heading' ? "Heading..." : "Write note text here... (Ctrl+V image allowed)"}
                        className={`w-full h-full bg-transparent border-none text-slate-100 placeholder-slate-600 focus:outline-none resize-none leading-relaxed font-mono ${
                          obj.type === 'heading' ? 'text-xl font-extrabold text-cyan-400' : 'text-sm'
                        }`}
                      />
                    ) : (
                      <div
                        className="markdown-body text-sm"
                        dangerouslySetInnerHTML={{
                          __html: marked.parse(obj.textContent || '', { async: false }) as string,
                        }}
                      />
                    )}
                  </div>
                )}

                {/* 2. IMAGE OBJECT */}
                {obj.type === 'image' && (
                  <div className="h-full w-full space-y-1">
                    {obj.url || obj.fileUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-full w-full">
                        <img
                          src={obj.url || obj.fileUrl}
                          alt={obj.title || 'Image'}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setLightboxUrl(obj.url || obj.fileUrl || null)}
                        />
                      </div>
                    ) : (
                      <div className="p-4 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-400">
                        No image URL
                      </div>
                    )}
                  </div>
                )}

                {/* 3. INLINE PLAYABLE VIDEO OBJECT */}
                {obj.type === 'video' && (
                  <div className="h-full w-full space-y-1">
                    {(() => {
                      const ytEmbed = getYouTubeEmbedUrl(obj.url || '');
                      const vmEmbed = getVimeoEmbedUrl(obj.url || '');
                      const mediaSrc = obj.url || obj.fileUrl;

                      if (ytEmbed) {
                        return (
                          <div className="aspect-video w-full h-full rounded-xl overflow-hidden border border-slate-800 shadow-md">
                            <iframe
                              src={ytEmbed}
                              title={obj.title || 'Video'}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        );
                      }

                      if (vmEmbed) {
                        return (
                          <div className="aspect-video w-full h-full rounded-xl overflow-hidden border border-slate-800 shadow-md">
                            <iframe
                              src={vmEmbed}
                              title={obj.title || 'Vimeo'}
                              className="w-full h-full"
                              allow="autoplay; fullscreen; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        );
                      }

                      if (mediaSrc) {
                        return (
                          <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md w-full h-full">
                            <video controls controlsList="nodownload" className="w-full h-full object-cover">
                              <source src={mediaSrc} />
                              Video not supported.
                            </video>
                          </div>
                        );
                      }

                      return (
                        <div className="p-4 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-400">
                          No video URL
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 4. AUDIO OBJECT */}
                {obj.type === 'audio' && (
                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3 w-full h-full">
                    <Music className="w-5 h-5 text-purple-400 shrink-0" />
                    <div className="flex-1 overflow-hidden">
                      <span className="text-xs font-bold text-slate-200 block truncate">
                        {obj.title || obj.fileName || 'Audio Track'}
                      </span>
                      {(obj.url || obj.fileUrl) && (
                        <audio controls className="w-full h-8 mt-1">
                          <source src={obj.url || obj.fileUrl || ''} />
                        </audio>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. PDF OBJECT */}
                {obj.type === 'pdf' && (
                  <div className="space-y-2 w-full h-full">
                    <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileCode className="w-4 h-4 text-rose-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {obj.title || obj.fileName || 'PDF Document'}
                        </span>
                      </div>
                      {(obj.url || obj.fileUrl) && (
                        <a
                          href={obj.url || obj.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-cyan-400 hover:underline flex items-center gap-1 shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" /> View
                        </a>
                      )}
                    </div>

                    {(obj.url || obj.fileUrl) && (
                      <div className="h-56 w-full rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
                        <iframe
                          src={`${obj.url || obj.fileUrl}#toolbar=0`}
                          title={obj.title || 'PDF Preview'}
                          className="w-full h-full"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 6. DOCUMENT / FILE / LINK OBJECT */}
                {(obj.type === 'document' || obj.type === 'file' || obj.type === 'link') && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 w-full h-full">
                    {obj.type === 'link' ? (
                      <LinkIcon className="w-4 h-4 text-sky-400 shrink-0" />
                    ) : (
                      <Paperclip className="w-4 h-4 text-cyan-400 shrink-0" />
                    )}
                    <span className="font-bold truncate flex-1">{obj.title || obj.fileName || obj.url}</span>
                    {obj.url && (
                      <a
                        href={obj.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-0.5 shrink-0 ml-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}

                {/* 7. EMBED OBJECT */}
                {obj.type === 'embed' && obj.url && (
                  <div className="h-full w-full rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
                    <iframe src={obj.url} title="Embed" className="w-full h-full" />
                  </div>
                )}
              </div>

              {/* CORNER DRAG-TO-RESIZE HANDLE */}
              {!readOnly && (
                <div
                  onMouseDown={(e) => startCornerResize(obj.id, e)}
                  className="absolute -bottom-2 -right-2 w-5 h-5 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center cursor-nwse-resize text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-md hover:scale-110"
                  title="Drag corner to resize dimensions"
                >
                  <Scaling className="w-3 h-3" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* RESOURCE INSERTION MODAL */}
      {modalBlockType && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-slate-100 capitalize">
                Embed {modalBlockType}
              </h4>
              <button onClick={() => setModalBlockType(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {['image', 'video', 'audio', 'pdf', 'document', 'file'].includes(modalBlockType) && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 border border-dashed border-slate-700 hover:border-cyan-400 rounded-xl text-center cursor-pointer bg-slate-950/40 text-xs font-bold text-slate-300"
                >
                  <Upload className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                  {isUploading ? 'Uploading...' : 'Choose file from computer'}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">URL</label>
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Title (Optional)</label>
                <input
                  type="text"
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                  placeholder="Title or caption..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModalBlockType(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmModal}
                disabled={!inputUrl.trim()}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs disabled:opacity-40"
              >
                Embed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-4xl w-full max-h-[85vh] overflow-hidden rounded-2xl border border-slate-800 relative">
            <img src={lightboxUrl} alt="Preview" className="w-full h-full object-contain mx-auto" />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-3 right-3 p-1.5 bg-slate-900/80 text-slate-200 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
