
/**
 * 获取图片的 URL
 * 在开发环境下返回本地路径，在生产环境下返回 R2 的公网 URL
 * @param path 原始路径，例如 "/images/logo.png"
 * @returns 最终的图片 URL
 */
export default function getImageUrl(path: string): string {
    if (!path) return "";

    // 如果路径已经是完整的 URL，直接返回
    if (path.startsWith("http") || path.startsWith("//")) {
        return path;
    }

    // 确定路径以 / 开头
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    // 开发环境下使用本地路径
    if (import.meta.env.DEV) {
        return normalizedPath;
    }

    // 生产环境下使用 R2 域名
    const r2BaseUrl = import.meta.env.PUBLIC_R2_URL || "https://pub-dbf7703c0c5261c757ed01b16b963f3b.r2.dev";

    // 自 R2 移除 'public' 目录后，直接拼接 normalizedPath 即可
    // normalizedPath 已经是以 / 开头的，例如 /images/logo.png
    return `${r2BaseUrl}${normalizedPath}`;
}
