import React, { useEffect, useState } from "react";
import ConfirmModal from "./ConfirmModal";

interface Post {
  slug: string;
  title: string;
  date?: string;
  draft: boolean;
}

const AdminPosts: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; slug: string | null }>({
    isOpen: false,
    slug: null,
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/posts");
      const data = await res.json();
      setPosts(data);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const slug = deleteConfirm.slug;
    if (!slug) return;

    try {
      const res = await fetch(`/api/posts/${slug}`, { method: "DELETE" });
      if (res.ok) {
        setPosts(posts.filter((p) => p.slug !== slug));
        setDeleteConfirm({ isOpen: false, slug: null });
      } else {
        alert("删除失败");
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleCreate = async () => {
    const timestamp = Date.now();
    const title = "未命名博客";
    const finalSlug = `untitled-${timestamp}`;

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug: finalSlug }),
      });
      if (res.ok) {
        const data = await res.json();
        // 将新建的数据存入 sessionStorage 以优化重定向加载
        sessionStorage.setItem("new-post-data", JSON.stringify(data));
        window.location.href = `/admin/edit/${finalSlug}`;
      } else {
        const data = await res.json();
        alert(data.error || "创建失败");
      }
    } catch (error) {
      console.error("Create failed:", error);
    }
  };

  if (loading) return <div className="p-8">加载中...</div>;

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">博客管理</h1>
        <button
          onClick={handleCreate}
          className="bg-primary hover:bg-opacity-90 text-white px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95 font-medium flex items-center gap-2"
        >
          <span className="text-xl">+</span> 新建博客
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 font-semibold text-gray-600 uppercase text-xs tracking-wider">标题</th>
              <th className="px-6 py-4 font-semibold text-gray-600 uppercase text-xs tracking-wider">日期</th>
              <th className="px-6 py-4 font-semibold text-gray-600 uppercase text-xs tracking-wider">状态</th>
              <th className="px-6 py-4 font-semibold text-gray-600 uppercase text-xs tracking-wider text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {posts.map((post) => (
              <tr key={post.slug} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-4 font-medium text-gray-800">{post.title}</td>
                <td className="px-6 py-4 text-gray-500 text-sm">
                  {post.date ? new Date(post.date).toLocaleDateString() : "无日期"}
                </td>
                <td className="px-6 py-4">
                  {post.draft ? (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">草稿</span>
                  ) : (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">发布</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right space-x-3">
                  <a
                    href={`/admin/edit/${post.slug}`}
                    className="text-primary hover:underline font-medium decoration-2 underline-offset-4"
                  >
                    编辑
                  </a>
                  <button
                    onClick={() => setDeleteConfirm({ isOpen: true, slug: post.slug })}
                    className="text-red-500 hover:text-red-700 font-medium transition-colors opacity-0 group-hover:opacity-100"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="确认删除"
        message={`确定要删除博客 "${deleteConfirm.slug}" 吗？此操作不可撤销。`}
        confirmText="彻底删除"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, slug: null })}
      />
    </div>
  );
};

export default AdminPosts;
