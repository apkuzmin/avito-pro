document.addEventListener('DOMContentLoaded', () => {
  // Элементы основного окна
  const showBadgesInput = document.getElementById('showBadges');
  const hideFakeInput = document.getElementById('hideFake');
  const hideTopSellersInput = document.getElementById('hideTopSellers');
  const openAdvancedBtn = document.getElementById('openAdvancedBtn');
  const status = document.getElementById('status');

  // Функция для сохранения настроек
  const saveSettings = () => {
    chrome.storage.sync.set({
      showBadges: showBadgesInput.checked,
      hideFake: hideFakeInput.checked,
      hideTopSellers: hideTopSellersInput.checked,
    });
  };

  // Загрузка сохранённых настроек
  chrome.storage.sync.get(['showBadges', 'hideFake', 'hideTopSellers'], (data) => {
    showBadgesInput.checked = typeof data.showBadges === 'boolean' ? data.showBadges : true;
    hideFakeInput.checked = typeof data.hideFake === 'boolean' ? data.hideFake : true;
    hideTopSellersInput.checked = typeof data.hideTopSellers === 'boolean' ? data.hideTopSellers : true;

    // Устанавливаем начальные значения, если их нет
    if (typeof data.showBadges !== 'boolean' || typeof data.hideFake !== 'boolean' || typeof data.hideTopSellers !== 'boolean') {
      saveSettings();
    }
  });

  // Сохранение при изменении любого переключателя
  showBadgesInput.addEventListener('change', saveSettings);
  hideFakeInput.addEventListener('change', saveSettings);
  hideTopSellersInput.addEventListener('change', saveSettings);

  // Открыть страницу расширенных настроек
  openAdvancedBtn.addEventListener('click', () => {
    window.location.href = 'advanced.html';
  });
}); 