export interface Translation {
  localeCode: string;
  tabs: { tasks: string; calendar: string; finance: string; stats: string; settings: string };
  status: { all: string; notStarted: string; inProgress: string; done: string };
  priority: { any: string; low: string; medium: string; high: string };
  weekdaysShort: string[];
  tasksScreen: {
    header: string;
    emptyTitle: string;
    emptySubtitle: string;
    allTags: string;
    sortLabel: string;
    sortDeadline: string;
    sortPriority: string;
    sortTag: string;
    sortStatus: string;
    sortCreated: string;
    sortManual: string;
    filtersLabel: string;
    quickAddPlaceholder: string;
    selectedCount: (count: number) => string;
  };
  taskListItem: { today: string };
  taskEditor: {
    headerNew: string;
    headerEdit: string;
    titleLabel: string;
    titlePlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    photoLabel: string;
    addPhoto: string;
    replacePhoto: string;
    removePhoto: string;
    priorityLabel: string;
    statusLabel: string;
    important: string;
    markImportant: string;
    save: string;
    cancel: string;
    deleteTask: string;
    missingTitleTitle: string;
    missingTitleMessage: string;
    deleteConfirmTitle: string;
    deleteConfirmCancel: string;
    deleteConfirmOk: string;
    logExpenseOnComplete: string;
  };
  dateTimeField: {
    label: string;
    setDeadline: string;
    noDeadline: string;
    datePlaceholder: string;
    timePlaceholder: string;
    invalidHint: string;
  };
  subtaskChecklist: { title: string; of: string; addPlaceholder: string };
  tagInput: { title: string; addPlaceholder: string };
  recurrence: {
    title: string;
    none: string;
    daily: string;
    weekly: string;
    monthly: string;
    every: string;
    unitDays: string;
    unitWeeks: string;
    unitMonths: string;
  };
  calendarScreen: { header: string; emptyDay: string };
  financeScreen: {
    header: string;
    categoriesLink: string;
    recentExpenses: string;
    emptyTitle: string;
    emptySubtitle: string;
    thisMonth: string;
    earned: string;
    spent: string;
    bank: string;
    incoming: string;
    total: string;
    editBankTitle: string;
    editBankHint: string;
    salaryCredited: string;
    accruing: string;
    plannedIncluded: string;
    plannedLink: string;
    recurringLink: string;
    budgetTitle: string;
  };
  plannedExpenses: {
    title: string;
    hint: string;
    totalLabel: string;
    addButton: string;
  };
  recurringExpenses: {
    title: string;
    hint: string;
    next: string;
    addButton: string;
  };
  workCalendar: { worked: string; off: string };
  widgetMenu: { pick: string; remove: string };
  categoryPicker: { label: string };
  expenseEditor: {
    headerNew: string;
    headerEdit: string;
    amountLabel: string;
    dateLabel: string;
    commentLabel: string;
    commentPlaceholder: string;
    save: string;
    cancel: string;
    delete: string;
    invalidAmountTitle: string;
    invalidAmountMessage: string;
    missingCategoryTitle: string;
    missingCategoryMessage: string;
    deleteConfirmTitle: string;
    deleteConfirmCancel: string;
    deleteConfirmOk: string;
  };
  categoryManager: {
    header: string;
    done: string;
    deleteRow: string;
    newCategory: string;
    namePlaceholder: string;
    addButton: string;
    cannotDeleteTitle: string;
    cannotDeleteMessage: (name: string, count: number) => string;
    expenseWord: (count: number) => string;
    editLimitTitle: string;
    limitLabel: string;
    limitPlaceholder: string;
    limitSet: (amount: string) => string;
  };
  charts: { noDataForPeriod: string; noExpensesForPeriod: string };
  stats: {
    header: string;
    tasksTab: string;
    financeTab: string;
    createdPerWeek: string;
    completedPerWeek: string;
    overduePerWeek: string;
    earningsPerWeek: string;
    expensesByCategory: string;
    topCategory: string;
  };
  settingsScreen: {
    header: string;
    earnings: string;
    budget: string;
    theme: string;
    language: string;
    notifications: string;
    background: string;
    limitsSet: string;
    notSet: string;
    themeLight: string;
    themeDark: string;
    themeSystem: string;
    languageRu: string;
    languageUk: string;
    languageEn: string;
    notificationsOn: string;
    notificationsOff: string;
    backgroundSet: string;
    perHourShort: string;
  };
  earningsSettings: {
    title: string;
    hourlyRate: string;
    hoursPerShift: string;
    currency: string;
    payPeriodStartDay: string;
    payPeriodHint: string;
    paydayDay: string;
    paydayHint: string;
  };
  budgetSettings: { title: string; weekLimit: string; monthLimit: string; notSetPlaceholder: string };
  themeSettings: { title: string; accentLabel: string };
  languageSettings: { title: string; note: string };
  notificationsSettings: { title: string; enabled: string; disabled: string; reminderLabel: string; note: string };
  backgroundSettings: { title: string; notSet: string; pick: string; replace: string; remove: string };
  homeWidgetSettings: { title: string; hint: string };
  homeWidgets: {
    todayTitle: string;
    noTasks: string;
    spentToday: string;
    dayOffTitle: string;
    dayOffToday: string;
    dayOffTomorrow: string;
    dayOffIn: (days: number) => string;
    shiftsBefore: (shifts: number) => string;
    noDayOff: string;
    nextTaskTitle: string;
    dueIn: (time: string) => string;
    overdueBy: (time: string) => string;
    moreToday: (count: number) => string;
    days: string;
    hours: string;
    minutes: string;
  };
  designs: {
    settingsTitle: string;
    settingsHint: string;
    amber: string;
    amberDescription: string;
    neon: string;
    neonDescription: string;
    paper: string;
    paperDescription: string;
    bold: string;
    boldDescription: string;
  };
  financeMenu: {
    recurringDescription: string;
    plannedDescription: string;
    categoriesDescription: string;
  };
  salaryPrompt: {
    title: string;
    expected: (amount: string, period: string) => string;
    yes: string;
    otherAmount: string;
    snooze: string;
    amountLabel: string;
    save: string;
    cancel: string;
    notificationTitle: string;
    notificationBody: (amount: string, period: string) => string;
  };
  notificationsContent: {
    permissionTitle: string;
    permissionMessage: string;
    notNow: string;
    allow: string;
    disabledTitle: string;
    disabledMessage: string;
    deadlineIn: (min: number) => string;
    deadlineNow: string;
    budgetExceededTitle: string;
    budgetApproachingTitle: string;
    budgetMessage: (spent: string, limit: string, period: string) => string;
    perWeek: string;
    perMonth: string;
    importantTask: string;
    deadlinePrefix: string;
    snooze10: string;
    snooze30: string;
    snooze60: string;
  };
}

