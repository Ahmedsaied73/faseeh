'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2, RefreshCw, Trash2, UploadCloud, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { optimizeImage } from '@/lib/image-optimizer';
import { uploadCourseImage } from '@/services/adminCoursesService';

interface CourseImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  disabled?: boolean;
}

export function CourseImagePicker({
  value,
  onChange,
  onUploadingChange,
  disabled = false,
}: CourseImagePickerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState(value || '');

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const lastFileRef = useRef<File | null>(null);

  // Sync external value changes (e.g. form reset, edit dialog open)
  useEffect(() => {
    if (value && value !== previewUrl && !activeBlobUrlRef.current) {
      setPreviewUrl(value);
      setCustomUrl(value);
    } else if (!value && !activeBlobUrlRef.current) {
      setPreviewUrl(null);
      setCustomUrl('');
    }
  }, [value, previewUrl]);

  // Clean up blob URLs on unmount to prevent browser memory leaks
  useEffect(() => {
    return () => {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
    };
  }, []);

  const clearBlobUrl = useCallback(() => {
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
  }, []);

  const handleFileProcess = async (file: File) => {
    // Validate image MIME or file extension (some mobile browsers report empty file.type)
    const isImageMime = file.type.startsWith('image/');
    const isImageExt = /\.(jpe?g|png|webp|gif|avif)$/i.test(file.name);
    if (!isImageMime && !isImageExt) {
      const msg = 'يرجى اختيار ملف صورة صالح (JPEG, PNG, WebP, GIF).';
      setUploadError(msg);
      toast.error(msg);
      return;
    }

    lastFileRef.current = file;
    setUploadError(null);

    // Instant local preview for zero-perceived latency
    clearBlobUrl();
    const localBlob = URL.createObjectURL(file);
    activeBlobUrlRef.current = localBlob;
    setPreviewUrl(localBlob);

    // Start background optimization & upload
    setIsUploading(true);
    onUploadingChange?.(true);

    try {
      // 1. Client-side optimization: downscales large mobile/desktop photos to max 1280px WebP in ~30ms
      const compressed = await optimizeImage(file, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.85,
      });

      // 2. Upload to backend/storage
      const uploadedUrl = await uploadCourseImage(compressed);

      // 3. Update preview and form value with the permanent URL
      onChange(uploadedUrl);
      setCustomUrl(uploadedUrl);
      clearBlobUrl();
      setPreviewUrl(uploadedUrl);
      toast.success('تم رفع صورة الدورة بنجاح.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'فشل رفع الصورة. يرجى المحاولة مرة أخرى.';
      setUploadError(errMsg);
      toast.error(errMsg);
      // Keep local blob preview so user can inspect and click Retry
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFileProcess(file);
    }
    // Reset input value so re-selecting the exact same file works
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileProcess(file);
    }
  };

  const handleTriggerGallery = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (disabled || isUploading) return;
    galleryInputRef.current?.click();
  };

  const handleTriggerCamera = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (disabled || isUploading) return;
    cameraInputRef.current?.click();
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lastFileRef.current) {
      void handleFileProcess(lastFileRef.current);
    } else {
      handleTriggerGallery();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearBlobUrl();
    lastFileRef.current = null;
    setPreviewUrl(null);
    setCustomUrl('');
    setUploadError(null);
    onChange('');
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleApplyCustomUrl = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const trimmed = customUrl.trim();
    if (!trimmed) {
      handleRemove({ stopPropagation: () => {} } as React.MouseEvent);
      return;
    }

    if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/')) {
      toast.error('يرجى إدخال رابط يبدأ بـ http:// أو https://');
      return;
    }

    clearBlobUrl();
    lastFileRef.current = null;
    setUploadError(null);
    setPreviewUrl(trimmed);
    onChange(trimmed);
    toast.success('تم تحديث رابط الصورة.');
  };

  return (
    <div className="space-y-2">
      {/* Hidden file input for Photo Gallery / File Explorer */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={disabled || isUploading}
        onChange={handleInputChange}
      />

      {/* Hidden file input with capture="environment" for immediate Mobile Phone Camera */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled || isUploading}
        onChange={handleInputChange}
      />

      {/* Main Picker Card / Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!previewUrl ? () => handleTriggerGallery() : undefined}
        className={`relative overflow-hidden rounded-xl border-2 transition-all duration-200 ${
          isDragging
            ? 'border-brand-primary bg-brand-primary/10 scale-[0.99]'
            : previewUrl
            ? 'border-brand-border bg-brand-surface'
            : 'border-dashed border-brand-border bg-brand-bg/50 hover:border-brand-primary/60 hover:bg-brand-hover/40 cursor-pointer'
        }`}
      >
        {previewUrl ? (
          <div className="relative group">
            {/* Aspect-ratio container for crisp responsive preview on mobile & desktop */}
            <div className="relative aspect-video w-full overflow-hidden bg-brand-bg">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob: or uploaded remote URL needs native img preview */}
              <img
                src={previewUrl}
                alt="معاينة صورة الدورة"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                onError={() => {
                  setUploadError('تعذر عرض الصورة من هذا الرابط.');
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Uploading overlay */}
              {isUploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs text-white">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
                  <p className="mt-2 text-xs font-bold">جارٍ معالجة ورفع الصورة...</p>
                </div>
              )}

              {/* Status Badge */}
              <div className="absolute top-2.5 start-2.5 flex items-center gap-1.5 rounded-full bg-brand-surface/90 px-2.5 py-1 text-[11px] font-bold text-brand-text shadow-sm backdrop-blur-sm">
                <ImageIcon className="h-3.5 w-3.5 text-brand-primary" />
                <span>صورة الدورة</span>
              </div>

              {/* Overlay Action Buttons */}
              <div className="absolute bottom-2.5 inset-x-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleTriggerGallery}
                    disabled={disabled || isUploading}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-brand-surface/95 px-3 py-1.5 text-xs font-bold text-brand-text shadow-sm transition hover:bg-white hover:text-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isUploading ? 'animate-spin' : ''}`} />
                    <span>تغيير الصورة</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTriggerCamera}
                    disabled={disabled || isUploading}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-brand-surface/95 px-3 py-1.5 text-xs font-bold text-brand-text shadow-sm transition hover:bg-white hover:text-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50 sm:hidden"
                    title="التقاط بالكاميرا"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>الكاميرا</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={disabled || isUploading}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-red-600/90 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>إزالة</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State: Dedicated Mobile Phone & Desktop Triggers */
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary shadow-xs">
              <UploadCloud className="h-7 w-7" />
            </div>

            <p className="mt-3 text-sm font-bold text-brand-text">
              اختر صورة الدورة من وسائط جهازك
            </p>
            <p className="mt-1 text-xs text-brand-muted max-w-xs">
              من ألبوم الصور أو الكاميرا على الجوال، أو اسحب الملف هنا من جهاز الكمبيوتر
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              {/* Media Gallery / File Explorer button */}
              <button
                type="button"
                onClick={handleTriggerGallery}
                disabled={disabled || isUploading}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-brand-primary/90 focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50"
              >
                <ImageIcon className="h-4 w-4" />
                <span>معرض الصور / الوسائط</span>
              </button>

              {/* Direct Camera button (especially valuable on mobile phones) */}
              <button
                type="button"
                onClick={handleTriggerCamera}
                disabled={disabled || isUploading}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-brand-surface border border-brand-border px-4 py-2 text-xs font-bold text-brand-text shadow-xs transition hover:bg-brand-hover hover:border-brand-primary/40 focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50"
              >
                <Camera className="h-4 w-4 text-brand-primary" />
                <span>التقاط بالكاميرا</span>
              </button>
            </div>

            <span className="mt-2.5 text-[10px] text-brand-muted">
              يدعم PNG, JPG, WebP أو GIF (يتم ضغط الحجم فائقا وتلقائيا)
            </span>
          </div>
        )}
      </div>

      {/* Upload Error Notice with instant Retry */}
      {uploadError && (
        <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-500">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="font-bold underline hover:no-underline px-2 py-0.5"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Collapsible Direct URL Option */}
      <div className="pt-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowUrlInput((prev) => !prev);
          }}
          className="inline-flex items-center gap-1 text-[11px] text-brand-muted hover:text-brand-text transition"
        >
          <LinkIcon className="h-3 w-3" />
          <span>{showUrlInput ? 'إخفاء خيار رابط الصورة' : 'أو إدخال رابط صورة خارجي (URL)'}</span>
        </button>

        {showUrlInput && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/course-photo.jpg"
              className="flex-1 rounded-lg border border-brand-border bg-brand-bg px-3 py-1.5 text-xs text-brand-text outline-none focus:border-brand-primary"
              dir="ltr"
            />
            <button
              type="button"
              onClick={handleApplyCustomUrl}
              className="rounded-lg bg-brand-surface border border-brand-border px-3 py-1.5 text-xs font-bold text-brand-text hover:bg-brand-hover transition"
            >
              تطبيق
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
