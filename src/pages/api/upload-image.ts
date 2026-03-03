import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { nanoid } from "nanoid";
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	console.log(
		"Upload request received, Content-Type:",
		request.headers.get("content-type"),
	);
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File;

		if (!file) {
			return new Response(JSON.stringify({ error: "没有上传文件" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// 验证文件类型
		const allowedTypes = [
			"image/jpeg",
			"image/jpg",
			"image/png",
			"image/gif",
			"image/webp",
			"image/svg+xml",
		];
		if (!allowedTypes.includes(file.type)) {
			return new Response(JSON.stringify({ error: "不支持的图片格式" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// 从环境变量获取 R2 配置
		const R2_ACCESS_KEY_ID = import.meta.env.R2_ACCESS_KEY_ID;
		const R2_SECRET_ACCESS_KEY = import.meta.env.R2_SECRET_ACCESS_KEY;
		const R2_ENDPOINT = import.meta.env.R2_ENDPOINT;
		const R2_BUCKET_NAME = import.meta.env.R2_BUCKET_NAME;
		const PUBLIC_R2_URL = import.meta.env.PUBLIC_R2_URL;

		if (
			!R2_ACCESS_KEY_ID ||
			!R2_SECRET_ACCESS_KEY ||
			!R2_ENDPOINT ||
			!R2_BUCKET_NAME
		) {
			throw new Error("缺少 R2 配置");
		}

		const s3Client = new S3Client({
			region: "auto",
			endpoint: R2_ENDPOINT,
			credentials: {
				accessKeyId: R2_ACCESS_KEY_ID,
				secretAccessKey: R2_SECRET_ACCESS_KEY,
			},
		});

		// 生成 Key: year/month/day/uuid.webp
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, "0");
		const day = String(now.getDate()).padStart(2, "0");
		const filename = `${nanoid()}.webp`;
		const key = `${year}/${month}/${day}/${filename}`;

		// 读取原始图片并转换
		const buffer = Buffer.from(await file.arrayBuffer());
		const webpBuffer = await sharp(buffer).webp({ quality: 75 }).toBuffer();

		// 上传到 R2
		const putCmd = new PutObjectCommand({
			Bucket: R2_BUCKET_NAME,
			Key: key,
			Body: webpBuffer,
			ContentType: "image/webp",
		});

		await s3Client.send(putCmd);

		// 返回图片绝对 URL
		const imageUrl = `${PUBLIC_R2_URL}/${key}`;
		return new Response(JSON.stringify({ url: imageUrl }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("图片上传失败:", error);
		return new Response(JSON.stringify({ error: "上传失败" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