const ru: Translation = {
  localeCode: 'ru-RU',
  tabs: { tasks: 'Задачи', calendar: 'Календарь', finance: 'Финансы', stats: 'Статистика', settings: 'Настройки' },
  status: { all: 'Все', notStarted: 'Не начато', inProgress: 'В процессе', done: 'Готово' },
  priority: { any: 'Любой приоритет', low: 'Низкий', medium: 'Средний', high: 'Высокий' },
  weekdaysShort: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  tasksScreen: {
    header: 'Задачи',
    emptyTitle: 'Пока нет задач',
    emptySubtitle: 'Нажми «+», чтобы добавить первую задачу',
    allTags: 'Все теги',
    sortLabel: 'Сортировка:',
    sortDeadline: 'По дедлайну',
    sortPriority: 'По приоритету',
    sortTag: 'По тегу',
    sortStatus: 'По статусу',
    sortCreated: 'По дате создания',
    sortManual: 'Вручную',
    filtersLabel: 'Фильтры',
    quickAddPlaceholder: 'Быстро добавить задачу...',
    selectedCount: (count) => `Выбрано: ${count}`,
  },
  taskListItem: { today: 'Сегодня' },
  taskEditor: {
    headerNew: 'Новая задача',
    headerEdit: 'Редактировать задачу',
    titleLabel: 'Заголовок',
    titlePlaceholder: 'Что нужно сделать?',
    descriptionLabel: 'Описание',
    descriptionPlaceholder: 'Детали (необязательно)',
    photoLabel: 'Фото',
    addPhoto: 'Добавить фото',
    replacePhoto: 'Заменить',
    removePhoto: 'Удалить',
    priorityLabel: 'Приоритет',
    statusLabel: 'Статус',
    important: '⭐ Важное',
    markImportant: 'Отметить как важное',
    save: 'Сохранить',
    cancel: 'Отмена',
    deleteTask: 'Удалить задачу',
    missingTitleTitle: 'Нужен заголовок',
    missingTitleMessage: 'Введи название задачи.',
    deleteConfirmTitle: 'Удалить задачу?',
    deleteConfirmCancel: 'Отмена',
    deleteConfirmOk: 'Удалить',
    logExpenseOnComplete: 'Записать трату при выполнении',
  },
  dateTimeField: {
    label: 'Дедлайн',
    setDeadline: 'Задать дедлайн',
    noDeadline: 'Без дедлайна',
    datePlaceholder: 'ДД.ММ.ГГГГ',
    timePlaceholder: 'ЧЧ:ММ',
    invalidHint: 'Проверь дату — формат ДД.ММ.ГГГГ и ЧЧ:ММ, иначе дедлайн не сохранится',
  },
  subtaskChecklist: { title: 'Подзадачи', of: 'из', addPlaceholder: 'Новая подзадача' },
  tagInput: { title: 'Теги', addPlaceholder: 'Добавить тег и нажать ввод' },
  recurrence: {
    title: 'Повтор',
    none: 'Нет',
    daily: 'Ежедневно',
    weekly: 'По дням',
    monthly: 'Ежемесячно',
    every: 'Каждые',
    unitDays: 'дней',
    unitWeeks: 'недель',
    unitMonths: 'месяцев',
  },
  calendarScreen: { header: 'Календарь', emptyDay: 'На этот день ничего не запланировано' },
  financeScreen: {
    header: 'Финансы',
    categoriesLink: 'Категории',
    recentExpenses: 'Последние траты',
    emptyTitle: 'Пока нет трат',
    emptySubtitle: 'Добавь первую трату кнопкой «+»',
    thisMonth: 'Этот месяц',
    earned: 'Заработано',
    spent: 'Потрачено',
    bank: 'Банк',
    incoming: 'Должно прийти',
    total: 'Останется после дохода и трат',
    editBankTitle: 'Сколько у тебя на руках?',
    editBankHint: 'Задай текущую сумму — дальше траты будут вычитаться из неё, а подтверждённая зарплата добавляться.',
    salaryCredited: 'зарплата',
    accruing: 'набирается',
    plannedIncluded: 'уже минус плановые',
    plannedLink: 'Планы',
    recurringLink: 'Повторы',
    budgetTitle: 'Бюджет',
  },
  plannedExpenses: {
    title: 'Плановые траты',
    hint: 'Известные будущие траты, которые ещё не потрачены, но точно будут — вычитаются из прогноза в разделе "Финансы".',
    totalLabel: 'Итого',
    addButton: 'Добавить плановую трату',
  },
  recurringExpenses: {
    title: 'Повторяющиеся траты',
    hint: 'Аренда, подписки и другие траты, которые сами логируются по расписанию — не нужно вбивать каждый раз заново.',
    next: 'следующая:',
    addButton: 'Добавить повторяющуюся трату',
  },
  workCalendar: { worked: 'Рабочих', off: 'Выходных' },
  widgetMenu: { pick: '🖼️ Выбрать картинку', remove: '✕ Удалить картинку' },
  categoryPicker: { label: 'Категория' },
  expenseEditor: {
    headerNew: 'Новая трата',
    headerEdit: 'Редактировать трату',
    amountLabel: 'Сумма',
    dateLabel: 'Дата (ГГГГ-ММ-ДД)',
    commentLabel: 'Комментарий',
    commentPlaceholder: 'Необязательно',
    save: 'Сохранить',
    cancel: 'Отмена',
    delete: 'Удалить',
    invalidAmountTitle: 'Некорректная сумма',
    invalidAmountMessage: 'Введи сумму больше нуля.',
    missingCategoryTitle: 'Нужна категория',
    missingCategoryMessage: 'Выбери категорию траты.',
    deleteConfirmTitle: 'Удалить трату?',
    deleteConfirmCancel: 'Отмена',
    deleteConfirmOk: 'Удалить',
  },
  categoryManager: {
    header: 'Категории',
    done: 'Готово',
    deleteRow: 'Удалить',
    newCategory: 'Новая категория',
    namePlaceholder: 'Название',
    addButton: 'Добавить категорию',
    cannotDeleteTitle: 'Нельзя удалить',
    cannotDeleteMessage: (name, count) =>
      `У категории «${name}» есть ${count} ${
        ru.categoryManager.expenseWord(count)
      }. Сначала перенеси или удали их.`,
    expenseWord: (count) => (count === 1 ? 'трата' : 'трат'),
    editLimitTitle: 'Лимит категории',
    limitLabel: 'Лимит в месяц',
    limitPlaceholder: 'Без лимита',
    limitSet: (amount) => `Лимит: ${amount}`,
  },
  charts: { noDataForPeriod: 'Нет данных за период', noExpensesForPeriod: 'Нет трат за период' },
  stats: {
    header: 'Статистика',
    tasksTab: 'Задачи',
    financeTab: 'Финансы',
    createdPerWeek: 'Создано за неделю',
    completedPerWeek: 'Выполнено за неделю',
    overduePerWeek: 'Просрочено за неделю',
    earningsPerWeek: 'Заработок по неделям',
    expensesByCategory: 'Траты по категориям',
    topCategory: 'Больше всего:',
  },
  settingsScreen: {
    header: 'Настройки',
    earnings: 'Заработок',
    budget: 'Бюджет',
    theme: 'Тема',
    language: 'Язык',
    notifications: 'Уведомления',
    background: 'Фон приложения',
    limitsSet: 'Лимиты заданы',
    notSet: 'Не задан',
    themeLight: 'Светлая',
    themeDark: 'Тёмная',
    themeSystem: 'Системная',
    languageRu: 'Русский',
    languageUk: 'Українська',
    languageEn: 'English',
    notificationsOn: 'Включены',
    notificationsOff: 'Выключены',
    backgroundSet: 'Установлен',
    perHourShort: 'час',
  },
  earningsSettings: {
    title: 'Заработок',
    hourlyRate: 'Ставка в час',
    hoursPerShift: 'Часов за смену (по умолчанию)',
    currency: 'Валюта',
    payPeriodStartDay: 'День начала расчётного периода',
    payPeriodHint: 'Например, 15 — период считается с 15 числа по 14-е следующего месяца. Именно от этого зависит «Должно прийти» и когда старые отметки в календаре становятся серыми. По умолчанию 1 — обычный календарный месяц.',
    paydayDay: 'День зарплаты',
    paydayHint: 'С этого числа приложение спрашивает, пришла ли зарплата за закрытый период. Пока не подтвердишь, сумма висит в «Должно прийти», а после — уходит в Банк.',
  },
  budgetSettings: {
    title: 'Бюджет',
    weekLimit: 'Лимит на неделю',
    monthLimit: 'Лимит на месяц',
    notSetPlaceholder: 'Не задан',
  },
  themeSettings: { title: 'Тема', accentLabel: 'Акцентный цвет' },
  languageSettings: {
    title: 'Язык',
    note: 'Интерфейс переведён полностью — переключение применяется сразу.',
  },
  notificationsSettings: {
    title: 'Уведомления',
    enabled: 'Уведомления включены',
    disabled: 'Уведомления выключены',
    reminderLabel: 'Напоминать за N минут до дедлайна',
    note: 'На Android 12+ система может дополнительно попросить разрешение «Будильники и напоминания» в настройках приложения — без него точные напоминания могут приходить с задержкой.',
  },
  backgroundSettings: {
    title: 'Фон приложения',
    notSet: 'Фон не задан',
    pick: 'Выбрать картинку',
    replace: 'Заменить картинку',
    remove: 'Убрать фон',
  },
  homeWidgetSettings: {
    title: 'Виджет на главном экране',
    hint: 'Фото для фона виджета «Amber Ledger» на домашнем экране Android. Обновится сразу после сохранения.',
  },
  homeWidgets: {
    todayTitle: 'Сегодня',
    noTasks: 'Нет активных задач',
    spentToday: 'Потрачено сегодня',
    dayOffTitle: 'Выходной',
    dayOffToday: 'Сегодня',
    dayOffTomorrow: 'Завтра',
    dayOffIn: (days) => `Через ${days} дн.`,
    shiftsBefore: (shifts) => (shifts > 0 ? `${shifts} смен до него` : 'Смен до него нет'),
    noDayOff: 'Не отмечен',
    nextTaskTitle: 'Ближайшая задача',
    dueIn: (time) => `через ${time}`,
    overdueBy: (time) => `просрочено на ${time}`,
    moreToday: (count) => `ещё ${count} на сегодня`,
    days: 'д',
    hours: 'ч',
    minutes: 'мин',
  },
  designs: {
    settingsTitle: 'Дизайн приложения (тест)',
    settingsHint: 'Временная вкладка: переключай дизайны и пройдись по всем экранам. Работает и со светлой, и с тёмной темой. Потом оставим один.',
    amber: 'Янтарь',
    amberDescription: 'Текущий дизайн: тёплые цвета, карточки с рамкой, классическое меню.',
    neon: 'Неон',
    neonDescription: 'Ночной город: глубокий синий, светящиеся акценты, мягкие плавающие карточки, панель вкладок-капсула, крупный баланс по центру.',
    paper: 'Бумага',
    paperDescription: 'Блокнот: шрифт с засечками, тёплая бумага, линии вместо коробок, баланс как строчки в тетради, меню «⋯» снизу.',
    bold: 'Брутал',
    boldDescription: 'Громко и крупно: узкий жирный шрифт, толстые чёрные рамки с жёсткой тенью, кислотные акценты, баланс блоками.',
  },
  financeMenu: {
    recurringDescription: 'Подписки и регулярные платежи',
    plannedDescription: 'Будущие траты, уже учтённые в итоге',
    categoriesDescription: 'Цвета и лимиты категорий',
  },
  salaryPrompt: {
    title: 'Зарплата уже пришла?',
    expected: (amount, period) => `Ожидается ${amount} за ${period}`,
    yes: 'Да',
    otherAmount: 'Другая сумма',
    snooze: 'Отложить на день',
    amountLabel: 'Сколько пришло на карту?',
    save: 'Сохранить',
    cancel: 'Отмена',
    notificationTitle: 'Зарплата уже пришла?',
    notificationBody: (amount, period) => `Ожидается ${amount} за ${period}. Открой «Финансы», чтобы подтвердить.`,
  },
  notificationsContent: {
    permissionTitle: 'Разрешение на уведомления',
    permissionMessage:
      'Amber Ledger напоминает о дедлайнах задач и предупреждает, когда траты приближаются к лимиту бюджета. Разрешить уведомления?',
    notNow: 'Не сейчас',
    allow: 'Разрешить',
    disabledTitle: 'Уведомления отключены',
    disabledMessage: 'Включи уведомления для Amber Ledger в настройках системы, чтобы получать напоминания о задачах и бюджете.',
    deadlineIn: (min) => `Дедлайн через ${min} мин.`,
    deadlineNow: 'Дедлайн наступил',
    budgetExceededTitle: 'Бюджет превышен',
    budgetApproachingTitle: 'Приближение к лимиту бюджета',
    budgetMessage: (spent, limit, period) => `Траты за ${period}: ${spent} из ${limit}`,
    perWeek: 'неделю',
    perMonth: 'месяц',
    importantTask: 'Важная задача',
    deadlinePrefix: 'Дедлайн:',
    snooze10: 'Через 10 мин',
    snooze30: 'Через 30 мин',
    snooze60: 'Через час',
  },
};

