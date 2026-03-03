import React, { useRef, useState, useEffect } from 'react';

interface ImageUploaderProps {
  /** 上传成功后的回调函数，返回图片 URL */
  onUploadSuccess?: (url: string) => void;
  /** 上传失败后的回调函数 */
  onUploadError?: (error: string) => void;
  /** 自定义上传 API 端点，默认为 /api/upload-image */
  uploadEndpoint?: string;
  /** 自定义类名 */
  className?: string;
  /** 是否显示已上传的图片预览 */
  showPreview?: boolean;
  /** 最大文件大小（MB），默认 10MB */
  maxSizeMB?: number;
  /** 当前图片 URL（用于显示已有图片） */
  currentImageUrl?: string;
  /** 删除图片的回调函数 */
  onDelete?: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUploadSuccess,
  onUploadError,
  uploadEndpoint = '/api/upload-image',
  className = '',
  showPreview = true,
  maxSizeMB = 10,
  currentImageUrl = '',
  onDelete,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // 移除自动清除逻辑，让本地 Blob URL 预览更持久，防止同步延迟导致的 404
  // 只有当重新上传时，通过 uploadFile 才会覆盖 uploadedUrl
  useEffect(() => {
    // 仅在组件初次挂载时或者当 currentImageUrl 变成空（删除图片）时处理
    if (!currentImageUrl) {
      setUploadedUrl('');
    }
  }, [currentImageUrl]);

  // 处理文件上传
  const uploadFile = async (file: File) => {
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      const errorMsg = '不支持的图片格式，请上传 JPG、PNG、GIF、WebP 或 SVG 格式的图片';
      setError(errorMsg);
      onUploadError?.(errorMsg);
      return;
    }

    // 验证文件大小
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const errorMsg = `图片大小不能超过 ${maxSizeMB}MB`;
      setError(errorMsg);
      onUploadError?.(errorMsg);
      return;
    }

    setIsUploading(true);
    setError('');

    // 创建本地预览 URL，确保无论服务器是否延迟同步，用户都能立即看到图片
    const localPreviewUrl = URL.createObjectURL(file);
    setUploadedUrl(localPreviewUrl);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('上传失败');
      }

      const data = await res.json();
      // 上传成功后保持 localPreviewUrl 或使用后端返回的 URL
      // 这里我们已经设置过 setUploadedUrl(localPreviewUrl) 了，
      // 其实可以继续用本地的，直到页面刷新或者 currentImageUrl 盖过它。
      onUploadSuccess?.(data.url);
    } catch (err) {
      const errorMsg = '图片上传失败，请重试';
      setError(errorMsg);
      onUploadError?.(errorMsg);
      // 如果上传失败，清除本地预览
      setUploadedUrl('');
      console.error('上传错误:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  // 处理拖拽事件
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  // 处理粘贴事件
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          uploadFile(file);
          e.preventDefault();
        }
        break;
      }
    }
  };

  // 移除全局粘贴监听，改为在元素上使用 onPaste

  // 点击上传区域触发文件选择
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // 确定要显示的图片 URL
  // 优先显示本地 Blob URL (uploadedUrl)，因为它无延迟且不会 404
  // 仅在没有本地预览时显示远程 URL (currentImageUrl)
  const displayImageUrl = uploadedUrl || currentImageUrl;

  return (
    <div className={`image-uploader ${className}`}>
      {/* 上传区域 */}
      <div
        ref={dropZoneRef}
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className={`
          relative border-2 border-dashed rounded-lg text-center cursor-pointer
          transition-all duration-200 ease-in-out overflow-hidden h-32 flex items-center justify-center
          ${displayImageUrl ? 'p-0 border-gray-300' : 'p-8'}
          ${isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-gray-300 hover:border-primary hover:bg-gray-50'
          }
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* 如果有当前图片或刚上传的图片，显示预览 */}
        {displayImageUrl ? (
          <div className="relative group w-full h-full">
            <img
              src={displayImageUrl}
              alt="封面图预览"
              className="w-full h-full object-cover rounded-md"
            />
            {/* 悬停遮罩层 */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
              <p className="text-white text-sm font-medium">点击重新上传</p>
            </div>
          </div>
        ) : (
          /* 没有图片时显示上传提示 */
          <div className="flex flex-col items-center gap-3">
            {isUploading ? (
              <>
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-600 font-medium">正在上传...</p>
              </>
            ) : (
              <>
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <div className="text-sm text-gray-600">

                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        </div>
      )}

      {/* 图片预览 */}
      {showPreview && uploadedUrl && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-green-700 font-medium mb-2">上传成功！</p>
              <div className="bg-white rounded-lg p-2 border border-green-200">
                <img
                  src={uploadedUrl}
                  alt="上传的图片"
                  className="max-w-full h-auto rounded max-h-48 mx-auto"
                />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={uploadedUrl}
                  readOnly
                  className="flex-1 px-2 py-1 text-xs bg-white border border-green-200 rounded font-mono"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(uploadedUrl);
                  }}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  复制
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
