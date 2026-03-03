import React, { useEffect, useMemo, useRef, useState, Component, type ReactNode } from "react";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import toast, { Toaster } from "react-hot-toast";
// 移除了 ImageUploader 导入

// 简单的错误边界组件
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("BlogEditor Error Boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-600 bg-red-50 h-screen">
          <h2 className="text-xl font-bold mb-4">编辑器渲染发生错误</h2>
          <p className="mb-4">请将以下错误信息截图反馈：</p>
          <pre className="bg-white p-4 rounded border border-red-200 overflow-auto text-sm font-mono whitespace-pre-wrap">
            {this.state.error?.toString()}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

interface BlogData {
  title: string;
  description: string;
  date: string;
  image: string;
  categories: string[];
  author: string;
  tags: string[];
  draft: boolean;
  meta_title?: string;
}

interface Props {
  slug: string;
}

type TextAreaTextApi = {
  replaceSelection: (text: string) => void;
};

const BlogEditor: React.FC<Props> = ({ slug }) => {
  const [data, setData] = useState<BlogData | null>(null);
  const [content, setContent] = useState("");
  const [fileType, setFileType] = useState("md");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentSlug, setCurrentSlug] = useState(slug);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [editorHeight, setEditorHeight] = useState(600);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorApiRef = useRef<TextAreaTextApi | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);



  useEffect(() => {
    console.log("[BlogEditor] Initializing with slug:", slug);
    const fetchData = async () => {
      try {
        // 尝试从 sessionStorage 获取预加载的数据
        const cachedDataStr = sessionStorage.getItem("new-post-data");
        if (cachedDataStr) {
          try {
            const cached = JSON.parse(cachedDataStr);
            if (cached.slug === slug) {
              console.log("[BlogEditor] Using cached data from sessionStorage");
              setData({
                ...cached.data,
                draft: cached.data.draft ?? false,
                categories: cached.data.categories ?? [],
                tags: cached.data.tags ?? []
              });
              setContent(cached.content);
              setFileType(cached.fileType);
              setLoading(false);
              // 使用后清除缓存
              sessionStorage.removeItem("new-post-data");
              return;
            }
          } catch (e) {
            console.error("[BlogEditor] Failed to parse cached data", e);
          }
        }

        console.log("[BlogEditor] Fetching data...");
        const res = await fetch(`/api/posts/${slug}`);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
        const json = await res.json();
        console.log("[BlogEditor] Data fetched:", json);
        setData({
          ...json.data,
          draft: json.data.draft ?? false,
          categories: json.data.categories ?? [],
          tags: json.data.tags ?? []
        });
        setContent(json.content);
        setFileType(json.fileType);
      } catch (error) {
        console.error("[BlogEditor] Fetch failed:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateHeight = () => {
      const headerHeight = headerRef.current?.offsetHeight ?? 64;
      setEditorHeight(Math.max(200, window.innerHeight - headerHeight));
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, content, fileType, newSlug: currentSlug }),
      });
      if (res.ok) {
        toast.success("保存成功");
        // 如果 slug 发生变更，跳转到新的编辑页面 URL
        if (currentSlug !== slug) {
          window.location.href = `/admin/edit/${currentSlug}`;
        } else {
          // slug 未变更，跳转到博客页面
          window.location.href = `/blog/${currentSlug}`;
        }
      } else {
        const json = await res.json();
        toast.error(json.error || "保存失败");
      }
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("保存出错");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof BlogData, value: any) => {
    if (!data) return;
    setData({ ...data, [field]: value });
  };

  // 处理图片上传（支持粘贴图片）
  const onUploadImg = async (files: File[], callback: (urls: string[]) => void) => {
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          throw new Error('上传失败');
        }

        const data = await res.json();
        return data.url;
      });

      const urls = await Promise.all(uploadPromises);
      callback(urls);
    } catch (error) {
      console.error('图片上传失败:', error);
      toast.error('图片上传失败，请重试');
    }
  };

  const insertMarkdown = (markdown: string, selection?: { start: number; end: number }) => {
    if (selection) {
      setContent((prev) => `${prev.slice(0, selection.start)}${markdown}${prev.slice(selection.end)}`);
      return;
    }
    if (editorApiRef.current) {
      editorApiRef.current.replaceSelection(markdown);
      return;
    }
    setContent((prev) => (prev ? `${prev}\n${markdown}` : markdown));
  };

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await onUploadImg(Array.from(files), (urls) => {
      const markdown = urls.map((url) => `![image](${url})`).join("\n");
      insertMarkdown(markdown);
    });
  };

  const handlePaste: React.ClipboardEventHandler<HTMLTextAreaElement> = (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file && file.type.startsWith("image/")) files.push(file);
      }
    }
    if (files.length === 0) return;
    event.preventDefault();
    const selection = {
      start: event.currentTarget.selectionStart ?? content.length,
      end: event.currentTarget.selectionEnd ?? content.length,
    };
    void onUploadImg(files, (urls) => {
      const markdown = urls.map((url) => `![image](${url})`).join("\n");
      insertMarkdown(markdown, selection);
    });
  };

  const uploadImageCommand = useMemo(
    () => ({
      name: "upload-image",
      keyCommand: "upload-image",
      buttonProps: { "aria-label": "上传图片" },
      icon: <span className="text-xs font-semibold">Img</span>,
      execute: (_state: unknown, api: TextAreaTextApi) => {
        editorApiRef.current = api;
        fileInputRef.current?.click();
      },
    }),
    []
  );

  const extraCommands = useMemo(() => [uploadImageCommand], [uploadImageCommand]);

  if (loading) return <div className="p-8">加载中...</div>;
  if (!data) return <div className="p-8 text-red-500 font-bold">文章不存在或加载失败</div>;

  console.log("[BlogEditor] Rendering editor. Content length:", content.length);

  return (
    <ErrorBoundary>
      <Toaster position="top-right" reverseOrder={false} />
      <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-gray-50" data-color-mode="light">
        {/* 顶部工具栏 */}
        <header
          ref={headerRef}
          className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm z-20"
        >
          <div className="flex items-center gap-4">
            <a href="/admin" className="text-gray-500 hover:text-primary transition-colors text-sm font-medium">
              ← 返回
            </a>
          </div>




          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-6 py-2 rounded-lg font-medium shadow-md transition-all active:scale-95 ${
                saving ? "bg-gray-300 pointer-events-none" : "bg-primary hover:bg-opacity-90 text-white"
              }`}
            >
              {saving ? "正在保存..." : "保存"}
            </button>
          </div>
        </header>

        {/* 主编辑区域 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 编辑器 */}
          <div className="flex-1 overflow-hidden">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                void handleImageFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />
            <MDEditor
              value={content}
              onChange={(value) => setContent(value || "")}
              preview="live"
              height={editorHeight}
              textareaProps={{ placeholder: "开始编写文章内容...", onPaste: handlePaste }}
              extraCommands={extraCommands}
              highlightEnable={false}
            />
          </div>

          {/* 右侧边栏 */}
          <div className={`bg-white border-l border-gray-200 transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? "w-12" : "w-80"
          } shrink-0 overflow-hidden`}>
            {/* 折叠按钮 */}
            <div className="h-full flex flex-col">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-3 hover:bg-gray-100 transition-colors border-b border-gray-200 flex items-center justify-center"
                title={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
              >
                <span className="text-gray-600 text-lg">
                  {sidebarCollapsed ? "←" : "→"}
                </span>
              </button>

              {/* 侧边栏内容 */}
              {!sidebarCollapsed && (
                <div className="flex-1 overflow-y-auto p-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-4">文章元数据</h3>

                  <div className="space-y-4">
                    {/* 标题 */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-600">标题</label>
                      <input
                        type="text"
                        value={data.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        className="border border-gray-300 px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        placeholder="文章标题"
                      />
                    </div>

                    {/* 封面图功能已移除 */}

                    {/* 描述 */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-600">描述</label>
                      <textarea
                        value={data.description}
                        onChange={(e) => updateField("description", e.target.value)}
                        rows={3}
                        className="border border-gray-300 px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                        placeholder="文章描述"
                      />
                    </div>

                    {/* 日期 */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-600">日期</label>
                      <input
                        type="text"
                        value={data.date ? String(data.date).split("T")[0] : ""}
                        onChange={(e) => updateField("date", e.target.value)}
                        placeholder="YYYY-MM-DD"
                        className="border border-gray-300 px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Slug */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-600">Slug</label>
                      <input
                        type="text"
                        value={currentSlug}
                        onChange={(e) => setCurrentSlug(e.target.value)}
                        className="border border-gray-300 px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        placeholder="文章 URL 标识"
                      />
                    </div>

                    {/* 分类 */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-600">分类</label>
                      <input
                        type="text"
                        defaultValue={data.categories?.join(", ") || ""}
                        onBlur={(e) =>
                          updateField(
                            "categories",
                            e.target.value.split(/[,，]\s*/).filter(Boolean)
                          )
                        }
                        className="border border-gray-300 px-3 py-2 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        placeholder="多个分类用逗号分隔"
                      />
                    </div>




                    {/* 草稿 */}
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="draft-checkbox"
                        checked={data.draft}
                        onChange={(e) => updateField("draft", e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary cursor-pointer"
                      />
                      <label htmlFor="draft-checkbox" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                        保存为草稿
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default BlogEditor;