const uk: Translation = {
  localeCode: 'uk-UA',
  tabs: { tasks: 'Завдання', calendar: 'Календар', finance: 'Фінанси', stats: 'Статистика', settings: 'Налаштування' },
  status: { all: 'Усі', notStarted: 'Не розпочато', inProgress: 'У процесі', done: 'Готово' },
  priority: { any: 'Будь-який пріоритет', low: 'Низький', medium: 'Середній', high: 'Високий' },
  weekdaysShort: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
  tasksScreen: {
    header: 'Завдання',
    emptyTitle: 'Поки що немає завдань',
    emptySubtitle: 'Натисни «+», щоб додати перше завдання',
    allTags: 'Усі теги',
    sortLabel: 'Сортування:',
    sortDeadline: 'За дедлайном',
    sortPriority: 'За пріоритетом',
    sortTag: 'За тегом',
    sortStatus: 'За статусом',
    sortCreated: 'За датою створення',
    sortManual: 'Вручну',
    filtersLabel: 'Фільтри',
    quickAddPlaceholder: 'Швидко додати завдання...',
    selectedCount: (count) => `Вибрано: ${count}`,
  },
  taskListItem: { today: 'Сьогодні' },
  taskEditor: {
    headerNew: 'Нове завдання',
    headerEdit: 'Редагувати завдання',
    titleLabel: 'Заголовок',
    titlePlaceholder: 'Що потрібно зробити?',
    descriptionLabel: 'Опис',
    descriptionPlaceholder: 'Деталі (необов’язково)',
    photoLabel: 'Фото',
    addPhoto: 'Додати фото',
    replacePhoto: 'Замінити',
    removePhoto: 'Видалити',
    priorityLabel: 'Пріоритет',
    statusLabel: 'Статус',
    important: '⭐ Важливе',
    markImportant: 'Позначити як важливе',
    save: 'Зберегти',
    cancel: 'Скасувати',
    deleteTask: 'Видалити завдання',
    missingTitleTitle: 'Потрібен заголовок',
    missingTitleMessage: 'Введи назву завдання.',
    deleteConfirmTitle: 'Видалити завдання?',
    deleteConfirmCancel: 'Скасувати',
    deleteConfirmOk: 'Видалити',
    logExpenseOnComplete: 'Записати витрату при виконанні',
  },
  dateTimeField: {
    label: 'Дедлайн',
    setDeadline: 'Задати дедлайн',
    noDeadline: 'Без дедлайну',
    datePlaceholder: 'ДД.ММ.РРРР',
    timePlaceholder: 'ГГ:ХХ',
    invalidHint: 'Перевір дату — формат ДД.ММ.РРРР та ГГ:ХХ, інакше дедлайн не збережеться',
  },
  subtaskChecklist: { title: 'Підзавдання', of: 'з', addPlaceholder: 'Нове підзавдання' },
  tagInput: { title: 'Теги', addPlaceholder: 'Додати тег і натиснути ввід' },
  recurrence: {
    title: 'Повтор',
    none: 'Немає',
    daily: 'Щодня',
    weekly: 'За днями',
    monthly: 'Щомісяця',
    every: 'Кожні',
    unitDays: 'днів',
    unitWeeks: 'тижнів',
    unitMonths: 'місяців',
  },
  calendarScreen: { header: 'Календар', emptyDay: 'На цей день нічого не заплановано' },
  financeScreen: {
    header: 'Фінанси',
    categoriesLink: 'Категорії',
    recentExpenses: 'Останні витрати',
    emptyTitle: 'Поки що немає витрат',
    emptySubtitle: 'Додай першу витрату кнопкою «+»',
    thisMonth: 'Цей місяць',
    earned: 'Зароблено',
    spent: 'Витрачено',
    bank: 'Банк',
    incoming: 'Має надійти',
    total: 'Залишиться після доходу і витрат',
    editBankTitle: 'Скільки у тебе на руках?',
    editBankHint: 'Задай поточну суму — далі витрати відніматимуться з неї, а підтверджена зарплата додаватиметься.',
    salaryCredited: 'зарплата',
    accruing: 'набирається',
    plannedIncluded: 'вже мінус планові',
    plannedLink: 'Плани',
    recurringLink: 'Повтори',
    budgetTitle: 'Бюджет',
  },
  plannedExpenses: {
    title: 'Планові витрати',
    hint: 'Відомі майбутні витрати, які ще не сплачені, але точно будуть — віднімаються з прогнозу в розділі "Фінанси".',
    totalLabel: 'Разом',
    addButton: 'Додати планову витрату',
  },
  recurringExpenses: {
    title: 'Повторювані витрати',
    hint: 'Оренда, підписки та інші витрати, які самі логуються за розкладом — не потрібно вводити щоразу заново.',
    next: 'наступна:',
    addButton: 'Додати повторювану витрату',
  },
  workCalendar: { worked: 'Робочих', off: 'Вихідних' },
  widgetMenu: { pick: '🖼️ Вибрати картинку', remove: '✕ Видалити картинку' },
  categoryPicker: { label: 'Категорія' },
  expenseEditor: {
    headerNew: 'Нова витрата',
    headerEdit: 'Редагувати витрату',
    amountLabel: 'Сума',
    dateLabel: 'Дата (РРРР-ММ-ДД)',
    commentLabel: 'Коментар',
    commentPlaceholder: 'Необов’язково',
    save: 'Зберегти',
    cancel: 'Скасувати',
    delete: 'Видалити',
    invalidAmountTitle: 'Некоректна сума',
    invalidAmountMessage: 'Введи суму більшу за нуль.',
    missingCategoryTitle: 'Потрібна категорія',
    missingCategoryMessage: 'Обери категорію витрати.',
    deleteConfirmTitle: 'Видалити витрату?',
    deleteConfirmCancel: 'Скасувати',
    deleteConfirmOk: 'Видалити',
  },
  categoryManager: {
    header: 'Категорії',
    done: 'Готово',
    deleteRow: 'Видалити',
    newCategory: 'Нова категорія',
    namePlaceholder: 'Назва',
    addButton: 'Додати категорію',
    cannotDeleteTitle: 'Не можна видалити',
    cannotDeleteMessage: (name, count) =>
      `У категорії «${name}» є ${count} ${uk.categoryManager.expenseWord(count)}. Спочатку перенеси або видали їх.`,
    expenseWord: (count) => (count === 1 ? 'витрата' : 'витрат'),
    editLimitTitle: 'Ліміт категорії',
    limitLabel: 'Ліміт на місяць',
    limitPlaceholder: 'Без ліміту',
    limitSet: (amount) => `Ліміт: ${amount}`,
  },
  charts: { noDataForPeriod: 'Немає даних за період', noExpensesForPeriod: 'Немає витрат за період' },
  stats: {
    header: 'Статистика',
    tasksTab: 'Завдання',
    financeTab: 'Фінанси',
    createdPerWeek: 'Створено за тиждень',
    completedPerWeek: 'Виконано за тиждень',
    overduePerWeek: 'Прострочено за тиждень',
    earningsPerWeek: 'Заробіток за тижнями',
    expensesByCategory: 'Витрати за категоріями',
    topCategory: 'Найбільше:',
  },
  settingsScreen: {
    header: 'Налаштування',
    earnings: 'Заробіток',
    budget: 'Бюджет',
    theme: 'Тема',
    language: 'Мова',
    notifications: 'Сповіщення',
    background: 'Фон застосунку',
    limitsSet: 'Ліміти задані',
    notSet: 'Не задано',
    themeLight: 'Світла',
    themeDark: 'Темна',
    themeSystem: 'Системна',
    languageRu: 'Російська',
    languageUk: 'Українська',
    languageEn: 'English',
    notificationsOn: 'Увімкнені',
    notificationsOff: 'Вимкнені',
    backgroundSet: 'Встановлено',
    perHourShort: 'год',
  },
  earningsSettings: {
    title: 'Заробіток',
    hourlyRate: 'Ставка за годину',
    hoursPerShift: 'Годин за зміну (за замовчуванням)',
    currency: 'Валюта',
    payPeriodStartDay: 'День початку розрахункового періоду',
    payPeriodHint: 'Наприклад, 15 — період рахується з 15 числа по 14-те наступного місяця. Саме від цього залежить «Має надійти» і коли старі позначки в календарі стають сірими. За замовчуванням 1 — звичайний календарний місяць.',
    paydayDay: 'День зарплати',
    paydayHint: 'З цього числа застосунок питає, чи прийшла зарплата за закритий період. Поки не підтвердиш, сума висить у «Має надійти», а після — йде в Банк.',
  },
  budgetSettings: {
    title: 'Бюджет',
    weekLimit: 'Ліміт на тиждень',
    monthLimit: 'Ліміт на місяць',
    notSetPlaceholder: 'Не задано',
  },
  themeSettings: { title: 'Тема', accentLabel: 'Акцентний колір' },
  languageSettings: {
    title: 'Мова',
    note: 'Інтерфейс перекладено повністю — перемикання застосовується одразу.',
  },
  notificationsSettings: {
    title: 'Сповіщення',
    enabled: 'Сповіщення увімкнені',
    disabled: 'Сповіщення вимкнені',
    reminderLabel: 'Нагадувати за N хвилин до дедлайну',
    note: 'На Android 12+ система може додатково попросити дозвіл «Будильники та нагадування» в налаштуваннях застосунку — без нього точні нагадування можуть приходити із затримкою.',
  },
  backgroundSettings: {
    title: 'Фон застосунку',
    notSet: 'Фон не задано',
    pick: 'Вибрати картинку',
    replace: 'Замінити картинку',
    remove: 'Прибрати фон',
  },
  homeWidgetSettings: {
    title: 'Віджет на головному екрані',
    hint: 'Фото для фону віджета «Amber Ledger» на домашньому екрані Android. Оновиться одразу після збереження.',
  },
  homeWidgets: {
    todayTitle: 'Сьогодні',
    noTasks: 'Немає активних задач',
    spentToday: 'Витрачено сьогодні',
    dayOffTitle: 'Вихідний',
    dayOffToday: 'Сьогодні',
    dayOffTomorrow: 'Завтра',
    dayOffIn: (days) => `Через ${days} дн.`,
    shiftsBefore: (shifts) => (shifts > 0 ? `${shifts} змін до нього` : 'Змін до нього немає'),
    noDayOff: 'Не позначено',
    nextTaskTitle: 'Найближча задача',
    dueIn: (time) => `через ${time}`,
    overdueBy: (time) => `прострочено на ${time}`,
    moreToday: (count) => `ще ${count} на сьогодні`,
    days: 'д',
    hours: 'год',
    minutes: 'хв',
  },
  designs: {
    settingsTitle: 'Дизайн застосунку (тест)',
    settingsHint: 'Тимчасова вкладка: перемикай дизайни й пройдись усіма екранами. Працює і зі світлою, і з темною темою. Потім залишимо один.',
    amber: 'Бурштин',
    amberDescription: 'Поточний дизайн: теплі кольори, картки з рамкою, класичне меню.',
    neon: 'Неон',
    neonDescription: 'Нічне місто: глибокий синій, світні акценти, м’які плаваючі картки, панель вкладок-капсула, великий баланс по центру.',
    paper: 'Папір',
    paperDescription: 'Блокнот: шрифт із засічками, теплий папір, лінії замість коробок, баланс як рядки в зошиті, меню «⋯» знизу.',
    bold: 'Брутал',
    boldDescription: 'Гучно й великими: вузький жирний шрифт, товсті чорні рамки з жорсткою тінню, кислотні акценти, баланс блоками.',
  },
  financeMenu: {
    recurringDescription: 'Підписки та регулярні платежі',
    plannedDescription: 'Майбутні витрати, вже враховані в підсумку',
    categoriesDescription: 'Кольори та ліміти категорій',
  },
  salaryPrompt: {
    title: 'Зарплата вже прийшла?',
    expected: (amount, period) => `Очікується ${amount} за ${period}`,
    yes: 'Так',
    otherAmount: 'Інша сума',
    snooze: 'Відкласти на день',
    amountLabel: 'Скільки прийшло на картку?',
    save: 'Зберегти',
    cancel: 'Скасувати',
    notificationTitle: 'Зарплата вже прийшла?',
    notificationBody: (amount, period) => `Очікується ${amount} за ${period}. Відкрий «Фінанси», щоб підтвердити.`,
  },
  notificationsContent: {
    permissionTitle: 'Дозвіл на сповіщення',
    permissionMessage:
      'Amber Ledger нагадує про дедлайни завдань і попереджає, коли витрати наближаються до ліміту бюджету. Дозволити сповіщення?',
    notNow: 'Не зараз',
    allow: 'Дозволити',
    disabledTitle: 'Сповіщення вимкнені',
    disabledMessage: 'Увімкни сповіщення для Amber Ledger у налаштуваннях системи, щоб отримувати нагадування про завдання та бюджет.',
    deadlineIn: (min) => `Дедлайн через ${min} хв.`,
    deadlineNow: 'Дедлайн настав',
    budgetExceededTitle: 'Бюджет перевищено',
    budgetApproachingTitle: 'Наближення до ліміту бюджету',
    budgetMessage: (spent, limit, period) => `Витрати за ${period}: ${spent} з ${limit}`,
    perWeek: 'тиждень',
    perMonth: 'місяць',
    importantTask: 'Важливе завдання',
    deadlinePrefix: 'Дедлайн:',
    snooze10: 'Через 10 хв',
    snooze30: 'Через 30 хв',
    snooze60: 'Через годину',
  },
};

