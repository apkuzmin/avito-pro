document.addEventListener('DOMContentLoaded', () => {
  // Элементы основного окна
  const showBadgesInput = document.getElementById('showBadges');
  const hideFakeInput = document.getElementById('hideFake');
  const hideTopSellersInput = document.getElementById('hideTopSellers');
  const openAdvancedBtn = document.getElementById('openAdvancedBtn');
  const status = document.getElementById('status');

  // Функция для сохранения настроек
  const saveSettings = () => {
    const settings = {
      showBadges: showBadgesInput.checked,
      hideFake: hideFakeInput.checked,
      hideTopSellers: hideTopSellersInput.checked,
    };
    
    chrome.storage.sync.set(settings, () => {
      if (chrome.runtime.lastError) {
        console.error('Ошибка сохранения настроек:', chrome.runtime.lastError);
      } else {
        console.log('Настройки сохранены:', settings);
      }
    });
  };

  // Функция для преобразования значения из хранилища в boolean
  const toBool = (value, defaultVal) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    return defaultVal;
  };

  // Загрузка сохранённых настроек
  chrome.storage.sync.get(['showBadges', 'hideFake', 'hideTopSellers'], (data) => {
    if (chrome.runtime.lastError) {
      console.error('Ошибка загрузки настроек:', chrome.runtime.lastError);
      // Используем значения по умолчанию
      showBadgesInput.checked = true;
      hideFakeInput.checked = true;
      hideTopSellersInput.checked = true;
    } else {
      console.log('Загруженные настройки:', data);
      
      // Устанавливаем значения из хранилища или дефолтные
      showBadgesInput.checked = toBool(data.showBadges, true);
      hideFakeInput.checked = toBool(data.hideFake, true);
      hideTopSellersInput.checked = toBool(data.hideTopSellers, true);

      // Если это первый запуск или значения были некорректными, сохраняем дефолтные
      if (data.showBadges === undefined || data.hideFake === undefined || data.hideTopSellers === undefined) {
        console.log('Первое сохранение настроек с дефолтными значениями');
        saveSettings();
      }
    }
    
    // Добавляем обработчики событий после загрузки настроек
    showBadgesInput.addEventListener('change', saveSettings);
    hideFakeInput.addEventListener('change', saveSettings);
    hideTopSellersInput.addEventListener('change', saveSettings);
  });

  // Открыть страницу расширенных настроек
  openAdvancedBtn.addEventListener('click', () => {
    window.location.href = 'advanced.html';
  });
}); 