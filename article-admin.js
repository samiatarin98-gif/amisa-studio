
const $ = id => document.getElementById(id);

let db = null;
let articles = [];
let editingImage = '';

const configured = () =>
  window.AMISA_CONFIG &&
  window.AMISA_CONFIG.supabaseUrl.startsWith('https://') &&
  window.AMISA_CONFIG.supabaseAnonKey.length > 20 &&
  !window.AMISA_CONFIG.supabaseUrl.includes('PASTE_');

function message(id, text) {
  $(id).textContent = text || '';
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function makeSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// Allow only safe formatting in published article content.
function cleanContent(html) {
  const allowed = new Set([
    'P', 'H2', 'H3', 'STRONG', 'B', 'EM', 'I',
    'UL', 'OL', 'LI', 'A', 'BLOCKQUOTE', 'BR'
  ]);

  const doc = new DOMParser().parseFromString(html, 'text/html');

  function cleanNode(node) {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        return;
      }

      if (child.nodeType !== Node.ELEMENT_NODE) return;

      if (!allowed.has(child.tagName)) {
        child.replaceWith(...child.childNodes);
        return;
      }

      [...child.attributes].forEach(attribute => {
        if (child.tagName !== 'A' || attribute.name !== 'href') {
          child.removeAttribute(attribute.name);
        }
      });

      if (child.tagName === 'A') {
        const href = child.getAttribute('href') || '';

        try {
          const url = new URL(href, window.location.origin);

          if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
            child.removeAttribute('href');
          } else {
            child.setAttribute('href', url.href);
            child.setAttribute('target', '_blank');
            child.setAttribute('rel', 'noopener noreferrer');
          }
        } catch {
          child.removeAttribute('href');
        }
      }

      cleanNode(child);
    });
  }

  cleanNode(doc.body);
  return doc.body.innerHTML;
}

function showDashboard() {
  $('loginPanel').hidden = true;
  $('dashboard').hidden = false;
  loadArticles();
}

async function checkSession() {
  if (!configured()) {
    message('loginMessage', 'Website configuration could not be loaded.');
    return;
  }

  db = window.supabase.createClient(
    window.AMISA_CONFIG.supabaseUrl,
    window.AMISA_CONFIG.supabaseAnonKey
  );

  const { data, error } = await db.auth.getSession();

  if (error) {
    message('loginMessage', 'Could not check your login session.');
    return;
  }

  if (data.session) showDashboard();
}

$('loginForm').addEventListener('submit', async event => {
  event.preventDefault();

  message('loginMessage', 'Signing in...');

  const { error } = await db.auth.signInWithPassword({
    email: $('email').value.trim(),
    password: $('password').value
  });

  if (error) {
    message('loginMessage', 'Login failed. Check your email and password.');
    return;
  }

  message('loginMessage', '');
  showDashboard();
});

$('logout').addEventListener('click', async () => {
  await db.auth.signOut();
  $('dashboard').hidden = true;
  $('loginPanel').hidden = false;
  $('password').value = '';
  message('loginMessage', 'You have signed out.');
});

async function loadArticles() {
  message('formMessage', 'Loading articles...');

  const { data, error } = await db
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    message('formMessage', 'Could not load articles: ' + error.message);
    return;
  }

  articles = data || [];
  renderArticles();
  message('formMessage', '');
}

function getImageUrl(path) {
  if (!path) return '';

  return db.storage
    .from('article-images')
    .getPublicUrl(path).data.publicUrl;
}

