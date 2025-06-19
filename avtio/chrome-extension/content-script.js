// Функция фильтрации объявлений на Avito
function filterListings(settings) {
  const itemSelector = 'div[data-marker="item"]';
  const priceSelector = '[data-marker="item-price"]';
  const titleSelector = 'h3';
  const badgeClass = 'avito-filter-badge';
  const DEFAULT_ORIGINAL = ['оригинал'];
  const DEFAULT_FAKE = ['паль', 'копия', 'реплика'];
  // Базовые стили бейджа, напоминающие фирменные Avito-плашки (как «Молл»)
  const BADGE_STYLE =
    'display:inline-flex;align-items:center;white-space:nowrap;font-size:12px;font-weight:600;' +
    'padding:2px 6px;border-radius:4px;color:#fff;pointer-events:none;';

  const items = document.querySelectorAll(itemSelector);
  items.forEach((item) => {
    let hide = false;

    // Проверка цены
    const price = extractPrice(item);
    if (price !== null) {
      if (settings.minPrice !== null && price < settings.minPrice) hide = true;
      if (settings.maxPrice !== null && price > settings.maxPrice) hide = true;
    }

    // Проверка ключевых слов
    const titleElement =
      item.querySelector('[data-marker="item-title"]') ||
      item.querySelector('h3') ||
      item.querySelector('a[itemprop="name"]') ||
      item.querySelector('h2');
    const titleText = titleElement ? titleElement.textContent.toLowerCase() : '';
    const cardText = item.textContent.toLowerCase();
    const searchText = titleText + ' ' + cardText;

    // Ключевые слова для скрытия
    if (settings.keywords && settings.keywords.length) {
      settings.keywords.forEach((word) => {
        if (word && searchText.includes(word.toLowerCase())) {
          hide = true;
        }
      });
    }

    // Сначала определяем, встретилось ли хоть одно слово из каждого списка
    let hasOriginal = false;
    let hasFake = false;

    if (settings.originalKeywords && settings.originalKeywords.length) {
      settings.originalKeywords.forEach((word) => {
        if (word && searchText.includes(word.toLowerCase())) {
          hasOriginal = true;
        }
      });
    }

    if (settings.fakeKeywords && settings.fakeKeywords.length) {
      settings.fakeKeywords.forEach((word) => {
        if (word && searchText.includes(word.toLowerCase())) {
          hasFake = true;
        }
      });
    }

    // Правило: если нашли одновременно и оригинал, и пали — считаем товар палёным
    // Приоритет «Паль» над «Оригинал»
    let badgeText = '';
    if (hasFake) {
      badgeText = 'Паль';
    } else if (hasOriginal) {
      badgeText = 'Оригинал';
    }

    // === Новая логика: управление отображением бейджей ===
    // Если бейджи отключены, удаляем существующие и пропускаем добавление
    if (!settings.showBadges) {
      const existing = item.querySelectorAll(`.${badgeClass}`);
      existing.forEach((el) => el.remove());
    } else {
      // Добавляем/обновляем бейдж
      if (badgeText) {
        let badgeEl = item.querySelector(`.${badgeClass}`);

        const bgColor = badgeText === 'Оригинал' ? '#28a745' /* зелёный */ : '#d6336c' /* красный */;

        if (!badgeEl) {
          badgeEl = document.createElement('span');
          badgeEl.className = badgeClass;
          badgeEl.style.cssText = BADGE_STYLE + `background:${bgColor};`;
        }

        badgeEl.textContent = badgeText;
        badgeEl.style.cssText = BADGE_STYLE + `background:${bgColor};`;

        // Если Avito не вывел блок бейджей, создаём собственный сразу под ценой
        let inserted = false;
        let snippetLayout = item.querySelector('[class^="SnippetLayout-root"]');
        if (!snippetLayout) {
          const priceStep = item.querySelector('[class*="priceStep"]');
          const containerForInsert = priceStep ? priceStep.parentElement : null;
          if (containerForInsert) {
            snippetLayout = document.createElement('div');
            snippetLayout.className = 'SnippetLayout-root avito-custom-badge-row';
            snippetLayout.style.display = 'flex';
            snippetLayout.style.flexWrap = 'wrap';
            snippetLayout.style.gap = '4px';
            snippetLayout.style.marginTop = '4px';
            containerForInsert.insertBefore(snippetLayout, priceStep.nextSibling);
          }
        }

        if (snippetLayout) {
          // Проверяем, добавляли ли мы уже враппер
          let wrapper = item.querySelector('.avito-filter-badge-wrapper');
          if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'avito-filter-badge-wrapper SnippetLayout-item-custom';
            wrapper.style.marginRight = '4px';
            snippetLayout.prepend(wrapper); // в начало списка бейджей
          }
          // Перемещаем бейдж внутрь контейнера (если он уже где-то был — например, в абсолютном положении)
          if (badgeEl.parentElement !== wrapper) {
            wrapper.appendChild(badgeEl);
          }
          inserted = true;
        }

        // Fallback – абсолютное позиционирование поверх карточки
        if (!inserted && !badgeEl.parentElement) {
          badgeEl.style.cssText += 'position:absolute;top:8px;right:8px;pointer-events:none;z-index:9999;';
          item.style.position = 'relative';
          item.appendChild(badgeEl);
        }
      } else {
        // Если ранее был бейдж, но теперь не нужно — удаляем
        const existing = item.querySelectorAll(`.${badgeClass}`);
        existing.forEach((el) => el.remove());
      }
    }

    if (settings.hideFake && badgeText === 'Паль') hide = true;

    item.style.display = hide ? 'none' : '';
  });
}

