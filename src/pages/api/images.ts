export const prerender = false;

import fs from 'fs';
import path from 'path';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
    try {
        const blogImagesDir = path.join(process.cwd(), 'public', 'images', 'blog');

        // 确保目录存在
        if (!fs.existsSync(blogImagesDir)) {
            fs.mkdirSync(blogImagesDir, { recursive: true });
            return new Response(JSON.stringify([]), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 读取目录下的所有文件
        const files = fs.readdirSync(blogImagesDir);

        // 过滤出图片文件
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const images = files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return imageExtensions.includes(ext);
            })
            .map(file => `/images/blog/${file}`);

        return new Response(JSON.stringify(images), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error reading blog images:', error);
        return new Response(JSON.stringify({ error: 'Failed to read images' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
