export interface Translation {
  localeCode: string;
  tabs: { tasks: string; calendar: string; finance: string; stats: string; settings: string };
  status: { notStarted: string; inProgress: string; done: string };
  priority: { low: string; medium: string; high: string };
  weekdaysShort: string[];
  onboarding: {
    continue: string;
    back: string;
    profileTitle: string;
    profileSubtitle: string;
    passwordTitle: string;
    passwordHint: string;
    passwordPlaceholder: string;
    repeatPlaceholder: string;
    passwordAlreadySet: string;
  };
  whatsNew: { done: string; releases: Record<string, { title: string; text: string }[]> };
  welcome: { slides: { title: string; text: string }[]; skip: string; next: string; start: string };
  tasksScreen: {
    header: string;
    emptyTitle: string;
    emptySubtitle: string;
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
    streak: string;
    streakHint: string;
  };
  habits: { doneToday: string; markDone: string; next: (day: string) => string };
  calendarScreen: { header: string; emptyDay: string; doneSection: string; addedSection: string };
  auth: {
    title: string;
    passwordLabel: string;
    wrong: string;
    confirm: string;
    cancel: string;
    devicePrompt: string;
    showPassword: string;
    hidePassword: string;
  };
  storage: {
    title: string;
    hint: string;
    counts: (tasks: number, expenses: number) => string;
    autoTitle: string;
    autoHint: string;
    off: string;
    months: (n: number) => string;
    eraseTitle: string;
    eraseTasks: string;
    eraseFinance: string;
    eraseProfile: string;
    eraseAll: string;
    confirmTitle: string;
    confirmTasks: string;
    confirmFinance: string;
    confirmProfile: string;
    confirmAll: string;
    erase: string;
    cancel: string;
    countdown: string;
    countdownHint: string;
    done: string;
    transferTitle: string;
    transferHint: string;
    transferButton: string;
  };
  transfer: {
    title: string;
    sendTitle: string;
    sendHint: string;
    receiveTitle: string;
    receiveHint: string;
    preparing: string;
    scanHint: (where: string) => string;
    where: string;
    expiresIn: (time: string) => string;
    expired: string;
    sent: string;
    again: string;
    cameraTitle: string;
    cameraText: string;
    cameraGrant: string;
    pointCamera: string;
    fromGallery: string;
    noQrInPhoto: string;
    notOurCode: string;
    codeExpired: string;
    confirmTitle: string;
    confirmText: string;
    replace: string;
    cancel: string;
    receiving: string;
    received: string;
    failed: string;
    noNetwork: string;
    needsApp: string;
    welcomeTitle: string;
    welcomeText: string;
    welcomeYes: string;
    welcomeNo: string;
  };
  financeScreen: {
    header: string;
    categoriesLink: string;
    recentExpenses: string;
    listInfoTitle: string;
    listInfo: (nextClear: string) => string;
    emptyTitle: string;
    emptySubtitle: string;
    thisMonth: string;
    earned: string;
    spent: string;
    bank: string;
    inPlans: string;
    free: string;
    incoming: string;
    total: string;
    editBankTitle: (currency: string) => string;
    editBankHint: string;
    salaryCredited: string;
    accruing: string;
    plannedIncluded: string;
    plannedLink: string;
    recurringLink: string;
    rateLink: string;
    budgetTitle: string;
  };
  accounts: {
    card: string,
    cash: string,
    addWidget: string,
    addTitle: string,
    addCard: string,
    addCash: string,
    cardsLimit: (max: number) => string,
    bankName: string,
    bankNamePlaceholder: string,
    cashName: string,
    cashNamePlaceholder: string,
    currency: string,
    cardBalanceTitle: (currency: string) => string,
    cashBalanceTitle: (currency: string) => string,
    balanceHint: string,
    create: string,
    save: string,
    cancel: string,
    edit: string,
    setBalance: string,
    remove: string,
    removeTitle: string,
    removeText: string,
    transfer: string,
    transferFrom: string,
    transferTo: string,
    amountSent: (currency: string) => string,
    amountReceived: (currency: string) => string,
    history: string,
    noTransfers: string,
    payFrom: string,
    salaryQuestion: string,
    salaryHint: string,
    salaryAccount: string,
    spent: string,
    salary: string,
    stash: string,
    goal: string,
    addStash: string,
    addGoal: string,
    addLoan: string,
    stashesLimit: (max: number) => string,
    goalsLimit: (max: number) => string,
    loansLimit: (max: number) => string,
    stashBalanceTitle: (currency: string) => string,
    stashHint: string,
    stashNamePlaceholder: string,
    goalName: string,
    goalNamePlaceholder: string,
    goalTarget: (currency: string) => string,
    goalSaved: (currency: string) => string,
    putAside: string,
    changeTarget: string,
    noSource: string,
    goalReached: string,
  },
  loans: {
    title: string,
    name: string,
    namePlaceholder: string,
    principal: (currency: string) => string,
    rate: string,
    months: string,
    firstPayment: string,
    paidAlready: string,
    monthly: string,
    left: string,
    overpay: string,
    paid: (done: number, total: number) => string,
    next: (date: string) => string,
    inDays: (days: number) => string,
    today: string,
    overdue: (days: number) => string,
    pay: string,
    payFrom: string,
    payTitle: (amount: string) => string,
    paidOff: string,
    edit: string,
    remove: string,
    removeTitle: string,
    removeText: string,
    save: string,
    create: string,
    cancel: string,
    reminderTitle: string,
    reminderBody: (name: string, amount: string, date: string) => string,
  },
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
  widgetMenu: { pick: string; remove: string; shape: string };
  cardShape: { title: string; theme: string; square: string; rounded: string; round: string; leaf: string };
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
    languageUk: string;
    languageEn: string;
    notificationsOn: string;
    notificationsOff: string;
    backgroundSet: string;
    support: string;
    supportValue: string;
    channel: string;
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
    payouts: string;
    payoutsOnce: string;
    payoutsTwice: string;
    advanceDay: string;
    advanceHint: string;
  };
  budgetSettings: { title: string; weekLimit: string; monthLimit: string; notSetPlaceholder: string };
  themeSettings: { title: string; accentLabel: string };
  languageSettings: { title: string; note: string };
  notificationsSettings: { title: string; enabled: string; disabled: string; reminderLabel: string; note: string };
  backgroundSettings: { title: string; notSet: string; pick: string; replace: string; remove: string };
  homeWidgetSettings: { title: string; hint: string; big: string; medium: string; small: string; streak: string };
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
    streakChoose: string;
  };
  layoutEdit: {
    edit: string;
    done: string;
    perRow: string;
    order: string;
    byDeadline: string;
    ownOrder: string;
    resize: string;
    remove: string;
    hiddenTitle: string;
    hiddenEmpty: string;
    modules: { balance: string; spendWeek: string; spendMonth: string; budget: string; workCalendar: string };
  };
  plans: {
    toggle: string;
    toggleHint: string;
    nameLabel: string;
    namePlaceholder: string;
    limitLabel: string;
    spentLabel: string;
    add: string;
    history: string;
    noSpends: string;
    changeLimit: string;
    confirmChangeTitle: string;
    confirmChangeText: string;
    confirmYes: string;
    cancel: string;
    passwordLabel: string;
    passwordWrong: string;
    confirm: string;
    devicePrompt: string;
    monthEnd: string;
    nextLimit: (amount: string) => string;
    newPeriod: string;
    reset: string;
    changeBudget: string;
    newLimit: string;
    save: string;
    remove: string;
    removeTitle: string;
    removeText: string;
    overspend: string;
    planTag: string;
    editorNote: string;
  };
  level: { tasksDone: string; sound: string; soundHint: string };
  habitWidget: { title: string; subtitle: string; empty: string; done: string };
  defaultCategories: { 'cat-food': string; 'cat-transport': string; 'cat-housing': string; 'cat-fun': string; 'cat-other': string };
  layoutText: {
    noDeadline: string;
    focus: string;
    done: string;
    next: string;
    expenses: string;
    styleLabel: string;
  };
  layouts: {
    label: string;
    standard: string;
    v3: string;
  };
  designs: {
    amber: string;
    amberDescription: string;
    neon: string;
    neonDescription: string;
    paper: string;
    paperDescription: string;
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
  profileSettings: {
    title: string;
    namePlaceholder: string;
    noName: string;
    changePhoto: string;
    removePhoto: string;
    passwordSection: string;
    passwordHint: string;
    currentPassword: string;
    newPassword: string;
    repeatPassword: string;
    setPassword: string;
    changePassword: string;
    passwordSet: string;
    passwordNotSet: string;
    tooShort: (min: number) => string;
    mismatch: string;
    wrongPassword: string;
    saved: string;
    forgotPassword: string;
    resetPrompt: string;
    resetUnlocked: string;
    resetNoDeviceLock: string;
  };
  securitySettings: {
    title: string;
    lockFinances: string;
    lockFinancesHint: string;
    needPassword: string;
    goToProfile: string;
    method: string;
    methodDevice: string;
    methodPassword: string;
    noBiometrics: string;
    relockAfter: string;
    relockHint: (max: number) => string;
    minutes: string;
  };
  financeLock: {
    title: string;
    subtitle: string;
    unlock: string;
    usePassword: string;
    passwordPlaceholder: string;
    wrongPassword: string;
    prompt: string;
    cancel: string;
  };
  savings: {
    title: string;
    askTitle: string;
    askSubtitle: string;
    yes: string;
    no: string;
    balance: string;
    rate: string;
    openedAt: string;
    openedAtHint: string;
    yearEnds: (month: string) => string;
    projection: (amount: string, interest: string) => string;
    afterTax: string;
    notConfigured: string;
    editTitle: string;
    save: string;
    cancel: string;
    hideCard: string;
    settingsToggle: string;
    settingsToggleHint: string;
  };
}

