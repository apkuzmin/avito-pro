document.addEventListener('DOMContentLoaded', () => {
  const originalKeywordsInput = document.getElementById('originalKeywords');
  const fakeKeywordsInput = document.getElementById('fakeKeywords');
  const resetOriginalBtn = document.getElementById('resetOriginal');
  const resetFakeBtn = document.getElementById('resetFake');
  const advancedForm = document.getElementById('advancedForm');
  const status = document.getElementById('status');
  const backBtn = document.getElementById('backBtn');

  const DEFAULT_ORIGINAL = 'оригинал';
  const DEFAULT_FAKE = 'паль, копия, реплика';

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
    chrome.storage.sync.set(settings, () => {
      status.textContent = 'Настройки сохранены!';
      setTimeout(() => (status.textContent = ''), 1500);
    });
  }

  // Отправка формы
  advancedForm.addEventListener('submit', (e) => {
    e.preventDefault();
    save();
  });

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