function renderArticles() {
  const container = $('articleList');

  if (!articles.length) {
    container.innerHTML = '<p>No articles yet. Create your first article above.</p>';
    return;
  }

  container.innerHTML = articles.map(article => `
    <div class="admin-item">
      ${article.image_path
        ? `<img class="admin-thumb" src="${escapeHTML(getImageUrl(article.image_path))}" alt="">`
        : ''}
      <div class="admin-info">
        <b>${escapeHTML(article.title)}</b>
        <small>${escapeHTML(article.category || 'Lifestyle')} · ${escapeHTML(article.status || 'draft')}</small>
        <small>/articles/${escapeHTML(article.slug)}</small>
      </div>
      <div class="admin-actions">
        <button type="button" data-edit="${escapeHTML(article.id)}">Edit</button>
        <button type="button" data-delete="${escapeHTML(article.id)}">Delete</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('[data-edit]').forEach(button => {
    button.addEventListener('click', () => editArticle(button.dataset.edit));
  });

  container.querySelectorAll('[data-delete]').forEach(button => {
    button.addEventListener('click', () => deleteArticle(button.dataset.delete));
  });
}

function resetForm() {
  $('articleForm').reset();
  $('articleId').value = '';
  $('editor').innerHTML = '';
  editingImage = '';
  $('image').value = '';
  $('title').focus();
  message('formMessage', '');
}

function editArticle(id) {
  const article = articles.find(item => String(item.id) === String(id));
  if (!article) return;

  $('articleId').value = article.id;
  $('title').value = article.title || '';
  $('category').value = article.category || 'Lifestyle';
  $('excerpt').value = article.excerpt || '';
  $('editor').innerHTML = cleanContent(article.content || '');

  editingImage = article.image_path || '';
  $('image').value = '';

  message('formMessage', 'Editing article: ' + article.title);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function uploadCover(file) {
  if (!file) return editingImage;

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Please choose a JPG, PNG or WebP image.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Please choose an image smaller than 5 MB.');
  }

  const extension = file.name.split('.').pop().toLowerCase();
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await db.storage
    .from('article-images')
    .upload(path, file, {
      upsert: false,
      contentType: file.type
    });

  if (error) throw error;

  return path;
}

async function uniqueSlug(title, currentId) {
  const base = makeSlug(title);

  if (!base) {
    throw new Error('Please enter a title containing letters or numbers.');
  }

  let slug = base;
  let number = 2;

  while (true) {
    let query = db
      .from('articles')
      .select('id')
      .eq('slug', slug);

    if (currentId) query = query.neq('id', currentId);

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    if (!data) return slug;

    slug = `${base}-${number++}`;
  }
}

async function saveArticle(status) {
  const title = $('title').value.trim();
  const excerpt = $('excerpt').value.trim();
  const content = cleanContent($('editor').innerHTML);

  if (!title || !excerpt || !content.trim()) {
    message('formMessage', 'Please complete the title, short description and article content.');
    return;
  }

  const id = $('articleId').value;
  const oldArticle = articles.find(item => String(item.id) === String(id));

  $('draftButton').disabled = true;
  $('publishButton').disabled = true;
  message('formMessage', 'Saving article...');

  try {
    const slug = await uniqueSlug(title, id);
    const image_path = await uploadCover($('image').files[0]);

    const row = {
      title,
      slug,
      category: $('category').value,
      excerpt,
      content,
      image_path: image_path || null,
      status,
      published_at: status === 'published'
        ? (oldArticle?.published_at || new Date().toISOString())
        : null,
      updated_at: new Date().toISOString()
    };

    const result = id
      ? await db.from('articles').update(row).eq('id', id)
      : await db.from('articles').insert(row);

    if (result.error) throw result.error;

    message(
      'formMessage',
      status === 'published'
        ? 'Article published successfully!'
        : 'Draft saved successfully!'
    );

    resetForm();
    await loadArticles();

  } catch (error) {
    message('formMessage', 'Could not save article: ' + error.message);
  } finally {
    $('draftButton').disabled = false;
    $('publishButton').disabled = false;
  }
}

$('articleForm').addEventListener('submit', event => {
  event.preventDefault();
  saveArticle('draft');
});

$('publishButton').addEventListener('click', () => {
  saveArticle('published');
});

$('clearButton').addEventListener('click', resetForm);

$('articleList').addEventListener('click', async event => {
  const button = event.target.closest('[data-delete]');
  if (!button) return;
});

async function deleteArticle(id) {
  const article = articles.find(item => String(item.id) === String(id));
  if (!article) return;

  if (!confirm(`Delete "${article.title}" permanently?`)) return;

  const { error } = await db
    .from('articles')
    .delete()
    .eq('id', id);

  if (error) {
    message('formMessage', 'Could not delete article: ' + error.message);
    return;
  }

  if (article.image_path) {
    await db.storage
      .from('article-images')
      .remove([article.image_path]);
  }

  if (String($('articleId').value) === String(id)) resetForm();

  message('formMessage', 'Article deleted.');
  await loadArticles();
}

// Rich-text toolbar
document.querySelectorAll('.editor-toolbar button').forEach(button => {
  button.addEventListener('click', () => {
    const command = button.dataset.command;
    const value = button.dataset.value || null;

    $('editor').focus();

    if (command === 'createLink') {
      const url = prompt('Enter the full link beginning with https://');
      if (!url) return;

      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          alert('Please enter a valid web link.');
          return;
        }
      } catch {
        alert('Please enter a valid web link.');
        return;
      }

      document.execCommand(command, false, url);
    } else {
      document.execCommand(command, false, value);
    }
  });
});

checkSession();