// Функция получения цены из карточки
function extractPrice(item) {
  // 1) meta[itemprop="price"] имеет точную цену в атрибуте content
  const meta = item.querySelector('meta[itemprop="price"]');
  if (meta && meta.getAttribute('content')) {
    const v = parseInt(meta.getAttribute('content').replace(/\D/g, ''), 10);
    if (!Number.isNaN(v)) return v;
  }
  // 2) Явный data-marker
  let priceEl = item.querySelector('[data-marker="item-price"]');
  if (priceEl) {
    const priceText = priceEl.textContent.replace(/\D/g, '');
    const price = parseInt(priceText, 10);
    if (!Number.isNaN(price)) return price;
  }
  // 3) itemprop="price" (если не meta)
  priceEl = item.querySelector('[itemprop="price"]');
  if (priceEl) {
    const priceText = (priceEl.textContent || priceEl.getAttribute('content') || '').replace(/\D/g, '');
    const price = parseInt(priceText, 10);
    if (!Number.isNaN(price)) return price;
  }
  return null;
}

// Инициализация скрипта
function initFiltering() {
  function loadAndFilter() {
    chrome.storage.sync.get(['minPrice', 'maxPrice', 'keywords', 'originalKeywords', 'fakeKeywords', 'showBadges', 'hideFake'], (data) => {
      const settings = {
        minPrice: Number.isFinite(data.minPrice) ? data.minPrice : null,
        maxPrice: Number.isFinite(data.maxPrice) ? data.maxPrice : null,
        keywords: data.keywords ? data.keywords.split(',').map((w) => w.trim()).filter(Boolean) : [],
        originalKeywords: data.originalKeywords ? data.originalKeywords.split(',').map((w) => w.trim()).filter(Boolean) : DEFAULT_ORIGINAL,
        fakeKeywords: data.fakeKeywords ? data.fakeKeywords.split(',').map((w) => w.trim()).filter(Boolean) : DEFAULT_FAKE,
        showBadges: data.showBadges === undefined ? true : data.showBadges,
        hideFake: data.hideFake === undefined ? false : data.hideFake
      };

      filterListings(settings);
    });
  }

  // Первая фильтрация
  loadAndFilter();

  // Обновляем при изменении DOM
  const observer = new MutationObserver(loadAndFilter);
  observer.observe(document.body, { childList: true, subtree: true });

  // Обновляем при изменении настроек
  chrome.storage.onChanged.addListener(loadAndFilter);
}

// Запускаем после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFiltering);
} else {
  initFiltering();
} 