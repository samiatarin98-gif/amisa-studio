
const $ = id => document.getElementById(id);

const configured = () =>
  window.AMISA_CONFIG &&
  window.AMISA_CONFIG.supabaseUrl.startsWith('https://') &&
  window.AMISA_CONFIG.supabaseAnonKey.length > 20 &&
  !window.AMISA_CONFIG.supabaseUrl.includes('PASTE_');

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

// Only allow safe formatting in published articles.
function cleanContent(html) {
  const allowed = new Set([
    'P', 'H2', 'H3', 'STRONG', 'B', 'EM', 'I',
    'UL', 'OL', 'LI', 'A', 'BLOCKQUOTE', 'BR'
  ]);

  const doc = new DOMParser().parseFromString(html || '', 'text/html');

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

function setMeta(name, content, property = false) {
  const selector = property
    ? `meta[property="${name}"]`
    : `meta[name="${name}"]`;

  let tag = document.querySelector(selector);

  if (!tag) {
    tag = document.createElement('meta');

    if (property) {
      tag.setAttribute('property', name);
    } else {
      tag.setAttribute('name', name);
    }

    document.head.appendChild(tag);
  }

  tag.setAttribute('content', content);
}

function showNotFound() {
  $('articleLoading').hidden = true;
  $('articleContent').hidden = true;
  $('articleError').hidden = false;
  document.title = 'Article not found | Amisa Studio';
}

async function loadArticle() {
  $('year').textContent = new Date().getFullYear();

  const slug = new URLSearchParams(window.location.search).get('slug');

  if (!slug || !configured()) {
    showNotFound();
    return;
  }

  try {
    const db = window.supabase.createClient(
      window.AMISA_CONFIG.supabaseUrl,
      window.AMISA_CONFIG.supabaseAnonKey
    );

    const { data: article, error } = await db
      .from('articles')
      .select('title, slug, category, excerpt, content, image_path, status, published_at')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    if (error) throw error;
    if (!article) {
      showNotFound();
      return;
    }

    const title = article.title || 'Amisa Studio Guide';
    const excerpt = article.excerpt || '';
    const category = article.category || 'Lifestyle';

    document.title = `${title} | Amisa Studio`;

    setMeta('description', excerpt);
    setMeta('og:title', title, true);
    setMeta('og:description', excerpt, true);
    setMeta('og:url', window.location.href, true);

    $('articleTitle').textContent = title;
    $('articleExcerpt').textContent = excerpt;
    $('articleCategory').textContent = category;
    $('articleBody').innerHTML = cleanContent(article.content);

    if (article.published_at) {
      const date = new Date(article.published_at);

      $('articleDate').textContent = Number.isNaN(date.getTime())
        ? ''
        : `Published ${date.toLocaleDateString('en', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}`;
    } else {
      $('articleDate').textContent = '';
    }

    if (article.image_path) {
      const { data } = db.storage
        .from('article-images')
        .getPublicUrl(article.image_path);

      if (data?.publicUrl) {
        $('articleCover').src = data.publicUrl;
        $('articleCover').alt = title;
        $('articleCover').hidden = false;
        setMeta('og:image', data.publicUrl, true);
      }
    }

    $('articleLoading').hidden = true;
    $('articleError').hidden = true;
    $('articleContent').hidden = false;

  } catch (error) {
    console.error('Article loading error:', error);
    showNotFound();
  }
}

loadArticle();
