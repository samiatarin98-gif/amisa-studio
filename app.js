
const CATEGORIES = [
  ['Beauty & Skincare', '✧', 'Beauty, skincare and everyday care'],
  ['Fashion & Accessories', '◇', 'Clothing, bags and accessories'],
  ['Home Décor', '❀', 'Finishing touches for your space'],
  ['Home & Kitchen', '⌂', 'Useful finds for everyday living'],
  ['Electronics & Gadgets', '⌁', 'Technology and handy gadgets'],
  ['Jewellery', '✦', 'Jewellery and small details'],
  ['Lifestyle', '☼', 'Products for work, travel and leisure']
];

const $ = id => document.getElementById(id);

const configured = () =>
  window.AMISA_CONFIG &&
  window.AMISA_CONFIG.supabaseUrl.startsWith('https://') &&
  window.AMISA_CONFIG.supabaseAnonKey.length > 20 &&
  !window.AMISA_CONFIG.supabaseUrl.includes('PASTE_');

function safe(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

// CATEGORY DISPLAY
function drawCategories() {
  $('categoriesGrid').innerHTML = CATEGORIES.map(([name, icon, desc]) =>
    `<button class="category" data-category="${safe(name)}">
      <span class="symbol">${icon}</span>
      <h3>${safe(name)}</h3>
      <p>${safe(desc)}</p>
    </button>`
  ).join('');

  $('categoryFilter').innerHTML =
    '<option value="all">All categories</option>' +
    CATEGORIES.map(c => `<option>${safe(c[0])}</option>`).join('');

  document.querySelectorAll('[data-category]').forEach(button => {
    button.addEventListener('click', () => {
      $('categoryFilter').value = button.dataset.category;
      renderProducts();
    });
  });
}

// PRODUCT DISPLAY
let allProducts = [];

function renderProducts() {
  const q = $('search').value.toLowerCase();
  const cat = $('categoryFilter').value;

  const rows = allProducts.filter(p =>
    (cat === 'all' || p.category === cat) &&
    `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(q)
  );

  $('productsGrid').innerHTML = rows.length
    ? rows.map(p => `
      <article class="product-card">
        <div class="product-image">
          ${p.image_url
            ? `<img src="${safe(p.image_url)}" alt="${safe(p.name)}" loading="lazy">`
            : '✧'}
        </div>
        <div class="product-body">
          <span class="tag">${safe(p.category)}</span>
          <h3>${safe(p.name)}</h3>
          <p>${safe(p.description)}</p>
          <div class="product-foot">
            <span class="price">${safe(p.price || 'See retailer')}</span>
            <a class="button" href="${safe(p.affiliate_url)}"
               target="_blank" rel="sponsored nofollow noopener">Shop now</a>
          </div>
        </div>
      </article>
    `).join('')
    : '<div class="empty">No products have been added to this collection yet. Please check back soon.</div>';
}

async function loadProducts(db) {
  try {
    const { data, error } = await db
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allProducts = data || [];
    renderProducts();

  } catch (error) {
    $('productsGrid').innerHTML =
      '<div class="empty">Products could not be loaded right now. Please try again later.</div>';

    console.error('Product loading error:', error);
  }
}

// ARTICLE DISPLAY
function articleImageUrl(db, path) {
  if (!path) return '';

  return db.storage
    .from('article-images')
    .getPublicUrl(path).data.publicUrl;
}

function renderArticles(db, articles) {
  const grid = $('articlesGrid');

  if (!articles.length) {
    grid.innerHTML =
      '<div class="empty">Our guides and articles are coming soon. Please check back!</div>';
    return;
  }

  grid.innerHTML = articles.map(article => {
    const imageUrl = articleImageUrl(db, article.image_path);

    const date = article.published_at
      ? new Date(article.published_at)
      : new Date(article.created_at);

    const dateText = !Number.isNaN(date.getTime())
      ? date.toLocaleDateString('en', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : '';

    return `
      <article class="article-card">
        <a class="article-card-image"
           href="/articles/${encodeURIComponent(article.slug)}"
           aria-label="Read ${safe(article.title)}">
          ${imageUrl
            ? `<img src="${safe(imageUrl)}" alt="${safe(article.title)}" loading="lazy">`
            : '<span>✧</span>'}
        </a>

        <div class="article-card-body">
          <span class="tag">${safe(article.category || 'Lifestyle')}</span>
          <h3>${safe(article.title)}</h3>
          <p>${safe(article.excerpt || '')}</p>
          <div class="article-card-footer">
            <small>${safe(dateText)}</small>
            <a href="/articles/${encodeURIComponent(article.slug)}">Read the guide →</a>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

async function loadArticles(db) {
  const grid = $('articlesGrid');

  try {
    const { data, error } = await db
      .from('articles')
      .select('id,title,slug,category,excerpt,image_path,created_at,published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(6);

    if (error) throw error;

    renderArticles(db, data || []);

  } catch (error) {
    grid.innerHTML =
      '<div class="empty">Our guides could not be loaded right now. Please try again later.</div>';

    console.error('Article loading error:', error);
  }
}

// INITIALIZE WEBSITE
async function initializeWebsite() {
  drawCategories();

  $('search').addEventListener('input', renderProducts);
  $('categoryFilter').addEventListener('change', renderProducts);

  $('year').textContent = new Date().getFullYear();

  if (!configured()) {
    $('productsGrid').innerHTML =
      '<div class="empty">Amisa Studio is being prepared. Product collections will appear here soon.</div>';

    $('articlesGrid').innerHTML =
      '<div class="empty">Our guides and articles are coming soon.</div>';

    return;
  }

  const db = window.supabase.createClient(
    window.AMISA_CONFIG.supabaseUrl,
    window.AMISA_CONFIG.supabaseAnonKey
  );

  await Promise.all([
    loadProducts(db),
    loadArticles(db)
  ]);
}

initializeWebsite();