const uk: Translation = {
  localeCode: 'uk-UA',
  tabs: { tasks: 'Завдання', calendar: 'Календар', finance: 'Фінанси', stats: 'Статистика', settings: 'Налаштування' },
  status: { notStarted: 'Не розпочато', inProgress: 'У процесі', done: 'Готово' },
  priority: { low: 'Низький', medium: 'Середній', high: 'Високий' },
  weekdaysShort: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
  onboarding: {
    continue: 'Продовжити',
    back: 'Назад',
    profileTitle: 'Створи профіль',
    profileSubtitle: 'Як тебе звати? Фото — за бажанням.',
    passwordTitle: 'Пароль (необов’язково)',
    passwordHint: 'Потрібен для блокування фінансів. Відновити забутий пароль неможливо. Можна задати пізніше в налаштуваннях.',
    passwordPlaceholder: 'Пароль',
    repeatPlaceholder: 'Повтори пароль',
    passwordAlreadySet: 'Пароль уже задано ✓',
  },
  whatsNew: {
    done: 'Круто!',
    releases: {
      '1.2.0': [
        { title: 'Що нового в 1.2.0', text: 'Невелике велике оновлення — погортай, покажемо головне.' },
        { title: 'Звички й серії 🔥', text: 'Увімкни «Рахувати серію» у задачі, що повторюється, — вона стане карткою з вогником угорі задач. Тап — зроблено сьогодні.' },
        { title: 'Кільце рівня', text: 'Кожна виконана задача заповнює поділку кільця — зі звуком. Десять задач — нове коло.' },
        { title: 'Розстав як подобається', text: 'Олівець ✏️ на задачах, фінансах, статистиці та в календарі: перетягуй картки, змінюй розмір і форму кутів.' },
        { title: 'Віджет серії', text: 'Маленький квадрат 1×1 на робочий стіл — вогник і число. Натисни, щоб вибрати звичку.' },
      ],
      '1.3.0': [
        { title: 'Що нового в 1.3.0', text: 'Велике оновлення фінансів і даних — погортай, покажемо головне.' },
        { title: 'Планові витрати 🌊', text: 'Увімкни «Планова витрата» під час додавання витрати: ліміт одразу спишеться, а покупки заповнять шкалу хвилею. Перевитрата — червоним, 1-го числа план почнеться знову.' },
        { title: 'Чесніший банк', text: 'Угорі — скільки на рахунку, під ним — скільки вільно з урахуванням планів. Видалив витрату чи задачу з витратою — гроші повернуться.' },
        { title: 'Календар — архів', text: 'Будь-якого дня видно, що зроблено й додано. Список витрат у Фінансах — лише за місяць, уся історія лишається в календарі.' },
        { title: "Безпека й пам'ять", text: 'Автоочищення старого, стирання даних з відліком і паролем — у налаштуваннях.' },
        { title: 'Перенесення за QR', text: 'Новий телефон? Перенеси задачі, фінанси й профіль за QR-кодом через Wi-Fi, без інтернету.' },
        { title: 'Свій набір віджетів', text: 'У режимі олівця ✏️ прибирай непотрібні картки кнопкою «−», повернути — через «⋮».' },
      ],
      '1.3.1': [
        { title: 'Що нового в 1.3.1', text: 'Невеликі, але важливі виправлення.' },
        { title: 'Сканер QR працює', text: 'Камера під час перенесення більше не показує чорний екран. А QR можна взяти й із фото в галереї.' },
        { title: 'Забули пароль?', text: 'Профіль → Пароль: підтвердіть відбитком або PIN телефону й задайте новий — старий не потрібен.' },
      ],
      '1.3.2': [
        { title: 'Що нового в 1.3.2', text: "Тепер з нами легко зв'язатися." },
        { title: 'Підтримка', text: 'Налаштування → Підтримка: напишіть нашому боту про помилку, ідею чи питання — можна зі скріншотами.' },
        { title: 'Наш канал', text: 'Нові версії та новини — у Telegram-каналі @amberledger.' },
        { title: 'Легший на 20 МБ', text: 'Застосунок став меншим: тепер лише для 64-бітних телефонів.' },
      ],
      '1.3.3': [
        { title: 'Що нового в 1.3.3', text: 'Дрібні покращення та виправлення.' },
      ],
      '1.4.0': [
        { title: 'Що нового в 1.4.0', text: 'Велике оновлення фінансів: картки, готівка, цілі й кредити. Погортай.' },
        { title: 'Картки й готівка 💳', text: 'До 3 карток з назвою банку і готівка в будь-якій валюті. У витраті обираєш, чим платиш. Олівець → «+».' },
        { title: 'Перекази', text: 'Зняв готівку в банкоматі? Тапни на готівку → «Переказ», і сума переїде з картки.' },
        { title: 'Заначки 🫙', text: 'До 5 сум «на пам’ять» — наприклад, євро на поїздку. Без курсів, просто щоб знати.' },
        { title: 'Цілі 🎯', text: 'Збираєш на щось? Ціль заповнюється хвилею, а «Відкласти» знімає гроші з картки або просто рахує.' },
        { title: 'Кредити 🏦', text: 'До 3 кредитів: щомісячний платіж, залишок і переплата рахуються самі. Нагадаємо за 5 днів до платежу.' },
        { title: 'Аванс', text: 'Гроші приходять двічі на місяць? Увімкни аванс у «Заробітку».' },
        { title: 'Майбутні витрати', text: 'Витрата на майбутню дату тепер знімається з балансу саме в цей день. А пароль можна показати оком 👁.' },
      ],
    },
  },
  welcome: {
    slides: [
      { title: 'Ласкаво просимо до Amber Ledger', text: 'Задачі й гроші в одному місці. Погортай — покажемо, що тут є.' },
      { title: 'Задачі', text: 'Терміни, пріоритети, підзадачі та повтори. Довге натискання на «+» — швидке додавання.' },
      { title: 'Звички 🔥', text: 'Увімкни «Рахувати серію» у задачі, що повторюється, — вона стане карткою зі стріком угорі.' },
      { title: 'Календар', text: 'Задачі та робочі зміни по днях — і вся історія: що зробив і скільки витратив будь-якого дня.' },
      { title: 'Фінанси', text: 'Баланс, зарплата за період і витрати. Планова витрата з лімітом заповнює шкалу й покаже, скільки лишилося.' },
      { title: 'Статистика', text: 'Тиждень у графіках: виконані задачі та витрати за категоріями.' },
      { title: 'Під себе', text: 'Теми, макети, віджети — зайві прибирай олівцем ✏️. Замок фінансів, пам\'ять і перенесення на інший телефон — у налаштуваннях.' },
    ],
    skip: 'Пропустити',
    next: 'Далі',
    start: 'Почати',
  },
  tasksScreen: {
    header: 'Завдання',
    emptyTitle: 'Поки що немає завдань',
    emptySubtitle: 'Натисни «+», щоб додати перше завдання',
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
    streak: 'Рахувати серію',
    streakHint: 'Задача стане звичкою з вогником 🔥 угорі екрана задач',
  },
  habits: { doneToday: 'Зроблено', markDone: 'Позначити', next: (day) => `Далі: ${day}` },
  calendarScreen: { header: 'Календар', emptyDay: 'Цього дня нічого немає', doneSection: 'Виконано', addedSection: 'Додано' },
  auth: {
    title: 'Підтверди, що це ти',
    passwordLabel: 'Пароль профілю',
    wrong: 'Невірний пароль',
    confirm: 'Підтвердити',
    cancel: 'Скасувати',
    devicePrompt: 'Підтверди дію',
    showPassword: 'Показати пароль',
    hidePassword: 'Сховати пароль',
  },
  storage: {
    title: "Пам'ять",
    hint: 'Усі дані зберігаються лише на цьому телефоні й самі не видаляються.',
    counts: (tasks, expenses) => `Задач: ${tasks} · Витрат: ${expenses}`,
    autoTitle: 'Автоочищення',
    autoHint: 'Видаляти виконані задачі й витрати, старші за обраний строк, — і з Календаря теж. Звички, поточні плани й сума в банку не змінюються.',
    off: 'Вимк',
    months: (n) => `${n} міс`,
    eraseTitle: 'Стерти дані',
    eraseTasks: 'Стерти задачі',
    eraseFinance: 'Стерти фінанси',
    eraseProfile: 'Стерти профіль',
    eraseAll: 'Стерти все',
    confirmTitle: 'Точно стерти?',
    confirmTasks: 'Усі задачі, звички та їхня історія видаляться назавжди.',
    confirmFinance: 'Усі витрати, плани, повтори, робочі дні й баланс видаляться назавжди.',
    confirmProfile: "Ім'я, фото й пароль профілю видаляться. Замок фінансів вимкнеться.",
    confirmAll: 'Видалиться все: задачі, фінанси, профіль і налаштування. Застосунок почнеться з першого запуску.',
    erase: 'Стерти',
    cancel: 'Скасувати',
    countdown: 'Стирання всіх даних',
    countdownHint: 'Ще можна передумати',
    done: 'Готово, дані стерто',
    transferTitle: 'Перенесення на інший телефон',
    transferHint: 'Усі задачі, витрати й налаштування переїдуть за QR-кодом через Wi-Fi — без інтернету й без файлів. Фото й пароль лишаються на цьому телефоні.',
    transferButton: 'Перенести дані',
  },
  transfer: {
    title: 'Перенесення даних',
    sendTitle: 'Надіслати з цього телефона',
    sendHint: 'Покаже QR-код для іншого телефона',
    receiveTitle: 'Отримати на цей телефон',
    receiveHint: 'Відскануй QR-код зі старого телефона',
    preparing: 'Готую дані…',
    scanHint: (where) => `На іншому телефоні відкрий ${where} → «Отримати на цей телефон» і наведи камеру на код.`,
    where: "Налаштування → Безпека й пам'ять → Перенести дані",
    expiresIn: (time) => `Код діє ще ${time}`,
    expired: 'Час вийшов — код більше не діє',
    sent: 'Дані надіслано ✓',
    again: 'Показати новий код',
    cameraTitle: 'Потрібна камера',
    cameraText: 'Камера потрібна лише щоб прочитати QR-код з іншого телефона. Нічого не знімається й не зберігається.',
    cameraGrant: 'Дозволити камеру',
    pointCamera: 'Наведи камеру на QR-код на іншому телефоні',
    fromGallery: 'Вибрати фото з QR',
    noQrInPhoto: 'На цьому фото не знайшлося QR-коду',
    notOurCode: 'Це не QR-код перенесення Amber Ledger',
    codeExpired: 'Цей код уже не діє — покажи новий на іншому телефоні',
    confirmTitle: 'Перенести дані сюди?',
    confirmText: 'Усі задачі й фінанси на цьому телефоні заміняться даними з іншого телефона.',
    replace: 'Перенести',
    cancel: 'Скасувати',
    receiving: 'Отримую дані…',
    received: 'Готово, дані перенесено ✓',
    failed: "Не вдалося зв'язатися з іншим телефоном. Обидва мають бути в одній Wi-Fi мережі (або один роздає точку доступу іншому), а код — ще відкритий.",
    noNetwork: 'Цей телефон не в Wi-Fi мережі. Підключись до Wi-Fi або увімкни точку доступу.',
    needsApp: 'Перенесення працює лише у встановленому застосунку (APK), не в Expo Go.',
    welcomeTitle: 'Переносиш дані зі старого телефона?',
    welcomeText: 'Якщо Amber Ledger уже стоїть на іншому телефоні — перенеси задачі, фінанси й профіль за QR-кодом. Обидва телефони мають бути в одній Wi-Fi мережі.',
    welcomeYes: 'Так, перенести',
    welcomeNo: 'Ні, почати з нуля',
  },
  financeScreen: {
    header: 'Фінанси',
    categoriesLink: 'Категорії',
    recentExpenses: 'Останні витрати',
    listInfoTitle: 'Список витрат за місяць',
    listInfo: (nextClear) =>
      `Тут лише витрати цього місяця. 1-го числа кожного місяця список очищається — наступного разу ${nextClear}.\n\nВитрати при цьому не видаляються: вони лишаються в Календарі (обери день) і в Статистиці, а сума в банку не змінюється.`,
    emptyTitle: 'Поки що немає витрат',
    emptySubtitle: 'Додай першу витрату кнопкою «+»',
    thisMonth: 'Цей місяць',
    earned: 'Зароблено',
    spent: 'Витрачено',
    bank: 'Банк',
    inPlans: 'у планах',
    free: 'вільно',
    incoming: 'Має надійти',
    total: 'Після зарплати',
    editBankTitle: (currency) => `Скільки грошей на картці (${currency})?`,
    editBankHint: 'Впиши суму, як у застосунку банку. Далі витрати з цієї картки відніматимуться від неї, а зарплата додаватиметься.',
    salaryCredited: 'зарплата',
    accruing: 'набирається',
    plannedIncluded: 'вже мінус очікувані витрати',
    plannedLink: 'Очікувані',
    recurringLink: 'Повтори',
    rateLink: 'Заробіток',
    budgetTitle: 'Бюджет',
  },
  accounts: {
    card: 'Картка',
    cash: 'Готівка',
    addWidget: 'Додати',
    addTitle: 'Що додати?',
    addCard: '💳 Картка',
    addCash: '💵 Готівка',
    cardsLimit: (max) => `Можна до ${max} карток`,
    bankName: 'Банк',
    bankNamePlaceholder: 'Наприклад, PKO або Revolut',
    cashName: 'Назва',
    cashNamePlaceholder: 'Наприклад, Гаманець',
    currency: 'Валюта',
    cardBalanceTitle: (currency) => `Скільки грошей на картці (${currency})?`,
    cashBalanceTitle: (currency) => `Скільки маєш готівкою (${currency})?`,
    balanceHint: 'Далі витрати, оплачені звідси, відніматимуться від цієї суми.',
    create: 'Додати',
    save: 'Зберегти',
    cancel: 'Скасувати',
    edit: 'Назва і валюта',
    setBalance: 'Змінити суму',
    remove: 'Видалити',
    removeTitle: 'Видалити?',
    removeText: 'Витрати, оплачені звідси, залишаться в історії. Інші картки не зміняться.',
    transfer: 'Переказ',
    transferFrom: 'Звідки',
    transferTo: 'Куди',
    amountSent: (currency) => `Сума (${currency})`,
    amountReceived: (currency) => `Прийшло (${currency})`,
    history: 'Перекази',
    noTransfers: 'Переказів ще не було',
    payFrom: 'Чим платиш',
    salaryQuestion: 'На яку картку приходить зарплата?',
    salaryHint: 'Підтверджена зарплата додаватиметься туди. Змінити можна у «Заробіток».',
    salaryAccount: 'Зарплата приходить на',
    spent: 'витрачено',
    salary: 'зарплата',
    stash: 'Заначка',
    goal: 'Ціль',
    addStash: '🫙 Заначка',
    addGoal: '🎯 Ціль',
    addLoan: '🏦 Кредит',
    stashesLimit: (max) => `Можна до ${max} заначок`,
    goalsLimit: (max) => `Можна до ${max} цілей`,
    loansLimit: (max) => `Можна до ${max} кредитів`,
    stashBalanceTitle: (currency) => `Скільки відкладено (${currency})?`,
    stashHint: 'Просто сума, щоб пам’ятати. Платити з неї не можна, і в статистику вона не йде.',
    stashNamePlaceholder: 'Наприклад, Євро на поїздку',
    goalName: 'На що збираєш',
    goalNamePlaceholder: 'Наприклад, Новий ноутбук',
    goalTarget: (currency) => `Скільки треба (${currency})`,
    goalSaved: (currency) => `Вже відкладено (${currency})`,
    putAside: 'Відкласти',
    changeTarget: 'Змінити ціль',
    noSource: '🧮 Просто лічильник',
    goalReached: '🎉 Ціль досягнута!',
  },
  loans: {
    title: 'Кредит',
    name: 'Назва',
    namePlaceholder: 'Наприклад, Кредит на авто',
    principal: (currency) => `Сума кредиту (${currency})`,
    rate: 'Відсоток річних, %',
    months: 'На скільки місяців',
    firstPayment: 'Дата першого платежу',
    paidAlready: 'Вже сплачено платежів',
    monthly: 'Щомісяця',
    left: 'Залишилось',
    overpay: 'Переплата',
    paid: (done, total) => `Виплачено ${done} з ${total}`,
    next: (date) => `Наступний платіж: ${date}`,
    inDays: (days) => `через ${days} дн.`,
    today: 'сьогодні',
    overdue: (days) => `прострочено ${days} дн.`,
    pay: 'Оплатив',
    payFrom: 'З чого оплатив',
    payTitle: (amount) => `Записати платіж ${amount}?`,
    paidOff: '✅ Виплачено повністю',
    edit: 'Змінити',
    remove: 'Видалити',
    removeTitle: 'Видалити кредит?',
    removeText: 'Вже записані платежі залишаться у витратах.',
    save: 'Зберегти',
    create: 'Додати',
    cancel: 'Скасувати',
    reminderTitle: '🏦 Скоро платіж за кредитом',
    reminderBody: (name, amount, date) => `${name}: ${amount} до ${date}`,
  },
  plannedExpenses: {
    title: 'Очікувані витрати',
    hint: 'Майбутні витрати, яких ще не було, але вони точно будуть. Віднімаються лише з «Разом» у Фінансах, суму в банку не змінюють. Для ліміту на місяць (їжа, транспорт) використовуй «Планову витрату» під час додавання витрати.',
    totalLabel: 'Разом',
    addButton: 'Додати очікувану витрату',
  },
  recurringExpenses: {
    title: 'Повторювані витрати',
    hint: 'Оренда, підписки та інші витрати, які самі логуються за розкладом — не потрібно вводити щоразу заново.',
    next: 'наступна:',
    addButton: 'Додати повторювану витрату',
  },
  workCalendar: { worked: 'Робочих', off: 'Вихідних' },
  widgetMenu: { pick: '🖼️ Вибрати картинку', remove: '✕ Видалити картинку', shape: '▢ Форма картки' },
  cardShape: { title: 'Форма картки', theme: 'Як у темі', square: 'Квадратні', rounded: 'Заокруглені', round: 'Круглі', leaf: 'Листок' },
  categoryPicker: { label: 'Категорія' },
  expenseEditor: {
    headerNew: 'Нова витрата',
    headerEdit: 'Редагувати витрату',
    amountLabel: 'Сума',
    dateLabel: 'Дата',
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
    languageUk: 'Українська',
    languageEn: 'English',
    notificationsOn: 'Увімкнені',
    notificationsOff: 'Вимкнені',
    backgroundSet: 'Встановлено',
    support: 'Підтримка',
    supportValue: 'Помилка, ідея, питання',
    channel: 'Наш Telegram-канал',
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
    payouts: 'Скільки разів на місяць приходять гроші',
    payoutsOnce: 'Раз на місяць',
    payoutsTwice: 'Двічі: аванс + зарплата',
    advanceDay: 'День авансу',
    advanceHint: 'Аванс — за перші 15 днів періоду, зарплата — за решту. День 28 і більше означає останній день місяця.',
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
    title: 'Віджети на головному екрані',
    hint: 'Своє фото на фон для кожного віджета Amber Ledger. Оновиться одразу після збереження.',
    big: 'Великий · сьогодні',
    medium: 'Середній · найближча задача',
    small: 'Малий · вихідний',
    streak: 'Квадрат · серія',
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
    streakChoose: 'Натисни, щоб вибрати',
  },
  layoutEdit: {
    edit: 'Змінити розташування',
    done: 'Готово',
    perRow: 'У ряд',
    order: 'Порядок',
    byDeadline: 'За дедлайном',
    ownOrder: 'Свій',
    resize: 'Розмір',
    remove: 'Прибрати віджет',
    hiddenTitle: 'Прибрані віджети',
    hiddenEmpty: 'Тут порожньо. Прибери віджет кнопкою «−», і його можна буде повернути звідси.',
    modules: { balance: 'Баланс', spendWeek: 'Витрати за тиждень', spendMonth: 'Витрати за місяць', budget: 'Бюджет', workCalendar: 'Робочий календар' },
  },
  plans: {
    toggle: 'Планова витрата',
    toggleHint: 'Ліміт одразу спишеться з рахунку. Покупки відмічай на плашці у Фінансах — вона заповниться, а наприкінці місяця запропонує почати знову.',
    nameLabel: 'Назва',
    namePlaceholder: 'Їжа',
    limitLabel: 'Ліміт',
    spentLabel: 'Скільки витратив',
    add: 'Додати',
    history: 'Покупки за цей період',
    noSpends: 'Поки нічого',
    changeLimit: 'Змінити ліміт',
    confirmChangeTitle: 'Точно змінити ліміт?',
    confirmChangeText: 'З рахунку спишеться новий ліміт замість старого, відсотки перерахуються.',
    confirmYes: 'Змінити',
    cancel: 'Скасувати',
    passwordLabel: 'Пароль профілю',
    passwordWrong: 'Невірний пароль',
    confirm: 'Підтвердити',
    devicePrompt: 'Підтверди зміну ліміту',
    monthEnd: '1-го числа план почнеться знову',
    nextLimit: (amount) => `з наступного місяця: ${amount}`,
    newPeriod: 'Новий місяць — план почато знову',
    reset: 'Обнулити',
    changeBudget: 'Змінити бюджет',
    newLimit: 'Новий ліміт',
    save: 'Зберегти',
    remove: 'Видалити план',
    removeTitle: 'Видалити план?',
    removeText: 'Усі гроші цього плану повернуться на рахунок, а записані в ньому покупки видаляться.',
    overspend: 'Перевищення ліміту',
    planTag: 'План',
    editorNote: 'Це планова витрата. Покупки й ліміт — на її плашці у Фінансах.',
  },
  level: { tasksDone: 'Виконано задач', sound: 'Звук виконання', soundHint: 'Грає, коли задачу виконано' },
  habitWidget: {
    title: 'Віджет серії',
    subtitle: 'Яку звичку показувати на цьому віджеті?',
    empty: 'Звичок поки немає. Увімкни «Рахувати серію» у задачі, що повторюється.',
    done: 'Готово — віджет оновиться за секунду',
  },
  defaultCategories: { 'cat-food': 'Їжа', 'cat-transport': 'Транспорт', 'cat-housing': 'Житло', 'cat-fun': 'Розваги', 'cat-other': 'Інше' },
  layoutText: {
    noDeadline: 'без терміну',
    focus: 'У ФОКУСІ',
    done: 'Готово',
    next: 'Далі',
    expenses: 'Витрати',
    styleLabel: 'Стиль теми',
  },
  layouts: {
    label: 'Розташування',
    standard: 'Стандарт',
    v3: 'Вертикаль',
  },
  designs: {
    amber: 'Бурштин',
    amberDescription: 'Як було: теплі кольори, системний шрифт, картки з рамкою.',
    neon: 'Неон',
    neonDescription: 'Нічне місто: глибокий синій, світні акценти, тонкі великі заголовки, м’які картки на тіні.',
    paper: 'Папір',
    paperDescription: 'Блокнот: шрифт із засічками, світлий папір, чорнильні лінії замість коробок, червоний і синій акценти.',
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
  profileSettings: {
    title: 'Профіль',
    namePlaceholder: 'Ваше ім’я',
    noName: 'Без імені',
    changePhoto: 'Вибрати фото',
    removePhoto: 'Прибрати фото',
    passwordSection: 'Пароль профілю',
    passwordHint: 'Потрібен, щоб відкрити фінанси, якщо відбиток не спрацював. Відновити забутий пароль неможливо — запам’ятайте його.',
    currentPassword: 'Поточний пароль',
    newPassword: 'Новий пароль',
    repeatPassword: 'Повторіть пароль',
    setPassword: 'Встановити пароль',
    changePassword: 'Змінити пароль',
    passwordSet: 'Пароль встановлено',
    passwordNotSet: 'Пароль не встановлено',
    tooShort: (min) => `Мінімум ${min} символів`,
    mismatch: 'Паролі не збігаються',
    wrongPassword: 'Невірний поточний пароль',
    saved: 'Збережено',
    forgotPassword: 'Забули пароль?',
    resetPrompt: 'Підтвердіть, що це ви',
    resetUnlocked: 'Підтверджено. Задайте новий пароль, старий не потрібен.',
    resetNoDeviceLock: 'На телефоні не ввімкнено блокування екрана (PIN, відбиток) — скинути пароль неможливо.',
  },
  securitySettings: {
    title: "Безпека й пам'ять",
    lockFinances: 'Захистити фінанси',
    lockFinancesHint: 'Суми у фінансах, статистиці, календарі та віджетах приховані, доки ви не розблокуєте.',
    needPassword: 'Спершу задайте пароль профілю — він потрібен на випадок, якщо відбиток не спрацює.',
    goToProfile: 'Відкрити профіль',
    method: 'Спосіб розблокування',
    methodDevice: 'Відбиток або PIN телефону',
    methodPassword: 'Пароль профілю',
    noBiometrics: 'На телефоні не налаштовано відбиток — використовуватиметься PIN або ключ телефону.',
    relockAfter: 'Блокувати через',
    relockHint: (max) => `Рахується від моменту розблокування. 0 — блокувати, щойно ви йдете з фінансів. Максимум ${max}.`,
    minutes: 'хв',
  },
  financeLock: {
    title: 'Фінанси заблоковано',
    subtitle: 'Розблокуйте, щоб побачити суми',
    unlock: 'Розблокувати',
    usePassword: 'Увійти паролем профілю',
    passwordPlaceholder: 'Пароль профілю',
    wrongPassword: 'Невірний пароль',
    prompt: 'Розблокувати фінанси',
    cancel: 'Скасувати',
  },
  savings: {
    title: 'Подушка безпеки',
    askTitle: 'Додати картку для подушки?',
    askSubtitle: 'Скільки лежить на накопичувальному рахунку і скільки буде до кінця року за вашою ставкою.',
    yes: 'Так, додати',
    no: 'Не потрібно',
    balance: 'Зараз на рахунку',
    rate: 'Ставка, % річних',
    openedAt: 'Дата відкриття рахунку',
    openedAtHint: 'Від неї рахується рік — до якої дати буде прогноз.',
    yearEnds: (month) => `Рік закінчиться: ${month}`,
    projection: (amount, interest) => `≈ ${amount} на той час (+${interest})`,
    afterTax: 'Приблизно, до податку на дохід із відсотків — він залежить від вашої країни.',
    notConfigured: 'Натисніть, щоб вказати суму, ставку й дату відкриття',
    editTitle: 'Подушка безпеки',
    save: 'Зберегти',
    cancel: 'Скасувати',
    hideCard: 'Приховати картку',
    settingsToggle: 'Картка «Подушка безпеки»',
    settingsToggleHint: 'Унизу вкладки «Фінанси»: заощадження і прогноз на рік.',
  },
};

const en: Translation = {
  localeCode: 'en-US',
  tabs: { tasks: 'Tasks', calendar: 'Calendar', finance: 'Finance', stats: 'Stats', settings: 'Settings' },
  status: { notStarted: 'Not started', inProgress: 'In progress', done: 'Done' },
  priority: { low: 'Low', medium: 'Medium', high: 'High' },
  weekdaysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  onboarding: {
    continue: 'Continue',
    back: 'Back',
    profileTitle: 'Create your profile',
    profileSubtitle: 'What should we call you? A photo is optional.',
    passwordTitle: 'Password (optional)',
    passwordHint: 'Used for the finance lock. A forgotten password can’t be recovered. You can set it later in Settings.',
    passwordPlaceholder: 'Password',
    repeatPlaceholder: 'Repeat password',
    passwordAlreadySet: 'Password already set ✓',
  },
  whatsNew: {
    done: 'Nice!',
    releases: {
      '1.2.0': [
        { title: "What's new in 1.2.0", text: 'A small big update — swipe through for the highlights.' },
        { title: 'Habits & streaks 🔥', text: 'Turn on “Count streak” for a repeating task and it becomes a flame card at the top of Tasks. Tap it when it’s done today.' },
        { title: 'Level ring', text: 'Every task you finish fills a segment of the ring — with a sound. Ten tasks and a new round starts.' },
        { title: 'Arrange it your way', text: 'The ✏️ pencil on Tasks, Finance, Stats and Calendar: drag cards around, change their size and corners.' },
        { title: 'Streak widget', text: 'A tiny 1×1 square for your home screen — the flame and the number. Tap it to choose the habit.' },
      ],
      '1.3.0': [
        { title: 'What’s new in 1.3.0', text: 'A big update to money and data — swipe through the highlights.' },
        { title: 'Planned spending 🌊', text: 'Turn on “Planned spending” when adding an expense: the limit comes off at once and purchases fill a wave bar. Over the limit turns red; on the 1st the plan starts over.' },
        { title: 'An honest bank', text: 'On top: what’s in the account; below it: what’s free after your plans. Delete an expense — or a task that logged one — and the money comes back.' },
        { title: 'Calendar remembers', text: 'Any day shows what you did and added. Finance lists this month’s expenses; the whole history stays in Calendar.' },
        { title: 'Security & storage', text: 'Auto clean-up of old records and erasing data with a countdown and your password — in Settings.' },
        { title: 'Move by QR', text: 'New phone? Bring tasks, finances and your profile over by QR code through Wi-Fi, no internet.' },
        { title: 'Your own set of widgets', text: 'In pencil mode ✏️ remove the cards you don’t need with “−”; bring them back from “⋮”.' },
      ],
      '1.3.1': [
        { title: 'What’s new in 1.3.1', text: 'Small but important fixes.' },
        { title: 'The QR scanner works', text: 'The camera no longer shows a black screen when moving data. You can also pick the QR from a photo in your gallery.' },
        { title: 'Forgot your password?', text: 'Profile → Password: confirm with your fingerprint or phone PIN and set a new one — the old one isn’t needed.' },
      ],
      '1.3.2': [
        { title: 'What’s new in 1.3.2', text: 'Reaching us is now easy.' },
        { title: 'Support', text: 'Settings → Support: tell our bot about a bug, an idea or a question — screenshots welcome.' },
        { title: 'Our channel', text: 'New versions and news are in the Telegram channel @amberledger.' },
        { title: '20 MB lighter', text: 'The app got smaller: it’s now for 64-bit phones only.' },
      ],
      '1.3.3': [
        { title: 'What’s new in 1.3.3', text: 'Small improvements and fixes.' },
      ],
      '1.4.0': [
        { title: 'What’s new in 1.4.0', text: 'A big finance update: cards, cash, goals and loans. Swipe through.' },
        { title: 'Cards and cash 💳', text: 'Up to 3 cards named after your bank, and cash in any currency. Pick what you paid with in every expense. Pencil → “+”.' },
        { title: 'Transfers', text: 'Took cash out of an ATM? Tap your cash → “Transfer” and the amount moves over from the card.' },
        { title: 'Stashes 🫙', text: 'Up to 5 amounts to keep in mind — like euros for a trip. No exchange rates, just so you know.' },
        { title: 'Goals 🎯', text: 'Saving up for something? A goal fills with a wave, and “Put aside” takes money off a card or just counts it.' },
        { title: 'Loans 🏦', text: 'Up to 3 loans: the monthly payment, what’s left and the interest are worked out for you. A reminder comes 5 days before each payment.' },
        { title: 'Advance', text: 'Paid twice a month? Turn on the advance in “Earnings”.' },
        { title: 'Future expenses', text: 'An expense dated in the future now leaves your balance on that day. And the eye 👁 shows your password.' },
      ],
    },
  },
  welcome: {
    slides: [
      { title: 'Welcome to Amber Ledger', text: 'Your tasks and your money in one place. Swipe through for a quick tour.' },
      { title: 'Tasks', text: 'Deadlines, priorities, subtasks and repeats. Long-press + to add one in a second.' },
      { title: 'Habits 🔥', text: 'Turn on “Count streak” for a repeating task and it becomes a streak card at the top.' },
      { title: 'Calendar', text: 'Tasks and work shifts day by day — and your whole history: what you did and spent on any day.' },
      { title: 'Finance', text: 'Bank balance, pay per period and expenses. Planned spending with a limit fills a bar and shows what’s left.' },
      { title: 'Stats', text: 'Your week in charts: tasks done and spending by category.' },
      { title: 'Make it yours', text: 'Themes, layouts, widgets — remove the ones you don’t need with the pencil ✏️. Finance lock, storage and moving to another phone are in Settings.' },
    ],
    skip: 'Skip',
    next: 'Next',
    start: 'Get started',
  },
  tasksScreen: {
    header: 'Tasks',
    emptyTitle: 'No tasks yet',
    emptySubtitle: 'Tap "+" to add your first task',
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
    streak: 'Count streak',
    streakHint: 'The task becomes a habit with a 🔥 at the top of Tasks',
  },
  habits: { doneToday: 'Done', markDone: 'Mark done', next: (day) => `Next: ${day}` },
  calendarScreen: { header: 'Calendar', emptyDay: 'Nothing on this day', doneSection: 'Done', addedSection: 'Added' },
  auth: {
    title: 'Confirm it’s you',
    passwordLabel: 'Profile password',
    wrong: 'Wrong password',
    confirm: 'Confirm',
    cancel: 'Cancel',
    devicePrompt: 'Confirm this action',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
  storage: {
    title: 'Storage',
    hint: 'Everything is stored only on this phone and is never deleted on its own.',
    counts: (tasks, expenses) => `Tasks: ${tasks} · Expenses: ${expenses}`,
    autoTitle: 'Auto clean-up',
    autoHint: 'Delete done tasks and expenses older than the chosen time — from Calendar too. Habits, current plans and your bank balance stay as they are.',
    off: 'Off',
    months: (n) => `${n} mo`,
    eraseTitle: 'Erase data',
    eraseTasks: 'Erase tasks',
    eraseFinance: 'Erase finances',
    eraseProfile: 'Erase profile',
    eraseAll: 'Erase everything',
    confirmTitle: 'Erase for sure?',
    confirmTasks: 'All tasks, habits and their history will be deleted for good.',
    confirmFinance: 'All expenses, plans, recurring expenses, work days and the balance will be deleted for good.',
    confirmProfile: 'Your name, photo and profile password will be deleted. The finance lock turns off.',
    confirmAll: 'Everything goes: tasks, finances, profile and settings. The app starts over from the first launch.',
    erase: 'Erase',
    cancel: 'Cancel',
    countdown: 'Erasing all data',
    countdownHint: 'You can still change your mind',
    done: 'Done, the data is erased',
    transferTitle: 'Move to another phone',
    transferHint: 'All tasks, expenses and settings move over by QR code through Wi-Fi — no internet, no files. Photos and the password stay on this phone.',
    transferButton: 'Move data',
  },
  transfer: {
    title: 'Move data',
    sendTitle: 'Send from this phone',
    sendHint: 'Shows a QR code for the other phone',
    receiveTitle: 'Receive on this phone',
    receiveHint: 'Scan the QR code from the old phone',
    preparing: 'Getting the data ready…',
    scanHint: (where) => `On the other phone open ${where} → “Receive on this phone” and point the camera at the code.`,
    where: 'Settings → Security & storage → Move data',
    expiresIn: (time) => `The code works for ${time} more`,
    expired: 'Time’s up — this code no longer works',
    sent: 'Data sent ✓',
    again: 'Show a new code',
    cameraTitle: 'Camera needed',
    cameraText: 'The camera is only used to read the QR code from the other phone. Nothing is recorded or saved.',
    cameraGrant: 'Allow camera',
    pointCamera: 'Point the camera at the QR code on the other phone',
    fromGallery: 'Pick a photo with the QR',
    noQrInPhoto: 'No QR code found in this photo',
    notOurCode: 'This isn’t an Amber Ledger transfer code',
    codeExpired: 'This code no longer works — show a new one on the other phone',
    confirmTitle: 'Move the data here?',
    confirmText: 'All tasks and finances on this phone will be replaced with the ones from the other phone.',
    replace: 'Move',
    cancel: 'Cancel',
    receiving: 'Receiving…',
    received: 'Done, the data is here ✓',
    failed: 'Couldn’t reach the other phone. Both must be on the same Wi-Fi (or one sharing a hotspot with the other), and the code still open.',
    noNetwork: 'This phone isn’t on a Wi-Fi network. Connect to Wi-Fi or turn on the hotspot.',
    needsApp: 'Moving data works only in the installed app (APK), not in Expo Go.',
    welcomeTitle: 'Moving from an old phone?',
    welcomeText: 'If Amber Ledger is already on another phone, bring your tasks, finances and profile over by QR code. Both phones need to be on the same Wi-Fi.',
    welcomeYes: 'Yes, move my data',
    welcomeNo: 'No, start fresh',
  },
  financeScreen: {
    header: 'Finance',
    categoriesLink: 'Categories',
    recentExpenses: 'Recent expenses',
    listInfoTitle: 'This month’s expenses',
    listInfo: (nextClear) =>
      `Only this month’s expenses are listed here. The list clears on the 1st of every month — next on ${nextClear}.\n\nNothing is deleted: the expenses stay in Calendar (pick a day) and in Stats, and your bank balance doesn’t change.`,
    emptyTitle: 'No expenses yet',
    emptySubtitle: 'Add your first expense with the "+" button',
    thisMonth: 'This month',
    earned: 'Earned',
    spent: 'Spent',
    bank: 'Bank',
    inPlans: 'in plans',
    free: 'free',
    incoming: 'Incoming',
    total: 'After payday',
    editBankTitle: (currency) => `How much is on the card (${currency})?`,
    editBankHint: 'Type the amount your bank app shows. After that, expenses paid with this card come off it and salary is added.',
    salaryCredited: 'salary',
    accruing: 'accruing',
    plannedIncluded: 'already minus expected expenses',
    plannedLink: 'Expected',
    recurringLink: 'Recurring',
    rateLink: 'Earnings',
    budgetTitle: 'Budget',
  },
  accounts: {
    card: 'Card',
    cash: 'Cash',
    addWidget: 'Add',
    addTitle: 'What to add?',
    addCard: '💳 Card',
    addCash: '💵 Cash',
    cardsLimit: (max) => `Up to ${max} cards`,
    bankName: 'Bank',
    bankNamePlaceholder: 'e.g. PKO or Revolut',
    cashName: 'Name',
    cashNamePlaceholder: 'e.g. Wallet',
    currency: 'Currency',
    cardBalanceTitle: (currency) => `How much is on the card (${currency})?`,
    cashBalanceTitle: (currency) => `How much cash do you have (${currency})?`,
    balanceHint: 'After that, expenses paid from here come off this amount.',
    create: 'Add',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Name and currency',
    setBalance: 'Change amount',
    remove: 'Remove',
    removeTitle: 'Remove?',
    removeText: 'Expenses paid from here stay in the history. Other cards don’t change.',
    transfer: 'Transfer',
    transferFrom: 'From',
    transferTo: 'To',
    amountSent: (currency) => `Amount (${currency})`,
    amountReceived: (currency) => `Received (${currency})`,
    history: 'Transfers',
    noTransfers: 'No transfers yet',
    payFrom: 'Paid with',
    salaryQuestion: 'Which card does your salary go to?',
    salaryHint: 'Confirmed salary will be added there. You can change it in “Earnings”.',
    salaryAccount: 'Salary goes to',
    spent: 'spent',
    salary: 'salary',
    stash: 'Stash',
    goal: 'Goal',
    addStash: '🫙 Stash',
    addGoal: '🎯 Goal',
    addLoan: '🏦 Loan',
    stashesLimit: (max) => `Up to ${max} stashes`,
    goalsLimit: (max) => `Up to ${max} goals`,
    loansLimit: (max) => `Up to ${max} loans`,
    stashBalanceTitle: (currency) => `How much is put aside (${currency})?`,
    stashHint: 'Just an amount to keep in mind. You can’t pay from it and it isn’t in the stats.',
    stashNamePlaceholder: 'e.g. Euros for the trip',
    goalName: 'Saving up for',
    goalNamePlaceholder: 'e.g. New laptop',
    goalTarget: (currency) => `Target (${currency})`,
    goalSaved: (currency) => `Already saved (${currency})`,
    putAside: 'Put aside',
    changeTarget: 'Change target',
    noSource: '🧮 Just count it',
    goalReached: '🎉 Goal reached!',
  },
  loans: {
    title: 'Loan',
    name: 'Name',
    namePlaceholder: 'e.g. Car loan',
    principal: (currency) => `Amount borrowed (${currency})`,
    rate: 'Yearly interest, %',
    months: 'For how many months',
    firstPayment: 'First payment date',
    paidAlready: 'Payments already made',
    monthly: 'Monthly',
    left: 'Left to pay',
    overpay: 'Interest in total',
    paid: (done, total) => `Paid ${done} of ${total}`,
    next: (date) => `Next payment: ${date}`,
    inDays: (days) => `in ${days} d`,
    today: 'today',
    overdue: (days) => `${days} d overdue`,
    pay: 'Paid',
    payFrom: 'Paid with',
    payTitle: (amount) => `Log a payment of ${amount}?`,
    paidOff: '✅ Paid off',
    edit: 'Edit',
    remove: 'Remove',
    removeTitle: 'Remove the loan?',
    removeText: 'Payments already logged stay in your expenses.',
    save: 'Save',
    create: 'Add',
    cancel: 'Cancel',
    reminderTitle: '🏦 Loan payment soon',
    reminderBody: (name, amount, date) => `${name}: ${amount} by ${date}`,
  },
  plannedExpenses: {
    title: 'Expected expenses',
    hint: 'Future expenses that haven’t happened yet but will. They’re taken off only the Total in Finance, not your bank balance. For a monthly limit (food, transport) use “Planned spending” when adding an expense.',
    totalLabel: 'Total',
    addButton: 'Add expected expense',
  },
  recurringExpenses: {
    title: 'Recurring Expenses',
    hint: "Rent, subscriptions, and other expenses that log themselves on a schedule — no need to re-enter them every time.",
    next: 'next:',
    addButton: 'Add recurring expense',
  },
  workCalendar: { worked: 'Worked', off: 'Off' },
  widgetMenu: { pick: '🖼️ Choose picture', remove: '✕ Remove picture', shape: '▢ Card shape' },
  cardShape: { title: 'Card shape', theme: 'Theme default', square: 'Square', rounded: 'Rounded', round: 'Round', leaf: 'Leaf' },
  categoryPicker: { label: 'Category' },
  expenseEditor: {
    headerNew: 'New Expense',
    headerEdit: 'Edit Expense',
    amountLabel: 'Amount',
    dateLabel: 'Date',
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
    languageUk: 'Українська',
    languageEn: 'English',
    notificationsOn: 'On',
    notificationsOff: 'Off',
    backgroundSet: 'Set',
    support: 'Support',
    supportValue: 'Bug, idea, question',
    channel: 'Our Telegram channel',
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
    payouts: 'How often the money comes',
    payoutsOnce: 'Once a month',
    payoutsTwice: 'Twice: advance + salary',
    advanceDay: 'Advance day',
    advanceHint: 'The advance pays for the first 15 days of the period, the salary for the rest. Day 28 or later means the last day of the month.',
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
    title: 'Home screen widgets',
    hint: 'Your own background photo for each Amber Ledger widget. Updates right after saving.',
    big: 'Large · today',
    medium: 'Medium · next task',
    small: 'Small · day off',
    streak: 'Square · streak',
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
    streakChoose: 'Tap to choose',
  },
  layoutEdit: {
    edit: 'Edit layout',
    done: 'Done',
    perRow: 'Per row',
    order: 'Order',
    byDeadline: 'By deadline',
    ownOrder: 'My own',
    resize: 'Size',
    remove: 'Remove widget',
    hiddenTitle: 'Removed widgets',
    hiddenEmpty: 'Nothing here. Remove a widget with its “−” button and you can bring it back from here.',
    modules: { balance: 'Balance', spendWeek: 'Spent this week', spendMonth: 'Spent this month', budget: 'Budget', workCalendar: 'Work calendar' },
  },
  plans: {
    toggle: 'Planned spending',
    toggleHint: 'The limit comes off your balance right away. Tick off purchases on its bar in Finance — it fills up, and at the end of the month offers to start over.',
    nameLabel: 'Name',
    namePlaceholder: 'Food',
    limitLabel: 'Limit',
    spentLabel: 'How much you spent',
    add: 'Add',
    history: 'Purchases this period',
    noSpends: 'Nothing yet',
    changeLimit: 'Change limit',
    confirmChangeTitle: 'Change the limit?',
    confirmChangeText: 'The new limit comes off your balance instead of the old one, and the percentage is recalculated.',
    confirmYes: 'Change',
    cancel: 'Cancel',
    passwordLabel: 'Profile password',
    passwordWrong: 'Wrong password',
    confirm: 'Confirm',
    devicePrompt: 'Confirm the new limit',
    monthEnd: 'The plan starts over on the 1st',
    nextLimit: (amount) => `from next month: ${amount}`,
    newPeriod: 'New month — the plan started over',
    reset: 'Start over',
    changeBudget: 'Change budget',
    newLimit: 'New limit',
    save: 'Save',
    remove: 'Delete plan',
    removeTitle: 'Delete the plan?',
    removeText: 'All of this plan’s money goes back to your balance, and the purchases logged in it are deleted.',
    overspend: 'Over the limit',
    planTag: 'Plan',
    editorNote: 'This is planned spending. Purchases and the limit are on its bar in Finance.',
  },
  level: { tasksDone: 'Tasks done', sound: 'Task done sound', soundHint: 'Plays when a task is done' },
  habitWidget: {
    title: 'Streak widget',
    subtitle: 'Which habit should this widget show?',
    empty: 'No habits yet. Turn on “Count streak” for a repeating task.',
    done: 'Done — the widget updates in a second',
  },
  defaultCategories: { 'cat-food': 'Food', 'cat-transport': 'Transport', 'cat-housing': 'Housing', 'cat-fun': 'Fun', 'cat-other': 'Other' },
  layoutText: {
    noDeadline: 'no deadline',
    focus: 'IN FOCUS',
    done: 'Done',
    next: 'Up next',
    expenses: 'Expenses',
    styleLabel: 'Theme style',
  },
  layouts: {
    label: 'Layout',
    standard: 'Standard',
    v3: 'Vertical',
  },
  designs: {
    amber: 'Amber',
    amberDescription: 'As before: warm colours, system font, outlined cards.',
    neon: 'Neon',
    neonDescription: 'Night city: deep blue, glowing accents, thin big headings, soft cards on shadows.',
    paper: 'Paper',
    paperDescription: 'Notebook: serif type, bright paper, ink lines instead of boxes, red and blue accents.',
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
  profileSettings: {
    title: 'Profile',
    namePlaceholder: 'Your name',
    noName: 'No name',
    changePhoto: 'Choose photo',
    removePhoto: 'Remove photo',
    passwordSection: 'Profile password',
    passwordHint: 'Opens Finance if the fingerprint doesn\'t work. A forgotten password can\'t be recovered — remember it.',
    currentPassword: 'Current password',
    newPassword: 'New password',
    repeatPassword: 'Repeat password',
    setPassword: 'Set password',
    changePassword: 'Change password',
    passwordSet: 'Password is set',
    passwordNotSet: 'No password yet',
    tooShort: (min) => `At least ${min} characters`,
    mismatch: 'Passwords don\'t match',
    wrongPassword: 'Current password is wrong',
    saved: 'Saved',
    forgotPassword: 'Forgot password?',
    resetPrompt: 'Confirm it\'s you',
    resetUnlocked: 'Confirmed. Set a new password — the old one isn\'t needed.',
    resetNoDeviceLock: 'This phone has no screen lock (PIN, fingerprint), so the password can\'t be reset.',
  },
  securitySettings: {
    title: 'Security & storage',
    lockFinances: 'Lock finances',
    lockFinancesHint: 'Amounts in Finance, Stats, Calendar and widgets stay hidden until you unlock.',
    needPassword: 'Set a profile password first — it\'s the way in if the fingerprint fails.',
    goToProfile: 'Open profile',
    method: 'Unlock with',
    methodDevice: 'Fingerprint or phone PIN',
    methodPassword: 'Profile password',
    noBiometrics: 'No fingerprint set up on this phone — its PIN or pattern will be used.',
    relockAfter: 'Lock after',
    relockHint: (max) => `Counted from the moment you unlock. 0 = lock as soon as you leave Finance. ${max} at most.`,
    minutes: 'min',
  },
  financeLock: {
    title: 'Finance is locked',
    subtitle: 'Unlock to see the amounts',
    unlock: 'Unlock',
    usePassword: 'Use profile password',
    passwordPlaceholder: 'Profile password',
    wrongPassword: 'Wrong password',
    prompt: 'Unlock finance',
    cancel: 'Cancel',
  },
  savings: {
    title: 'Savings cushion',
    askTitle: 'Add a card for your savings?',
    askSubtitle: 'What\'s on your savings account and roughly how much it will be by the end of the year at your rate.',
    yes: 'Yes, add it',
    no: 'No thanks',
    balance: 'Balance now',
    rate: 'Interest rate, % per year',
    openedAt: 'Account opened',
    openedAtHint: 'The year is counted from this date — that\'s when the projection ends.',
    yearEnds: (month) => `Year ends: ${month}`,
    projection: (amount, interest) => `≈ ${amount} by then (+${interest})`,
    afterTax: 'Roughly, before income tax on the interest — that depends on your country.',
    notConfigured: 'Tap to set the balance, rate and opening date',
    editTitle: 'Savings cushion',
    save: 'Save',
    cancel: 'Cancel',
    hideCard: 'Hide card',
    settingsToggle: 'Savings cushion card',
    settingsToggleHint: 'At the bottom of Finance: your savings and a one-year projection.',
  },
};

export const translations = { uk, en };
