# Project File & Directory Overview

This document explains the function of every file and directory in the project, in simple and concise terms.

---

## Root Directory

- **README.md** — Project overview and instructions.
- **LICENSE.txt** — License for the project.
- **package.json** — Project dependencies and scripts.
- **package-lock.json** — Exact dependency versions for reproducible installs.
- **tsconfig.json** — TypeScript configuration.
- **tailwind.config.ts** — Tailwind CSS configuration.
- **postcss.config.mjs** — PostCSS configuration for CSS processing.
- **next.config.mjs** — Next.js configuration.
- **.gitignore** — Files and folders to ignore in git.
- **.eslintrc.json** — ESLint configuration for code linting.
- **.prettierrc** — Prettier configuration for code formatting.
- **components.json** — List of UI components (for shadcn/ui).

---

## /docs
- **files.md** — This file! Explains the function of every file and directory.

---

## /public
- **/*.png, *.jpg, *.svg, *.pdf** — Static assets (images, resume, etc.) used throughout the site.

---

## /scripts
- **generate.ts** — Script to generate vector embeddings for all site content, used by the AI chat assistant.

---

## /content
- **/*.mdx** — Blog posts written in MDX (Markdown + React components).

---

## /src

### /src/app
- **layout.tsx** — Root layout for all pages (header, footer, theme, etc.).
- **globals.css** — Global CSS styles.
- **not-found.tsx** — Custom 404 page.
- **favicon.ico** — Site favicon.
- **page.tsx** — Homepage content and layout.

#### /src/app/api
- **/chat/route.ts** — API route for the AI chat assistant (handles chat requests).

#### /src/app/blog
- **page.tsx** — Blog index page (lists all posts).
- **/[slug]/page.tsx** — Dynamic page for each blog post.

#### /src/app/contact
- **page.tsx** — Contact page with the contact form.

#### /src/app/privacy
- **page.tsx** — Privacy policy page.

#### /src/app/projects
- **page.tsx** — Projects showcase page.

---

### /src/components
- **Header.tsx** — Site navigation bar.
- **Footer.tsx** — Site footer.
- **Providers.tsx** — Wraps app with context providers (theme, chat, etc.).
- **ThemeToggle.tsx** — Button to switch between dark and light mode.
- **Chat.tsx** — Main chat UI component.
- **ChatHeader.tsx, ChatInput.tsx, ChatMessages.tsx, ChatMessage.tsx** — Subcomponents for the chat feature.
- **ChatToggle.tsx** — Button to open/close the chat.
- **ContactForm.tsx** — Contact form component.
- **Experience.tsx** — Displays work experience.
- **Projects.tsx, ProjectCard.tsx** — Displays project list and individual project cards.
- **Posts.tsx, PostsWithSearch.tsx** — Displays blog posts and search functionality.
- **LinkWithIcon.tsx** — Link component with an icon.
- **Socials.tsx** — Social media links.
- **Timeline.tsx, TimelineItem.tsx** — Timeline UI for experience/education.
- **MDXContent.tsx** — Renders MDX blog content.
- **Counter.tsx** — Example interactive component for MDX.
- **Icon.tsx** — SVG icon component.

#### /src/components/ui
- **Accordion.tsx, AlertDialog.tsx, Avatar.tsx, Badge.tsx, Button.tsx, Card.tsx, Input.tsx, Separator.tsx, Sonner.tsx, Tabs.tsx, Textarea.tsx** — Reusable UI components (inputs, dialogs, cards, etc.).

#### /src/components/email
- **ContactFormEmail.tsx** — Email template for contact form submissions.

---

### /src/contexts
- **ChatContext.tsx** — React context for managing chat UI state.

---

### /src/data
- **career.json** — Work experience data.
- **education.json** — Education history data.
- **projects.json** — Projects data for the portfolio.
- **socials.json** — Social media links data.

---

### /src/lib
- **actions.ts** — Server actions (e.g., send email from contact form).
- **posts.ts** — Functions to load and parse blog posts.
- **schemas.ts** — Zod schemas for form validation.
- **utils.ts** — Utility functions (e.g., date formatting).
- **vectordb.ts** — Connects to AstraDB and manages vector embeddings for AI chat.

--- 