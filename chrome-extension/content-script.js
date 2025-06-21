// === Глобальные константы и дефолты ===
const DEFAULT_ORIGINAL = ['оригинал'];
const DEFAULT_FAKE = ['реплика', 'паль', 'оригинальное качество', 'люкс', 'размеры', 'качественный', 'в наличии', 'качественная', 'качества', 'размерный'];
const BLACKLIST_OFFER_KEY = 'blacklistOffers';
const BLACKLIST_USER_KEY = 'blacklistUsers';
const BTN_CONTAINER_CLASS = 'avito-blacklist-btn-container';

// Инжектируем стили для кнопок один раз
(function injectBlacklistStyles() {
  if (document.getElementById('avito-bl-styles')) return;
  const style = document.createElement('style');
  style.id = 'avito-bl-styles';
  style.textContent = `
    .${BTN_CONTAINER_CLASS} {display:none;position:absolute;right:4px;top:4px;z-index:9999;gap:4px;}
    div[data-marker="item"]:hover .${BTN_CONTAINER_CLASS} {display:flex;}
    .avito-bl-btn{width:24px;height:24px;background:#000000c0;border:none;border-radius:4px;color:#fff;font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;}
    .avito-bl-btn:hover{background:#ff5252;}
  `;
  document.head.appendChild(style);
})();

// Утилиты работы с списками ЧС
function updateStorageList(key, updater) {
  chrome.storage.sync.get([key], (data) => {
    const list = Array.isArray(data[key]) ? data[key] : [];
    const updated = updater(list);
    chrome.storage.sync.set({ [key]: updated });
  });
}

function addToBlacklist(key, id) {
  updateStorageList(key, (list) => (list.includes(id) ? list : [...list, id]));
}

// Получить id продавца (приближённо)
function getSellerId(item) {
  // Пытаемся найти ссылку на продавца внутри карточки
  const link = item.querySelector('a[href*="/user/"]') || item.querySelector('a[href*="sellerId="]');
  if (!link) return null;
  const href = link.href;
  const m1 = href.match(/\/user\/([\w-]+)/);
  if (m1) return m1[1];
  const m2 = href.match(/sellerId=(\d+)/);
  if (m2) return m2[1];
  return null;
}

// Добавляем функцию для получения количества отзывов продавца из карточки
function getReviewCount(item) {
  // Ищем любой элемент, содержащий слово «отзыв»
  const reviewNode = Array.from(item.querySelectorAll('span, div'))
    .find((el) => /отзыв/i.test(el.textContent));
  if (!reviewNode) return null;
  // Извлекаем число перед словом «отзыв»/«отзыва»/«отзывов»
  const m = reviewNode.textContent.replace(/\s+/g, ' ').match(/(\d+)\s*отзыв/i);
  return m ? parseInt(m[1], 10) : null;
}

// Добавляем кнопки управления к карточке
function addBlacklistButtons(item, offerId, sellerId) {
  if (!offerId && !sellerId) return;
  if (item.querySelector(`.${BTN_CONTAINER_CLASS}`)) return; // уже есть

  const container = document.createElement('div');
  container.className = BTN_CONTAINER_CLASS;

  if (offerId) {
    const offerBtn = document.createElement('button');
    offerBtn.className = 'avito-bl-btn';
    offerBtn.title = 'Скрыть это объявление';
    offerBtn.textContent = '×';
    offerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToBlacklist(BLACKLIST_OFFER_KEY, offerId);
      item.style.display = 'none';
    });
    container.appendChild(offerBtn);
  }

  if (sellerId) {
    const sellerBtn = document.createElement('button');
    sellerBtn.className = 'avito-bl-btn';
    sellerBtn.title = 'Скрыть все объявления продавца';
    sellerBtn.textContent = '🚫';
    sellerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToBlacklist(BLACKLIST_USER_KEY, sellerId);
      item.style.display = 'none';
    });
    container.appendChild(sellerBtn);
  }

  item.style.position = 'relative';
  item.appendChild(container);
}

