// 文章编辑器页

import { createBackButton } from '../components/backButton.js';
import { AuthService } from '../utils/authService.js';

const DRAFT_KEY = 'editor-draft';

function renderEditorPage() {
  console.log('[路由] 编辑器');
  const app = document.getElementById('app');

  // 恢复草稿
  const draft = loadDraft();

  app.innerHTML = `
    <div class="editor-page">
      <div class="editor-header">
        <input type="text" class="editor-title-input" id="editor-title" placeholder="文章标题" value="${escapeAttr(draft.title)}">
        <input type="text" class="editor-tags-input" id="editor-tags" placeholder="标签（用逗号分隔）" value="${escapeAttr(draft.tags)}">
      </div>
      <div class="editor-main">
        <textarea class="editor-textarea" id="editor-textarea" placeholder="在此输入 Markdown 内容...">${escapeHtml(draft.content)}</textarea>
        <div class="editor-preview" id="editor-preview">
          <p class="editor-preview-hint">预览区域</p>
        </div>
      </div>
      <div class="editor-actions">
        <button class="editor-save-btn" id="editor-save-btn">保存文章</button>
      </div>
    </div>
  `;

  app.prepend(createBackButton());

  // 恢复草稿时也渲染预览
  const textarea = document.getElementById('editor-textarea');
  const preview = document.getElementById('editor-preview');
  if (draft.content) {
    preview.innerHTML = DOMPurify.sanitize(window.marked.parse(draft.content));
  }

  // 实时预览 + 自动保存草稿
  textarea.addEventListener('input', () => {
    const md = textarea.value.trim();
    if (md) {
      preview.innerHTML = DOMPurify.sanitize(window.marked.parse(md));
    } else {
      preview.innerHTML = '<p class="editor-preview-hint">预览区域</p>';
    }
    saveDraft();
  });

  // 标题和标签变化也保存草稿
  document.getElementById('editor-title').addEventListener('input', saveDraft);
  document.getElementById('editor-tags').addEventListener('input', saveDraft);

  // 保存
  document.getElementById('editor-save-btn').addEventListener('click', async () => {
    if (!AuthService.isLoggedIn()) {
      saveDraft();
      if (confirm('请先登录后再发布文章。是否跳转到登录页？')) {
        window.location.hash = '#/auth?returnTo=editor';
      }
      return;
    }

    const title = document.getElementById('editor-title').value.trim();
    const tagsStr = document.getElementById('editor-tags').value.trim();
    const content = textarea.value.trim();

    if (!title) {
      alert('请输入文章标题');
      return;
    }
    if (!content) {
      alert('请输入文章内容');
      return;
    }

    const tags = tagsStr ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean) : [];

    // 调用后端 API 保存
    try {
      const user = await AuthService.getMe();
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`,
        },
        body: JSON.stringify({ title, content, tags, status: 'published' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '保存失败');

      // 清除草稿
      clearDraft();
      alert('文章发布成功！');
      window.location.hash = '#/articles';
    } catch (err) {
      alert('保存失败: ' + err.message);
    }
  });
}

// ---------- 草稿管理 ----------
function saveDraft() {
  const title = document.getElementById('editor-title')?.value || '';
  const tags = document.getElementById('editor-tags')?.value || '';
  const content = document.getElementById('editor-textarea')?.value || '';
  // 只有有内容时才保存
  if (!title && !content) return;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title, tags, content }));
}

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : { title: '', tags: '', content: '' };
  } catch {
    return { title: '', tags: '', content: '' };
  }
}

function clearDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
}

export { renderEditorPage };
