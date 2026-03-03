import type { APIRoute } from "astro";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export const prerender = false;

const BLOG_DIR = path.join(process.cwd(), "src/content/blog");

export const GET: APIRoute = async () => {
    try {
        const files = await fs.readdir(BLOG_DIR);
        const posts = await Promise.all(
            files
                .filter((file) => file.endsWith(".md") || file.endsWith(".mdx"))
                .map(async (file) => {
                    const filePath = path.join(BLOG_DIR, file);
                    const content = await fs.readFile(filePath, "utf-8");
                    const { data } = matter(content);
                    return {
                        slug: file.replace(/\.(md|mdx)$/, ""),
                        title: data.title || file,
                        date: data.date,
                        draft: !!data.draft,
                    };
                })
        );

        // 按日期排序
        posts.sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
        });

        return new Response(JSON.stringify(posts), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { title, slug } = body;

        if (!title || !slug) {
            return new Response(JSON.stringify({ error: "Title and slug are required" }), {
                status: 400,
            });
        }

        const fileName = `${slug}.md`;
        const filePath = path.join(BLOG_DIR, fileName);

        // 检查文件是否已存在
        try {
            await fs.access(filePath);
            return new Response(JSON.stringify({ error: "Post with this slug already exists" }), {
                status: 400,
            });
        } catch {
            // 文件不存在，可以创建
        }

        const initialContent = `---
title: "${title}"
description: ""
date: ${new Date().toISOString()}
image: "/images/image-placeholder.png"
categories: []
author: "Admin"
tags: []
draft: false
---

开始编写你的博客内容...
`;

        await fs.writeFile(filePath, initialContent, "utf-8");
        const { data, content } = matter(initialContent);

        return new Response(
            JSON.stringify({
                message: "Post created successfully",
                slug,
                data,
                content,
                fileType: "md",
            }),
            {
                status: 201,
            }
        );
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
        });
    }
};