// Добавляем утилиту для проверки "целых" слов, учитывая Unicode буквы/цифры
function containsWholeWord(text, word) {
  if (!word) return false;
  // Экранируем спец-символы RegExp
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Границей слова считаем любой символ, который НЕ является буквой или цифрой (любой раскладки)
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped.toLowerCase()}([^\\p{L}\\p{N}]|$)`, 'iu');
  return pattern.test(text);
}

// Функция фильтрации объявлений на Avito
function filterListings(settings) {
  const itemSelector = 'div[data-marker="item"]';
  const priceSelector = '[data-marker="item-price"]';
  const titleSelector = 'h3';
  const badgeClass = 'avito-filter-badge';
  // Базовые стили бейджа, напоминающие фирменные Avito-плашки (как «Молл»)
  const BADGE_STYLE =
    'display:inline-flex;align-items:center;white-space:nowrap;font-size:12px;font-weight:600;' +
    'padding:2px 6px;border-radius:4px;color:#fff;pointer-events:none;';

  // ===== Вспомогательная функция для размещения бейджа =====
  // Делает попытку найти подходящую строку после цены, а если её нет — создаёт собственную.
  function placeBadge(cardNode, badgeEl) {
    // Если бейдж уже в нужном контейнере — ничего не делаем
    if (badgeEl.parentElement && badgeEl.parentElement.classList.contains('avito-filter-badge-wrapper')) {
      return;
    }

    // Удаляем из старого места (если был)
    if (badgeEl.parentElement) {
      badgeEl.parentElement.removeChild(badgeEl);
    }

    // 1) Пытаемся найти ранее созданный нами ряд
    let badgeRow = cardNode.querySelector('.avito-custom-badge-row');

    // 2) Если его нет, ищем «родной» ряд Avito, который идёт СРАЗУ после блока цены
    if (!badgeRow) {
      // Находим блок цены
      const priceEl =
        cardNode.querySelector('[data-marker="item-price"]') ||
        cardNode.querySelector('[itemprop="price"]');

      // Определяем контейнер цены, относительно которого будем искать следующий ряд
      let priceContainer = priceEl ? priceEl.parentElement : null;

      // Поднимаемся максимум на 3 уровня, чтобы выйти на контейнер-родитель для блока цены
      let level = 0;
      while (priceContainer && priceContainer.parentElement !== cardNode && level < 3) {
        priceContainer = priceContainer.parentElement;
        level++;
      }

      if (priceContainer) {
        // Сначала ищем ближайший следующий элемент после контейнера цены,
        // который выглядит как стандартная строка Avito для плашек/лейблов
        let sibling = priceContainer.nextElementSibling;
        while (sibling) {
          if (sibling.classList && sibling.classList.contains('SnippetLayout-root')) {
            badgeRow = sibling;
            break;
          }
          sibling = sibling.nextElementSibling;
        }

        // Если по прямым соседям ничего не нашли, пробуем найти ЛЮБУЮ
        // подходящую строку внутри карточки, игнорируя наши собственные.
        if (!badgeRow) {
          badgeRow = Array.from(cardNode.querySelectorAll('.SnippetLayout-root')).find(
            (el) => !el.classList.contains('avito-custom-badge-row')
          );
        }
      }
    }

    // 3) Если подходящий ряд так и не найден — создаём собственный сразу после блока цены (или в начало карточки, если не удалось его определить)
    if (!badgeRow) {
      // Повторно находим блок цены и его контейнер, чтобы понять, куда вставлять ряд
      const priceEl =
        cardNode.querySelector('[data-marker="item-price"]') ||
        cardNode.querySelector('[itemprop="price"]');
      let priceContainer = priceEl ? priceEl.parentElement : null;
      let level = 0;
      while (priceContainer && priceContainer.parentElement !== cardNode && level < 3) {
        priceContainer = priceContainer.parentElement;
        level++;
      }

      badgeRow = document.createElement('div');
      badgeRow.className = 'SnippetLayout-root avito-custom-badge-row';
      badgeRow.style.display = 'flex';
      badgeRow.style.flexWrap = 'wrap';
      badgeRow.style.gap = '4px';
      badgeRow.style.marginTop = '4px';

      if (priceContainer) {
        priceContainer.insertAdjacentElement('afterend', badgeRow);
      } else {
        // Fallback: вставляем в начало карточки
        cardNode.prepend(badgeRow);
      }
    }

    // Ищем/создаём враппер для наших бейджей
    let wrapper = cardNode.querySelector('.avito-filter-badge-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'avito-filter-badge-wrapper SnippetLayout-item-custom';
      wrapper.style.marginRight = '4px';
      badgeRow.prepend(wrapper);
    }

    wrapper.appendChild(badgeEl);
  }

  const items = document.querySelectorAll(itemSelector);
  items.forEach((item) => {
    let hide = false;

    // Получаем id продавца и число отзывов
    let sellerId = getSellerId(item);
    const reviewCount = getReviewCount(item);
    if (reviewCount !== null && reviewCount > settings.maxSellerReviews && settings.hideTopSellers) {
      hide = true;
      // Кэшируем продавца в ЧС, чтобы в дальнейшем пропускать быстрее
      if (sellerId) {
        addToBlacklist(BLACKLIST_USER_KEY, sellerId);
      }
    }

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

    // NEW: учитываем мета-описание внутри карточки, которое Avito прячет в <meta itemprop="description" content="…">
    const metaDescription = item.querySelector('meta[itemprop="description"]');
    const metaDescText = metaDescription ? metaDescription.getAttribute('content').toLowerCase() : '';

    const cardText = item.textContent.toLowerCase();
    const searchText = titleText + ' ' + cardText + ' ' + metaDescText;

    // Ключевые слова для скрытия
    if (settings.keywords && settings.keywords.length) {
      for (const word of settings.keywords) {
        if (containsWholeWord(searchText, word)) {
          hide = true;
          break;
        }
      }
    }

    // Сначала определяем, встретилось ли хоть одно слово из каждого списка
    let hasOriginal = false;
    let hasFake = false;

    if (settings.originalKeywords && settings.originalKeywords.length) {
      settings.originalKeywords.forEach((word) => {
        if (containsWholeWord(searchText, word)) {
          hasOriginal = true;
        }
      });
    }

    if (settings.fakeKeywords && settings.fakeKeywords.length) {
      settings.fakeKeywords.forEach((word) => {
        if (containsWholeWord(searchText, word)) {
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

    // Проверяем черные списки
    const offerId = item.getAttribute('data-item-id');
    if (settings.blacklistOffers && offerId && settings.blacklistOffers.includes(offerId)) hide = true;
    if (settings.blacklistUsers && sellerId && settings.blacklistUsers.includes(sellerId)) hide = true;

    // Добавляем интерфейс управления черным списком (только если объявление ещё не скрыто)
    if (!hide) {
      addBlacklistButtons(item, offerId, sellerId);
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

        // Добавляем бейдж в нужное место
        placeBadge(item, badgeEl);
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
    chrome.storage.sync.get(['minPrice', 'maxPrice', 'keywords', 'originalKeywords', 'fakeKeywords', 'showBadges', 'hideFake', 'hideTopSellers', 'maxSellerReviews', BLACKLIST_OFFER_KEY, BLACKLIST_USER_KEY], (data) => {
      const toBool = (v, def) => {
        if (typeof v === 'boolean') return v;
        if (typeof v === 'string') return v === 'true';
        return def;
      };

      const settings = {
        minPrice: Number.isFinite(data.minPrice) ? data.minPrice : null,
        maxPrice: Number.isFinite(data.maxPrice) ? data.maxPrice : null,
        keywords: data.keywords ? data.keywords.split(',').map((w) => w.trim()).filter(Boolean) : [],
        originalKeywords: data.originalKeywords ? data.originalKeywords.split(',').map((w) => w.trim()).filter(Boolean) : DEFAULT_ORIGINAL,
        fakeKeywords: data.fakeKeywords ? data.fakeKeywords.split(',').map((w) => w.trim()).filter(Boolean) : DEFAULT_FAKE,
        showBadges: data.showBadges === undefined ? true : toBool(data.showBadges, true),
        hideFake: data.hideFake === undefined ? true : toBool(data.hideFake, true),
        hideTopSellers: data.hideTopSellers === undefined ? true : toBool(data.hideTopSellers, true),
        blacklistOffers: Array.isArray(data[BLACKLIST_OFFER_KEY]) ? data[BLACKLIST_OFFER_KEY] : [],
        blacklistUsers: Array.isArray(data[BLACKLIST_USER_KEY]) ? data[BLACKLIST_USER_KEY] : [],
        maxSellerReviews: Number.isFinite(data.maxSellerReviews) ? data.maxSellerReviews : 100
      };

      filterListings(settings);
    });
  }

  // Первая фильтрация
  loadAndFilter();

  // Обновляем при изменении DOM
  const observer = new MutationObserver(loadAndFilter);
  // Отслеживаем не только добавление/удаление узлов, но и изменение текста внутри них.
  // На Avito описание и часть атрибутов подгружаются асинхронно: сначала вставляется «скелет»,
  // а затем меняется содержимое текстовых узлов. Чтобы метки обновлялись после таких
  // «ленивых» изменений, подписываемся ещё и на characterData.
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  // Обновляем при изменении настроек
  chrome.storage.onChanged.addListener(loadAndFilter);
}

// Запускаем после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFiltering);
} else {
  initFiltering();
} 