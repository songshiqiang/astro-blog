# 使用方法
```
pnpm install
pnpm dev
```
# 完成自己的配置
按需修改一下文件
```
src/config/config.json
src/config/menu.json
src/config/social.json
.env
```
# 构建项目
`pnpm build`

# 部署到 Cloudflare Pages
`npx wrangler pages deploy dist`

# contact form
contact 页面使用了Formspree进行邮件转发，如果你想用自己的邮箱接收留言，请去 Formspree 注册自己的账号并更换 src/config/config.json 中的contact_form_action 地址。

# 示例网站

https://songxiaoman.com

示例网站首页是我自己 vibe coding的，你也需要 vibe coding成你想要的样子

# 博客后台管理页面
![博客列表页](/public/images/astro-blog-1.png)

# 博客编辑页面  
![博客编辑页](/public/images/astro-blog-2.png)
