import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import yaml from "js-yaml";

export const prerender = false;

const BLOG_DIR = path.join(process.cwd(), "src/content/blog");

export const GET: APIRoute = async ({ params }) => {
    try {
        const { slug } = params;
        if (!slug) return new Response("Slug required", { status: 400 });

        const mdPath = path.join(BLOG_DIR, `${slug}.md`);
        const mdxPath = path.join(BLOG_DIR, `${slug}.mdx`);

        let filePath = "";
        try {
            await fs.access(mdPath);
            filePath = mdPath;
        } catch {
            try {
                await fs.access(mdxPath);
                filePath = mdxPath;
            } catch {
                return new Response("Post not found", { status: 404 });
            }
        }

        const content = await fs.readFile(filePath, "utf-8");
        const parsed = matter(content);

        return new Response(
            JSON.stringify({
                data: parsed.data,
                content: parsed.content,
                fileType: filePath.endsWith(".md") ? "md" : "mdx",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
};

export const PUT: APIRoute = async ({ params, request }) => {
    try {
        const { slug } = params;
        const body = await request.json();
        const { data, content, fileType, newSlug } = body;

        let currentSlug = slug;

        // Handle renaming if newSlug is provided and different
        if (newSlug && newSlug !== slug) {
            const oldFilePathStr = `${slug}.${fileType || "md"}`;
            const newFilePathStr = `${newSlug}.${fileType || "md"}`;
            const oldPath = path.join(BLOG_DIR, oldFilePathStr);
            const newPath = path.join(BLOG_DIR, newFilePathStr);

            // Check if new file already exists
            try {
                await fs.access(newPath);
                return new Response(JSON.stringify({ error: "Filename already exists" }), { status: 409 });
            } catch {
                // File doesn't exist, safe to rename
                // First check if old file exists (it could be .md or .mdx, but frontend sends fileType)
                try {
                    await fs.access(oldPath);
                    await fs.rename(oldPath, newPath);
                    currentSlug = newSlug;
                } catch (e) {
                    return new Response(JSON.stringify({ error: "Original file not found" }), { status: 404 });
                }
            }
        }

        const fileName = `${currentSlug}.${fileType || "md"}`;
        const filePath = path.join(BLOG_DIR, fileName);

        // 确保 date 是 Date 对象，避免 js-yaml 加上引号
        if (data.date) {
            data.date = new Date(data.date);
        }

        // 将 data 转回 YAML 格式
        const frontmatter = yaml.dump(data).replace(/(date: )(\d{4}-\d{2}-\d{2})T[^\n]*/g, '$1$2');
        const fullContent = `---\n${frontmatter}---\n\n${content}`;

        await fs.writeFile(filePath, fullContent, "utf-8");

        return new Response(JSON.stringify({ message: "Post updated successfully", newSlug: currentSlug }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
};

export const DELETE: APIRoute = async ({ params }) => {
    try {
        const { slug } = params;

        const mdPath = path.join(BLOG_DIR, `${slug}.md`);
        const mdxPath = path.join(BLOG_DIR, `${slug}.mdx`);

        try {
            await fs.unlink(mdPath);
        } catch {
            try {
                await fs.unlink(mdxPath);
            } catch {
                return new Response("Post not found", { status: 404 });
            }
        }

        return new Response(JSON.stringify({ message: "Post deleted successfully" }), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
};
