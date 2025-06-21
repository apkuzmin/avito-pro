document.addEventListener('DOMContentLoaded', () => {
  const originalKeywordsInput = document.getElementById('originalKeywords');
  const fakeKeywordsInput = document.getElementById('fakeKeywords');
  const resetOriginalBtn = document.getElementById('resetOriginal');
  const resetFakeBtn = document.getElementById('resetFake');
  const backBtn = document.getElementById('backBtn');
  const maxSellerReviewsInput = document.getElementById('maxSellerReviews');

  const DEFAULT_ORIGINAL = 'Оригинал';
  const DEFAULT_FAKE = 'реплика, паль, оригинальное качество, люкс, размеры, качественный, в наличии, качественная, качества, размерный';

  // Загрузка сохранённых настроек
  chrome.storage.sync.get(['originalKeywords', 'fakeKeywords', 'maxSellerReviews'], (data) => {
    if (data.originalKeywords === undefined) {
      data.originalKeywords = DEFAULT_ORIGINAL;
      chrome.storage.sync.set({ originalKeywords: DEFAULT_ORIGINAL });
    }
    if (data.fakeKeywords === undefined) {
      data.fakeKeywords = DEFAULT_FAKE;
      chrome.storage.sync.set({ fakeKeywords: DEFAULT_FAKE });
    }

    originalKeywordsInput.value = data.originalKeywords;
    fakeKeywordsInput.value = data.fakeKeywords;

    // Значение по умолчанию для порога отзывов
    const DEFAULT_MAX_REVIEWS = 100;
    if (data.maxSellerReviews === undefined || !Number.isFinite(data.maxSellerReviews)) {
      data.maxSellerReviews = DEFAULT_MAX_REVIEWS;
      chrome.storage.sync.set({ maxSellerReviews: DEFAULT_MAX_REVIEWS });
    }
    maxSellerReviewsInput.value = data.maxSellerReviews;
  });

  // Функция сохранения
  function save() {
    const settings = {
      originalKeywords: originalKeywordsInput.value.trim(),
      fakeKeywords: fakeKeywordsInput.value.trim(),
      maxSellerReviews: parseInt(maxSellerReviewsInput.value, 10) || 100
    };
    chrome.storage.sync.set(settings);
  }

  // Форма больше не используется, поэтому сохраняем при вводе

  // Автосохранение при изменении полей
  originalKeywordsInput.addEventListener('input', save);
  fakeKeywordsInput.addEventListener('input', save);
  maxSellerReviewsInput.addEventListener('input', save);

  // Сбросы
  resetOriginalBtn.addEventListener('click', () => {
    originalKeywordsInput.value = DEFAULT_ORIGINAL;
    save();
  });

  resetFakeBtn.addEventListener('click', () => {
    fakeKeywordsInput.value = DEFAULT_FAKE;
    save();
  });

  // Назад к главному окну
  backBtn.addEventListener('click', () => {
    window.location.href = 'popup.html';
  });
}); 