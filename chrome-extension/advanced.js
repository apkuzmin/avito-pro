document.addEventListener('DOMContentLoaded', () => {
  const originalKeywordsInput = document.getElementById('originalKeywords');
  const fakeKeywordsInput = document.getElementById('fakeKeywords');
  const resetOriginalBtn = document.getElementById('resetOriginal');
  const resetFakeBtn = document.getElementById('resetFake');
  const backBtn = document.getElementById('backBtn');

  const DEFAULT_ORIGINAL = 'Оригинал';
  const DEFAULT_FAKE = 'паль, копия, реплика, качество, подделка, в наличии, размеры, ткань, оригинальное качество';

  // Загрузка сохранённых настроек
  chrome.storage.sync.get(['originalKeywords', 'fakeKeywords'], (data) => {
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
  });

  // Функция сохранения
  function save() {
    const settings = {
      originalKeywords: originalKeywordsInput.value.trim(),
      fakeKeywords: fakeKeywordsInput.value.trim()
    };
    chrome.storage.sync.set(settings);
  }

  // Форма больше не используется, поэтому сохраняем при вводе

  // Автосохранение при изменении полей
  originalKeywordsInput.addEventListener('input', save);
  fakeKeywordsInput.addEventListener('input', save);

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