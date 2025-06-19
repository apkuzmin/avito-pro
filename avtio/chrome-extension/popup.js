document.addEventListener('DOMContentLoaded', () => {
  // Элементы основного окна
  const showBadgesInput = document.getElementById('showBadges');
  const hideFakeInput = document.getElementById('hideFake');
  const mainForm = document.getElementById('mainForm');
  const openAdvancedBtn = document.getElementById('openAdvancedBtn');
  const status = document.getElementById('status');

  // Загрузка сохранённых настроек
  chrome.storage.sync.get(['showBadges', 'hideFake'], (data) => {
    if (typeof data.showBadges !== 'boolean') {
      data.showBadges = true;
      chrome.storage.sync.set({ showBadges: true });
    }
    showBadgesInput.checked = data.showBadges;

    if (typeof data.hideFake !== 'boolean') {
      data.hideFake = false;
      chrome.storage.sync.set({ hideFake: false });
    }
    hideFakeInput.checked = data.hideFake;
  });

  // Сохранение основных настроек
  mainForm.addEventListener('submit', (e) => {
    e.preventDefault();
    chrome.storage.sync.set(
      { showBadges: showBadgesInput.checked, hideFake: hideFakeInput.checked },
      () => {
        status.textContent = 'Настройки сохранены!';
        setTimeout(() => (status.textContent = ''), 1500);
      }
    );
  });

  // Открыть страницу расширенных настроек
  openAdvancedBtn.addEventListener('click', () => {
    window.location.href = 'advanced.html';
  });
}); 