const en: Translation = {
  localeCode: 'en-US',
  tabs: { tasks: 'Tasks', calendar: 'Calendar', finance: 'Finance', stats: 'Stats', settings: 'Settings' },
  status: { all: 'All', notStarted: 'Not started', inProgress: 'In progress', done: 'Done' },
  priority: { any: 'Any priority', low: 'Low', medium: 'Medium', high: 'High' },
  weekdaysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  tasksScreen: {
    header: 'Tasks',
    emptyTitle: 'No tasks yet',
    emptySubtitle: 'Tap "+" to add your first task',
    allTags: 'All tags',
    sortLabel: 'Sort:',
    sortDeadline: 'By deadline',
    sortPriority: 'By priority',
    sortTag: 'By tag',
    sortStatus: 'By status',
    sortCreated: 'By date created',
    sortManual: 'Manual',
    filtersLabel: 'Filters',
    quickAddPlaceholder: 'Quick add a task...',
    selectedCount: (count) => `Selected: ${count}`,
  },
  taskListItem: { today: 'Today' },
  taskEditor: {
    headerNew: 'New Task',
    headerEdit: 'Edit Task',
    titleLabel: 'Title',
    titlePlaceholder: 'What needs to be done?',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'Details (optional)',
    photoLabel: 'Photo',
    addPhoto: 'Add photo',
    replacePhoto: 'Replace',
    removePhoto: 'Remove',
    priorityLabel: 'Priority',
    statusLabel: 'Status',
    important: '⭐ Important',
    markImportant: 'Mark as important',
    save: 'Save',
    cancel: 'Cancel',
    deleteTask: 'Delete task',
    missingTitleTitle: 'Title required',
    missingTitleMessage: 'Enter a task title.',
    deleteConfirmTitle: 'Delete this task?',
    deleteConfirmCancel: 'Cancel',
    deleteConfirmOk: 'Delete',
    logExpenseOnComplete: 'Log expense on completion',
  },
  dateTimeField: {
    label: 'Deadline',
    setDeadline: 'Set deadline',
    noDeadline: 'No deadline',
    datePlaceholder: 'DD.MM.YYYY',
    timePlaceholder: 'HH:MM',
    invalidHint: "Check the date — use DD.MM.YYYY and HH:MM, otherwise the deadline won't be saved",
  },
  subtaskChecklist: { title: 'Subtasks', of: 'of', addPlaceholder: 'New subtask' },
  tagInput: { title: 'Tags', addPlaceholder: 'Add a tag and press enter' },
  recurrence: {
    title: 'Repeat',
    none: 'None',
    daily: 'Daily',
    weekly: 'By weekday',
    monthly: 'Monthly',
    every: 'Every',
    unitDays: 'days',
    unitWeeks: 'weeks',
    unitMonths: 'months',
  },
  calendarScreen: { header: 'Calendar', emptyDay: 'Nothing planned for this day' },
  financeScreen: {
    header: 'Finance',
    categoriesLink: 'Categories',
    recentExpenses: 'Recent expenses',
    emptyTitle: 'No expenses yet',
    emptySubtitle: 'Add your first expense with the "+" button',
    thisMonth: 'This month',
    earned: 'Earned',
    spent: 'Spent',
    bank: 'Bank',
    incoming: 'Incoming',
    total: 'Left after income and expenses',
    editBankTitle: 'How much do you have on hand?',
    editBankHint: 'Set your current amount — after that, expenses are subtracted from it and confirmed salary is added.',
    salaryCredited: 'salary',
    accruing: 'accruing',
    plannedIncluded: 'already minus planned',
    plannedLink: 'Planned',
    recurringLink: 'Recurring',
    budgetTitle: 'Budget',
  },
  plannedExpenses: {
    title: 'Planned Expenses',
    hint: "Known future expenses that haven't happened yet — subtracted from the forecast on the Finance tab.",
    totalLabel: 'Total',
    addButton: 'Add planned expense',
  },
  recurringExpenses: {
    title: 'Recurring Expenses',
    hint: "Rent, subscriptions, and other expenses that log themselves on a schedule — no need to re-enter them every time.",
    next: 'next:',
    addButton: 'Add recurring expense',
  },
  workCalendar: { worked: 'Worked', off: 'Off' },
  widgetMenu: { pick: '🖼️ Choose picture', remove: '✕ Remove picture' },
  categoryPicker: { label: 'Category' },
  expenseEditor: {
    headerNew: 'New Expense',
    headerEdit: 'Edit Expense',
    amountLabel: 'Amount',
    dateLabel: 'Date (YYYY-MM-DD)',
    commentLabel: 'Comment',
    commentPlaceholder: 'Optional',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    invalidAmountTitle: 'Invalid amount',
    invalidAmountMessage: 'Enter an amount greater than zero.',
    missingCategoryTitle: 'Category required',
    missingCategoryMessage: 'Choose an expense category.',
    deleteConfirmTitle: 'Delete this expense?',
    deleteConfirmCancel: 'Cancel',
    deleteConfirmOk: 'Delete',
  },
  categoryManager: {
    header: 'Categories',
    done: 'Done',
    deleteRow: 'Delete',
    newCategory: 'New category',
    namePlaceholder: 'Name',
    addButton: 'Add category',
    cannotDeleteTitle: "Can't delete",
    cannotDeleteMessage: (name, count) =>
      `Category "${name}" still has ${count} ${en.categoryManager.expenseWord(count)}. Move or delete them first.`,
    expenseWord: (count) => (count === 1 ? 'expense' : 'expenses'),
    editLimitTitle: 'Category limit',
    limitLabel: 'Monthly limit',
    limitPlaceholder: 'No limit',
    limitSet: (amount) => `Limit: ${amount}`,
  },
  charts: { noDataForPeriod: 'No data for this period', noExpensesForPeriod: 'No expenses for this period' },
  stats: {
    header: 'Stats',
    tasksTab: 'Tasks',
    financeTab: 'Finance',
    createdPerWeek: 'Created per week',
    completedPerWeek: 'Completed per week',
    overduePerWeek: 'Overdue per week',
    earningsPerWeek: 'Earnings per week',
    expensesByCategory: 'Expenses by category',
    topCategory: 'Top:',
  },
  settingsScreen: {
    header: 'Settings',
    earnings: 'Earnings',
    budget: 'Budget',
    theme: 'Theme',
    language: 'Language',
    notifications: 'Notifications',
    background: 'App background',
    limitsSet: 'Limits set',
    notSet: 'Not set',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    languageRu: 'Русский',
    languageUk: 'Українська',
    languageEn: 'English',
    notificationsOn: 'On',
    notificationsOff: 'Off',
    backgroundSet: 'Set',
    perHourShort: 'hr',
  },
  earningsSettings: {
    title: 'Earnings',
    hourlyRate: 'Hourly rate',
    hoursPerShift: 'Hours per shift (default)',
    currency: 'Currency',
    payPeriodStartDay: 'Pay period start day',
    payPeriodHint: "E.g. 15 — the period runs from the 15th through the 14th of the next month. This drives \"Incoming\" and when past calendar marks turn gray. Default 1 = plain calendar month.",
    paydayDay: 'Payday',
    paydayHint: "From this day the app asks whether the salary for the closed period has arrived. Until you confirm, it stays in \"Incoming\"; after that it moves into Bank.",
  },
  budgetSettings: {
    title: 'Budget',
    weekLimit: 'Weekly limit',
    monthLimit: 'Monthly limit',
    notSetPlaceholder: 'Not set',
  },
  themeSettings: { title: 'Theme', accentLabel: 'Accent color' },
  languageSettings: {
    title: 'Language',
    note: 'The interface is fully translated — switching applies immediately.',
  },
  notificationsSettings: {
    title: 'Notifications',
    enabled: 'Notifications on',
    disabled: 'Notifications off',
    reminderLabel: 'Remind N minutes before deadline',
    note: 'On Android 12+, the system may separately ask for the "Alarms & reminders" permission in app settings — without it, exact reminders may arrive late.',
  },
  backgroundSettings: {
    title: 'App background',
    notSet: 'No background set',
    pick: 'Choose picture',
    replace: 'Replace picture',
    remove: 'Remove background',
  },
  homeWidgetSettings: {
    title: 'Home screen widget',
    hint: 'Background photo for the "Amber Ledger" Android home screen widget. Updates immediately after saving.',
  },
  homeWidgets: {
    todayTitle: 'Today',
    noTasks: 'No active tasks',
    spentToday: 'Spent today',
    dayOffTitle: 'Day off',
    dayOffToday: 'Today',
    dayOffTomorrow: 'Tomorrow',
    dayOffIn: (days) => `In ${days} days`,
    shiftsBefore: (shifts) => (shifts > 0 ? `${shifts} shifts before it` : 'No shifts before it'),
    noDayOff: 'Not marked',
    nextTaskTitle: 'Next task',
    dueIn: (time) => `in ${time}`,
    overdueBy: (time) => `overdue by ${time}`,
    moreToday: (count) => `${count} more today`,
    days: 'd',
    hours: 'h',
    minutes: 'min',
  },
  designs: {
    settingsTitle: 'App design (test)',
    settingsHint: 'Temporary tab: switch designs and walk through every screen. Works with both light and dark mode. We will keep one later.',
    amber: 'Amber',
    amberDescription: 'Current design: warm colours, outlined cards, classic menu.',
    neon: 'Neon',
    neonDescription: 'Night city: deep blue, glowing accents, soft floating cards, pill tab bar, big centred balance.',
    paper: 'Paper',
    paperDescription: 'Notebook: serif type, warm paper, lines instead of boxes, balance as ledger rows, "⋯" bottom menu.',
    bold: 'Bold',
    boldDescription: 'Loud and chunky: condensed bold type, thick black outlines with a hard shadow, acid accents, balance in blocks.',
  },
  financeMenu: {
    recurringDescription: 'Subscriptions and regular payments',
    plannedDescription: 'Future expenses already included in the total',
    categoriesDescription: 'Category colours and limits',
  },
  salaryPrompt: {
    title: 'Did you get your salary yet?',
    expected: (amount, period) => `Expected ${amount} for ${period}`,
    yes: 'Yes',
    otherAmount: 'Different amount',
    snooze: 'Remind me in a day',
    amountLabel: 'How much arrived?',
    save: 'Save',
    cancel: 'Cancel',
    notificationTitle: 'Did you get your salary yet?',
    notificationBody: (amount, period) => `Expected ${amount} for ${period}. Open Finance to confirm.`,
  },
  notificationsContent: {
    permissionTitle: 'Notification permission',
    permissionMessage:
      'Amber Ledger reminds you about task deadlines and warns when spending approaches your budget limit. Allow notifications?',
    notNow: 'Not now',
    allow: 'Allow',
    disabledTitle: 'Notifications disabled',
    disabledMessage: 'Enable notifications for Amber Ledger in system settings to get task and budget reminders.',
    deadlineIn: (min) => `Deadline in ${min} min`,
    deadlineNow: 'Deadline reached',
    budgetExceededTitle: 'Budget exceeded',
    budgetApproachingTitle: 'Approaching budget limit',
    budgetMessage: (spent, limit, period) => `Spent this ${period}: ${spent} of ${limit}`,
    perWeek: 'week',
    perMonth: 'month',
    importantTask: 'Important task',
    deadlinePrefix: 'Deadline:',
    snooze10: 'In 10 min',
    snooze30: 'In 30 min',
    snooze60: 'In an hour',
  },
};

export const translations = { ru, uk, en };
