// ============================================================
//  داده‌ها و کلیدهای ذخیره‌سازی
// ============================================================
const STORAGE_KEY = "examTrackerData";
const LANG_KEY = "appLanguage";

// داده‌های پیش‌فرض
const defaultData = {
    projects: {},
    studyLogs: [],
    weeklyPlans: {},
    currentPlan: null,
    notes: [],
    events: [],
    motivation: "Believe in your abilities ✨",
    categories: [
        { id: "study", name: "📚 Study", color: "#4A90E2" },
        { id: "work", name: "💼 Work", color: "#E67E22" },
        { id: "personal", name: "🧘 Personal", color: "#27AE60" },
        { id: "health", name: "💪 Health", color: "#E74C3C" }
    ],
    tasks: [],
    dailyOverrides: []
};

let currentData = JSON.parse(JSON.stringify(defaultData));
let currentLang = 'en';
let editingTaskId = null;
let timerInterval = null;
let seconds = 0;
let isRunning = false;
let timerMode = 'stopwatch';
let countdownTarget = 0;
let countdownInterval = null;
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();

// ============================================================
//  توابع ذخیره و بارگذاری (مقاوم در برابر خطا)
// ============================================================
function loadData(callback) {
    try {
        chrome.storage.local.get([STORAGE_KEY, LANG_KEY], (result) => {
            try {
                if (result[STORAGE_KEY]) {
                    const saved = result[STORAGE_KEY];
                    currentData.projects = saved.projects || {};
                    currentData.studyLogs = saved.studyLogs || [];
                    currentData.weeklyPlans = saved.weeklyPlans || {};
                    currentData.currentPlan = saved.currentPlan || null;
                    currentData.notes = saved.notes || [];
                    currentData.events = saved.events || [];
                    currentData.motivation = saved.motivation || "Believe in your abilities ✨";
                    currentData.categories = saved.categories || defaultData.categories;
                    currentData.tasks = saved.tasks || [];
                    currentData.dailyOverrides = saved.dailyOverrides || [];
                } else {
                    currentData = JSON.parse(JSON.stringify(defaultData));
                    currentData.tasks = [
                        {
                            id: "sample-1",
                            title: "Study Linear Algebra Chapter 2",
                            description: "Read pages 30-50 and solve exercises",
                            category: "study",
                            priority: "high",
                            status: "pending",
                            date: null,
                            recurrence: { type: "daily" },
                            subtasks: [
                                { id: "sub-1", title: "Read text", done: false },
                                { id: "sub-2", title: "Solve exercises", done: false }
                            ],
                            createdAt: new Date().toISOString(),
                            completedDate: null
                        },
                        {
                            id: "sample-2",
                            title: "Weekly project report",
                            description: "Prepare report for tomorrow's meeting",
                            category: "work",
                            priority: "medium",
                            status: "pending",
                            date: null,
                            recurrence: { type: "weekly", daysOfWeek: [5] },
                            subtasks: [],
                            createdAt: new Date().toISOString(),
                            completedDate: null
                        },
                        {
                            id: "sample-3",
                            title: "30 min walk",
                            description: "",
                            category: "health",
                            priority: "low",
                            status: "pending",
                            date: null,
                            recurrence: { type: "daily" },
                            subtasks: [],
                            createdAt: new Date().toISOString(),
                            completedDate: null
                        }
                    ];
                }

                if (result[LANG_KEY]) {
                    currentLang = result[LANG_KEY];
                } else {
                    currentLang = 'en';
                }
                callback();
            } catch (err) {
                console.error("Error loading data:", err);
                currentData = JSON.parse(JSON.stringify(defaultData));
                currentLang = 'en';
                callback();
            }
        });
    } catch (err) {
        console.error("Chrome storage error:", err);
        currentData = JSON.parse(JSON.stringify(defaultData));
        currentLang = 'en';
        callback();
    }
}

function saveData(callback) {
    try {
        chrome.storage.local.set({ [STORAGE_KEY]: currentData }, () => {
            if (callback) callback();
        });
    } catch (err) {
        console.error("Save error:", err);
        if (callback) callback();
    }
}

function saveLanguage(lang) {
    currentLang = lang;
    try {
        chrome.storage.local.set({ [LANG_KEY]: lang });
    } catch (err) {
        console.error("Language save error:", err);
    }
}

// ============================================================
//  توابع کمکی
// ============================================================
function pad(n) { return String(n).padStart(2, '0'); }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function getTodayStr() { return new Date().toISOString().split('T')[0]; }

// ============================================================
//  ترجمه‌ها
// ============================================================
const translations = {
    en: {
        brand: "Dashboard", todayLabel: "Today", statusReady: "⏸️ Ready", statusRunning: "▶ Working",
        statusStopped: "⏸️ Paused", statusDone: "⏰ Time's up!",
        tabTimer: "⏱ Timer", tabProjects: "📚 Projects", tabTasks: "✅ Tasks",
        tabWeekly: "📅 Weekly", tabNotes: "📝 Notes", tabCalendar: "🗓 Calendar", tabSettings: "⚙️ Settings",
        timerFocus: "⏱ Focus Timer", timerStopwatch: "⏱ Stopwatch", timerCountdown: "⏳ Countdown",
        timerStart: "▶ Start", timerStop: "⏹ Stop", timerReset: "⟳ Reset", timerSet: "⏳ Set Countdown",
        timerSave: "📥 Save Session", statsToday: "Today (hrs)", statsWeek: "This Week (hrs)",
        statsMonth: "This Month (hrs)", statsYear: "This Year (hrs)",
        logsTitle: "📋 Study Logs", logPlaceholder: "Hours (e.g. 2.5)", logSelect: "Select Project",
        logButton: "➕ Log Session", globalProgress: "📊 Overall Progress", globalDetail: "of topics",
        manageProjects: "📚 Manage Projects & Topics", addProject: "➕ Add Project", addTopic: "➕ Add Topic",
        chartsTitle: "📈 Progress Charts", goalChart: "🎯 Progress vs Weekly Goal",
        trendChart: "📊 Daily Study Trend (Last 7 Days)",
        taskTitle: "✅ Tasks", taskAllCategories: "All Categories", taskFilterToday: "Today",
        taskFilterFuture: "Future", taskFilterAll: "All", taskRefresh: "🔄 Refresh", taskNew: "➕ New Task",
        taskNoTasks: "✅ No tasks for this day.", taskDone: "✅ Done", taskUndo: "↩️ Undo",
        taskEdit: "✏️ Edit", taskDelete: "🗑️ Delete",
        taskPriorityHigh: "🔴 High", taskPriorityMedium: "🟡 Medium", taskPriorityLow: "🟢 Low",
        taskRecurrenceDaily: "🔄 Daily", taskRecurrenceWeekly: "📅 Weekly",
        taskModalNew: "➕ New Task", taskModalEdit: "✏️ Edit Task",
        taskModalTitle: "Task Title *", taskModalDesc: "Description", taskModalCategory: "Category",
        taskModalPriority: "Priority", taskModalDate: "Date (for one-time tasks)",
        taskModalRecurrence: "Recurrence", taskModalWeeklyDays: "Weekly Days",
        taskModalSubtasks: "Subtasks (one per line)", taskModalCancel: "Cancel", taskModalSave: "💾 Save",
        weeklyTitle: "📅 Weekly Plan", weeklyCreate: "➕ Create Plan", weeklyDelete: "🗑️ Delete Plan",
        weeklyGoal: "🎯 Weekly Goal", weeklyGoalUpdate: "Update Goal",
        notesTitle: "📝 Notes", notesSave: "💾 Save Note",
        calendarTitle: "🗓 Gregorian Calendar", calendarEventTitle: "⏳ Event Countdowns",
        calendarAdd: "➕ Add Event",
        settingsTitle: "⚙️ Settings", backupTitle: "💾 Backup & Restore", backupDownload: "📥 Download Backup",
        backupUpload: "📤 Upload Backup", backupWarning: "⚠️ Uploading will overwrite all current data.",
        motivationTitle: "✏️ Motivation Message", motivationSave: "💾 Save",
        socialTitle: "🔗 Social Links",
        noNotes: "No notes saved.", noEvents: "No events recorded.", eventPast: "⏰ Time passed",
        noLogs: "No logs recorded.", noProjects: "No projects added yet.",
        noTopics: "No topics added.", noPlans: "No plans available.",
        noPlanSelected: "No plan selected or created.",
        confirmDelete: "Are you sure you want to delete?",
        confirmOverwrite: "⚠️ All current data will be overwritten. Continue?",
        invalidBackup: "Invalid backup file!", importSuccess: "✅ Backup restored successfully!",
        sessionSaved: "✅ Session saved successfully!",
        enterValidHours: "Please enter valid hours!", selectProject: "Please select a project!",
        enterTitle: "Please enter a task title!",
        enterValidMinutes: "Please enter a valid number (minutes)!",
        selectWeeklyDay: "Please select at least one day for weekly recurrence!",
        noteTitleRequired: "Please enter a note title!",
        noteContentRequired: "Please enter note content!",
        eventTitleRequired: "Please enter an event title!",
        eventDateTimeRequired: "Please select date and time!",
        enterProjectName: "Please enter a project name!",
        projectExists: "Project already exists!",
        selectProjectFirst: "Please select a project first!",
        enterTopicName: "Please enter a topic name!",
        enterPlanName: "Please enter a plan name!",
        planExists: "A plan with this name already exists!",
        noPlanToDelete: "No plan to delete!"
    },
    fa: {
        brand: "داشبورد", todayLabel: "امروز", statusReady: "⏸️ آماده", statusRunning: "▶ در حال کار",
        statusStopped: "⏸️ متوقف", statusDone: "⏰ زمان تمام شد!",
        tabTimer: "⏱ زمان‌بندی", tabProjects: "📚 پروژه‌ها", tabTasks: "✅ وظایف",
        tabWeekly: "📅 برنامه هفتگی", tabNotes: "📝 یادداشت", tabCalendar: "🗓 تقویم", tabSettings: "⚙️ تنظیمات",
        timerFocus: "⏱ تایمر تمرکز", timerStopwatch: "⏱ کرنومتر", timerCountdown: "⏳ شمارش معکوس",
        timerStart: "▶ شروع", timerStop: "⏹ توقف", timerReset: "⟳ بازنشانی", timerSet: "⏳ تنظیم معکوس",
        timerSave: "📥 ثبت جلسه", statsToday: "امروز (ساعت)", statsWeek: "این هفته (ساعت)",
        statsMonth: "این ماه (ساعت)", statsYear: "امسال (ساعت)",
        logsTitle: "📋 جلسات مطالعه", logPlaceholder: "ساعت (مثلاً 2.5)", logSelect: "انتخاب پروژه",
        logButton: "➕ ثبت جلسه", globalProgress: "📊 پیشرفت کلی", globalDetail: "از مبحث",
        manageProjects: "📚 مدیریت پروژه‌ها و مباحث", addProject: "➕ افزودن پروژه", addTopic: "➕ افزودن مبحث",
        chartsTitle: "📈 نمودارهای پیشرفت", goalChart: "🎯 پیشرفت نسبت به هدف هفتگی",
        trendChart: "📊 روند مطالعه روزانه (۷ روز اخیر)",
        taskTitle: "✅ وظایف", taskAllCategories: "همه دسته‌ها", taskFilterToday: "امروز",
        taskFilterFuture: "آینده", taskFilterAll: "همه", taskRefresh: "🔄 به‌روزرسانی", taskNew: "➕ وظیفه جدید",
        taskNoTasks: "✅ هیچ وظیفه‌ای برای این روز وجود ندارد.", taskDone: "✅ انجام شد",
        taskUndo: "↩️ برگردان", taskEdit: "✏️ ویرایش", taskDelete: "🗑️ حذف",
        taskPriorityHigh: "🔴 بالا", taskPriorityMedium: "🟡 متوسط", taskPriorityLow: "🟢 کم",
        taskRecurrenceDaily: "🔄 روزانه", taskRecurrenceWeekly: "📅 هفتگی",
        taskModalNew: "➕ وظیفه جدید", taskModalEdit: "✏️ ویرایش وظیفه",
        taskModalTitle: "عنوان وظیفه *", taskModalDesc: "توضیحات", taskModalCategory: "دسته‌بندی",
        taskModalPriority: "اولویت", taskModalDate: "تاریخ (برای وظایف یک‌باره)",
        taskModalRecurrence: "تکرار", taskModalWeeklyDays: "روزهای هفته",
        taskModalSubtasks: "زیروظیفه‌ها (هر خط یک مورد)", taskModalCancel: "لغو", taskModalSave: "💾 ذخیره",
        weeklyTitle: "📅 برنامه هفتگی", weeklyCreate: "➕ ساخت برنامه", weeklyDelete: "🗑️ حذف برنامه",
        weeklyGoal: "🎯 هدف هفتگی", weeklyGoalUpdate: "بروزرسانی هدف",
        notesTitle: "📝 یادداشت‌ها", notesSave: "💾 ذخیره یادداشت",
        calendarTitle: "🗓 تقویم میلادی", calendarEventTitle: "⏳ روزشمار رویدادها",
        calendarAdd: "➕ افزودن رویداد",
        settingsTitle: "⚙️ تنظیمات", backupTitle: "💾 پشتیبان‌گیری و بازیابی", backupDownload: "📥 دریافت فایل پشتیبان",
        backupUpload: "📤 بارگذاری فایل پشتیبان", backupWarning: "⚠️ بارگذاری فایل، تمام داده‌های فعلی را بازنویسی می‌کند.",
        motivationTitle: "✏️ ویرایش جمله انگیزشی", motivationSave: "💾 ذخیره",
        socialTitle: "🔗 لینک‌های اجتماعی",
        noNotes: "هیچ یادداشتی ذخیره نشده.", noEvents: "هیچ رویدادی ثبت نشده.",
        eventPast: "⏰ زمان گذشته", noLogs: "هنوز جلسه‌ای ثبت نشده",
        noProjects: "هنوز پروژه‌ای اضافه نکردی", noTopics: "هیچ مبحثی اضافه نشده",
        noPlans: "برنامه‌ای وجود ندارد.", noPlanSelected: "برنامه‌ای انتخاب نشده یا ساخته نشده است.",
        confirmDelete: "آیا مطمئن هستید؟",
        confirmOverwrite: "⚠️ تمام داده‌های فعلی شما بازنویسی می‌شوند. ادامه می‌دهید؟",
        invalidBackup: "فایل پشتیبان معتبر نیست!", importSuccess: "✅ پشتیبان با موفقیت بازیابی شد!",
        sessionSaved: "✅ جلسه با موفقیت ثبت شد!",
        enterValidHours: "لطفاً ساعت معتبر وارد کن!",
        selectProject: "لطفاً یک پروژه را انتخاب کن!",
        enterTitle: "عنوان وظیفه را وارد کن!",
        enterValidMinutes: "لطفاً یک عدد معتبر (دقیقه) وارد کن!",
        selectWeeklyDay: "لطفاً حداقل یک روز را برای تکرار هفتگی انتخاب کن!",
        noteTitleRequired: "عنوان یادداشت را وارد کن!",
        noteContentRequired: "متن یادداشت را وارد کن!",
        eventTitleRequired: "عنوان رویداد را وارد کن!",
        eventDateTimeRequired: "تاریخ و زمان رویداد را انتخاب کن!",
        enterProjectName: "نام پروژه را وارد کن!",
        projectExists: "این پروژه قبلاً اضافه شده!",
        selectProjectFirst: "ابتدا یک پروژه را انتخاب کن!",
        enterTopicName: "نام مبحث را وارد کن!",
        enterPlanName: "لطفاً نامی برای برنامه انتخاب کن!",
        planExists: "برنامه‌ای با این نام قبلاً وجود دارد!",
        noPlanToDelete: "برنامه‌ای برای حذف وجود ندارد!"
    }
};

function t(key) {
    return translations[currentLang]?.[key] || translations.en[key] || key;
}

// ============================================================
//  اعمال زبان
// ============================================================
function applyLanguage() {
    try {
        document.getElementById('brandText').textContent = t('brand');
        document.getElementById('todayLabel').textContent = t('todayLabel');

        const tabs = document.querySelectorAll('.tabs button');
        const tabKeys = ['tabTimer', 'tabProjects', 'tabTasks', 'tabWeekly', 'tabNotes', 'tabCalendar', 'tabSettings'];
        tabs.forEach((btn, i) => {
            if (i < tabKeys.length) btn.textContent = t(tabKeys[i]);
        });

        // Timer
        const timerCardTitle = document.querySelector('#tab-timer .card h3');
        if (timerCardTitle) timerCardTitle.textContent = t('timerFocus');
        document.getElementById('modeStopwatch').textContent = t('timerStopwatch');
        document.getElementById('modeCountdown').textContent = t('timerCountdown');
        document.getElementById('startBtn').textContent = t('timerStart');
        document.getElementById('resetBtn').textContent = t('timerReset');
        document.getElementById('setCustomCountdown').textContent = t('timerSet');
        document.getElementById('saveTimerSession').textContent = t('timerSave');

        document.getElementById('statDailyLabel').textContent = t('statsToday');
        document.getElementById('statWeeklyLabel').textContent = t('statsWeek');
        document.getElementById('statMonthlyLabel').textContent = t('statsMonth');
        document.getElementById('statYearlyLabel').textContent = t('statsYear');

        const logsTitle = document.querySelector('#tab-timer .card:nth-child(3) h3');
        if (logsTitle) logsTitle.textContent = t('logsTitle');
        document.getElementById('studyHours').placeholder = t('logPlaceholder');
        document.getElementById('studyProjectSelect').options[0].text = t('logSelect');
        document.getElementById('logStudyBtn').textContent = t('logButton');

        // Projects
        document.getElementById('globalProgressLabel').textContent = t('globalProgress');
        const manageTitle = document.querySelector('#tab-projects .card:nth-child(2) h3');
        if (manageTitle) manageTitle.textContent = t('manageProjects');
        document.getElementById('addProjectBtn').textContent = t('addProject');
        document.getElementById('addTopicBtn').textContent = t('addTopic');
        const chartsTitle = document.querySelector('#tab-projects .card:nth-child(3) h3');
        if (chartsTitle) chartsTitle.textContent = t('chartsTitle');
        document.getElementById('goalChartTitle').textContent = t('goalChart');
        document.getElementById('trendChartTitle').textContent = t('trendChart');

        // Tasks
        const taskTitle = document.querySelector('#tab-tasks .card h3');
        if (taskTitle) taskTitle.textContent = t('taskTitle');
        document.getElementById('taskCategoryFilter').options[0].text = t('taskAllCategories');
        const filterType = document.getElementById('taskFilterType');
        filterType.options[0].text = t('taskFilterToday');
        filterType.options[1].text = t('taskFilterFuture');
        filterType.options[2].text = t('taskFilterAll');
        document.getElementById('refreshTasksBtn').textContent = t('taskRefresh');
        document.getElementById('openAddTaskModal').textContent = t('taskNew');

        // Weekly
        const weeklyTitle = document.querySelector('#tab-weekly .card h3');
        if (weeklyTitle) weeklyTitle.textContent = t('weeklyTitle');
        document.getElementById('createPlanBtn').textContent = t('weeklyCreate');
        document.getElementById('deletePlanBtn').textContent = t('weeklyDelete');

        // Notes
        const notesTitle = document.querySelector('#tab-notes .card h3');
        if (notesTitle) notesTitle.textContent = t('notesTitle');
        document.getElementById('saveNoteBtn').textContent = t('notesSave');

        // Calendar
        const calendarTitle = document.querySelector('#tab-calendar .card h3');
        if (calendarTitle) calendarTitle.textContent = t('calendarTitle');
        const eventTitle = document.querySelector('#tab-calendar .countdown-section h4');
        if (eventTitle) eventTitle.textContent = t('calendarEventTitle');
        document.getElementById('addEventBtn').textContent = t('calendarAdd');

        // Settings
        const settingsTitle = document.querySelector('#tab-settings .card h3');
        if (settingsTitle) settingsTitle.textContent = t('settingsTitle');
        const backupTitle = document.querySelector('#tab-settings .settings-group h4');
        if (backupTitle) backupTitle.textContent = t('backupTitle');
        document.getElementById('exportBackupBtn').textContent = t('backupDownload');
        document.getElementById('importBackupBtn').textContent = t('backupUpload');
        const backupNote = document.querySelector('#tab-settings .settings-group .setting-note');
        if (backupNote) backupNote.textContent = t('backupWarning');
        const motivationTitle = document.querySelector('#tab-settings .settings-group:nth-child(2) h4');
        if (motivationTitle) motivationTitle.textContent = t('motivationTitle');
        document.getElementById('saveMotivationBtn').textContent = t('motivationSave');
        const socialTitle = document.querySelector('#tab-settings .settings-group:nth-child(3) h4');
        if (socialTitle) socialTitle.textContent = t('socialTitle');

        // Modal
        document.getElementById('taskModalTitle').textContent = t('taskModalNew');
        document.getElementById('taskTitleLabel').textContent = t('taskModalTitle');
        document.getElementById('taskDescLabel').textContent = t('taskModalDesc');
        document.getElementById('taskCategoryLabel').textContent = t('taskModalCategory');
        document.getElementById('taskPriorityLabel').textContent = t('taskModalPriority');
        document.getElementById('taskDateLabel').textContent = t('taskModalDate');
        document.getElementById('taskRecurrenceLabel').textContent = t('taskModalRecurrence');
        document.getElementById('taskWeeklyDaysLabel').textContent = t('taskModalWeeklyDays');
        document.getElementById('taskSubtasksLabel').textContent = t('taskModalSubtasks');
        document.getElementById('closeTaskModal').textContent = t('taskModalCancel');
        document.getElementById('saveTaskBtn').textContent = t('taskModalSave');

        // Footer
        document.querySelector('.footer a:first-child').textContent = '🔗 GitHub';
        document.querySelector('.footer a:last-child').textContent = '🔗 LinkedIn';

        // رندر مجدد
        renderTasks();
        renderProjects();
        renderStudyLogs();
        renderNotes();
        renderCountdowns();
        renderWeeklyPlans();
        renderCharts();
        updateHeaderStudyTime();
        updateMotivationDisplay();
    } catch (err) {
        console.error("Apply language error:", err);
    }
}

// ============================================================
//  هدر - نمایش زمان به صورت شیک
// ============================================================
function updateHeaderStudyTime() {
    try {
        const todayStr = getTodayStr();
        let totalMinutes = 0;
        currentData.studyLogs.forEach(log => {
            if (log.date.split('T')[0] === todayStr) {
                totalMinutes += log.hours * 60;
            }
        });
        const hours = Math.floor(totalMinutes / 60);
        const mins = Math.floor(totalMinutes % 60);
        const el = document.getElementById('headerStudyTime');
        if (el) {
            const timeStr = `${hours}h ${mins}m`;
            el.innerHTML = `${timeStr} <span id="todayLabel">${t('todayLabel')}</span>`;
        }
    } catch (err) {
        console.error("Update header error:", err);
    }
}

// ============================================================
//  تایمر
// ============================================================
function updateTimerDisplay() {
    const h = pad(Math.floor(seconds / 3600));
    const m = pad(Math.floor((seconds % 3600) / 60));
    const s = pad(seconds % 60);
    const display = document.getElementById('timerDisplay');
    if (display) display.textContent = `${h}:${m}:${s}`;
}

function toggleTimer() {
    try {
        const startBtn = document.getElementById('startBtn');
        const statusBadge = document.getElementById('statusBadge');
        if (!startBtn || !statusBadge) return;

        if (isRunning) {
            clearInterval(timerInterval);
            isRunning = false;
            startBtn.textContent = t('timerStart');
            startBtn.classList.remove('running');
            statusBadge.textContent = t('statusStopped');
            return;
        }
        if (timerMode === 'countdown' && seconds <= 0 && countdownTarget > 0) {
            seconds = countdownTarget;
            updateTimerDisplay();
        }
        if (timerMode === 'countdown' && seconds <= 0) {
            alert(t('enterValidMinutes'));
            return;
        }
        isRunning = true;
        startBtn.textContent = t('timerStop');
        startBtn.classList.add('running');
        statusBadge.textContent = t('statusRunning');
        timerInterval = setInterval(() => {
            if (timerMode === 'stopwatch') {
                seconds++;
            } else {
                if (seconds > 0) {
                    seconds--;
                } else {
                    clearInterval(timerInterval);
                    isRunning = false;
                    startBtn.textContent = t('timerStart');
                    startBtn.classList.remove('running');
                    statusBadge.textContent = t('statusDone');
                    if (Notification.permission === 'granted') {
                        new Notification('⏰ Time is up!');
                    }
                }
            }
            updateTimerDisplay();
        }, 1000);
    } catch (err) {
        console.error("Timer toggle error:", err);
    }
}

function resetTimer() {
    try {
        clearInterval(timerInterval);
        isRunning = false;
        const startBtn = document.getElementById('startBtn');
        const statusBadge = document.getElementById('statusBadge');
        if (startBtn) {
            startBtn.textContent = t('timerStart');
            startBtn.classList.remove('running');
        }
        if (statusBadge) statusBadge.textContent = t('statusReady');
        if (timerMode === 'stopwatch') {
            seconds = 0;
        } else {
            seconds = countdownTarget;
        }
        updateTimerDisplay();
    } catch (err) {
        console.error("Reset timer error:", err);
    }
}

function setTimerFromMinutes(minutes) {
    try {
        if (timerMode === 'countdown') {
            countdownTarget = minutes * 60;
            seconds = countdownTarget;
            updateTimerDisplay();
            const statusBadge = document.getElementById('statusBadge');
            if (statusBadge) statusBadge.textContent = `⏱ ${minutes} min (countdown)`;
        } else {
            resetTimer();
            seconds = minutes * 60;
            updateTimerDisplay();
            const statusBadge = document.getElementById('statusBadge');
            if (statusBadge) statusBadge.textContent = `⏱ ${minutes} min`;
        }
    } catch (err) {
        console.error("Set timer error:", err);
    }
}

function setCustomCountdown() {
    try {
        const input = document.getElementById('customMinutes');
        if (!input) return;
        const minutes = parseInt(input.value);
        if (!minutes || minutes <= 0) {
            alert(t('enterValidMinutes'));
            return;
        }
        if (timerMode !== 'countdown') {
            alert('Please switch to countdown mode first!');
            return;
        }
        setTimerFromMinutes(minutes);
        input.value = '';
    } catch (err) {
        console.error("Custom countdown error:", err);
    }
}

function switchTimerMode(mode) {
    try {
        if (mode === timerMode) return;
        clearInterval(timerInterval);
        isRunning = false;
        timerMode = mode;
        const startBtn = document.getElementById('startBtn');
        const statusBadge = document.getElementById('statusBadge');
        if (startBtn) {
            startBtn.textContent = t('timerStart');
            startBtn.classList.remove('running');
        }
        if (statusBadge) statusBadge.textContent = t('statusReady');
        const modeStopwatch = document.getElementById('modeStopwatch');
        const modeCountdown = document.getElementById('modeCountdown');
        if (mode === 'stopwatch') {
            if (modeStopwatch) modeStopwatch.classList.add('active-mode');
            if (modeCountdown) modeCountdown.classList.remove('active-mode');
            seconds = 0;
            countdownTarget = 0;
        } else {
            if (modeCountdown) modeCountdown.classList.add('active-mode');
            if (modeStopwatch) modeStopwatch.classList.remove('active-mode');
            seconds = 0;
            countdownTarget = 0;
        }
        updateTimerDisplay();
    } catch (err) {
        console.error("Switch timer mode error:", err);
    }
}

function saveTimerSession() {
    try {
        const sel = document.getElementById('timerProjectSelect');
        if (!sel) return;
        const project = sel.value;
        if (!project) { alert(t('selectProject')); return; }
        let elapsedSeconds;
        if (timerMode === 'countdown') {
            elapsedSeconds = countdownTarget - seconds;
            if (elapsedSeconds < 0) elapsedSeconds = 0;
        } else {
            elapsedSeconds = seconds;
        }
        if (elapsedSeconds < 1) { alert('No time recorded!'); return; }

        const hours = elapsedSeconds / 3600;
        const log = {
            id: generateId(),
            date: new Date().toISOString(),
            hours: Math.round(hours * 100) / 100,
            subject: project,
            desc: timerMode === 'countdown' ? 'Countdown session' : 'Timer session'
        };
        currentData.studyLogs.push(log);
        saveData(() => {
            renderStudyLogs();
            renderAllStats();
            renderProjectSelectors();
            renderCharts();
            updateHeaderStudyTime();
            alert(t('sessionSaved'));
        });
    } catch (err) {
        console.error("Save timer session error:", err);
    }
}

// ============================================================
//  ثبت جلسات
// ============================================================
function logStudy() {
    try {
        const hoursInput = document.getElementById('studyHours');
        const projectSel = document.getElementById('studyProjectSelect');
        if (!hoursInput || !projectSel) return;
        const hours = parseFloat(hoursInput.value);
        const project = projectSel.value;
        if (!hours || hours <= 0) { alert(t('enterValidHours')); return; }
        if (!project) { alert(t('selectProject')); return; }

        const log = {
            id: generateId(),
            date: new Date().toISOString(),
            hours: hours,
            subject: project,
            desc: 'Manual log'
        };
        currentData.studyLogs.push(log);
        hoursInput.value = '';
        saveData(() => {
            renderStudyLogs();
            renderAllStats();
            renderProjectSelectors();
            renderCharts();
            updateHeaderStudyTime();
        });
    } catch (err) {
        console.error("Log study error:", err);
    }
}

// ============================================================
//  آمار
// ============================================================
function renderAllStats() {
    try {
        const now = new Date();
        const todayStr = getTodayStr();
        const year = now.getFullYear();
        const month = now.getMonth();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);

        let daily = 0, weekly = 0, monthly = 0, yearly = 0;

        currentData.studyLogs.forEach(log => {
            const logDate = new Date(log.date);
            const logDateStr = log.date.split('T')[0];
            const hours = log.hours;

            if (logDateStr === todayStr) daily += hours;
            if (logDate >= weekStart) weekly += hours;
            if (logDate.getFullYear() === year && logDate.getMonth() === month) monthly += hours;
            if (logDate.getFullYear() === year) yearly += hours;
        });

        document.getElementById('statDaily').textContent = daily.toFixed(1);
        document.getElementById('statWeekly').textContent = weekly.toFixed(1);
        document.getElementById('statMonthly').textContent = monthly.toFixed(1);
        document.getElementById('statYearly').textContent = yearly.toFixed(1);
    } catch (err) {
        console.error("Render stats error:", err);
    }
}

function renderStudyLogs() {
    try {
        const container = document.getElementById('studyLogList');
        if (!container) return;
        const logs = currentData.studyLogs.slice(-15).reverse();
        if (logs.length === 0) {
            container.innerHTML = `<div style="color:#64748b;">${t('noLogs')}</div>`;
            return;
        }
        container.innerHTML = logs.map(log => `
            <div class="log-item">
                <span>📌 ${new Date(log.date).toLocaleDateString('en-US')} — <strong>${log.subject}</strong> — ${log.hours} hrs</span>
                <div class="log-actions">
                    <button class="del-log" data-id="${log.id}">🗑️</button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.del-log').forEach(btn => {
            btn.addEventListener('click', function() {
                if (confirm(t('confirmDelete'))) {
                    const id = this.dataset.id;
                    currentData.studyLogs = currentData.studyLogs.filter(l => l.id !== id);
                    saveData(() => {
                        renderStudyLogs();
                        renderAllStats();
                        renderCharts();
                        updateHeaderStudyTime();
                    });
                }
            });
        });
    } catch (err) {
        console.error("Render study logs error:", err);
    }
}

// ============================================================
//  مدیریت پروژه‌ها
// ============================================================
function renderProjects() {
    try {
        const container = document.getElementById('projectsList');
        if (!container) return;
        const projects = currentData.projects;
        const names = Object.keys(projects);

        let totalTopics = 0, doneTopics = 0;

        if (names.length === 0) {
            container.innerHTML = `<div style="color:#64748b; text-align:center; padding:20px 0;">${t('noProjects')}</div>`;
            updateGlobalProgress(0, 0);
            renderProjectSelectors();
            return;
        }

        let html = '';
        for (const name of names) {
            const topics = projects[name].topics || [];
            const done = topics.filter(t => t.done).length;
            const total = topics.length;
            totalTopics += total;
            doneTopics += done;
            const percent = total === 0 ? 0 : Math.round((done / total) * 100);

            html += `
                <div class="project-card">
                    <div class="project-title">
                        <span>📘 ${name}</span>
                        <span style="font-size:14px; color:#94a3b8;">${done}/${total}</span>
                    </div>
                    <div class="project-stats">
                        <span>📊 ${percent}%</span>
                        <span>📌 ${total} topics</span>
                    </div>
                    <div class="progress-mini"><div class="fill" style="width:${percent}%; background: ${percent < 30 ? '#ef4444' : percent < 70 ? '#f59e0b' : '#22c55e'};"></div></div>
            `;

            if (topics.length === 0) {
                html += `<div style="color:#64748b; font-size:14px; padding:4px 0;">${t('noTopics')}</div>`;
            } else {
                for (let i = 0; i < topics.length; i++) {
                    const t = topics[i];
                    const checked = t.done ? 'checked' : '';
                    const doneClass = t.done ? 'done-text' : '';
                    html += `
                        <div class="topic-item">
                            <input type="checkbox" data-project="${name}" data-index="${i}" ${checked}>
                            <span class="${doneClass}">${t.name}</span>
                            <button class="del-topic" data-project="${name}" data-index="${i}">✕</button>
                        </div>
                    `;
                }
            }
            html += `</div>`;
        }

        container.innerHTML = html;

        container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', function() {
                const project = this.dataset.project;
                const index = parseInt(this.dataset.index);
                if (currentData.projects[project] && currentData.projects[project].topics[index]) {
                    currentData.projects[project].topics[index].done = this.checked;
                    saveData(() => {
                        renderProjects();
                        renderProjectSelectors();
                        renderCharts();
                    });
                }
            });
        });

        container.querySelectorAll('.del-topic').forEach(btn => {
            btn.addEventListener('click', function() {
                const project = this.dataset.project;
                const index = parseInt(this.dataset.index);
                if (confirm(t('confirmDelete'))) {
                    currentData.projects[project].topics.splice(index, 1);
                    saveData(() => {
                        renderProjects();
                        renderProjectSelectors();
                    });
                }
            });
        });

        updateGlobalProgress(totalTopics, doneTopics);
        renderProjectSelectors();
    } catch (err) {
        console.error("Render projects error:", err);
    }
}

function updateGlobalProgress(total, done) {
    try {
        const percent = total === 0 ? 0 : Math.round((done / total) * 100);
        document.getElementById('globalProgressBig').textContent = percent + '%';
        document.getElementById('globalProgressFill').style.width = percent + '%';
        document.getElementById('globalProgressDetail').textContent = `${done} ${t('globalDetail')} ${total}`;
    } catch (err) {
        console.error("Update global progress error:", err);
    }
}

function renderProjectSelectors() {
    try {
        const names = Object.keys(currentData.projects);
        const selects = ['projectSelector', 'timerProjectSelect', 'studyProjectSelect'];
        selects.forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            const currentVal = sel.value;
            sel.innerHTML = `<option value="">${t('logSelect')}</option>`;
            names.forEach(n => {
                const opt = document.createElement('option');
                opt.value = n;
                opt.textContent = n;
                sel.appendChild(opt);
            });
            if (names.includes(currentVal)) sel.value = currentVal;
        });
    } catch (err) {
        console.error("Render project selectors error:", err);
    }
}

function addProject() {
    try {
        const input = document.getElementById('projectInput');
        if (!input) return;
        const name = input.value.trim();
        if (!name) { alert(t('enterProjectName')); return; }
        if (currentData.projects[name]) { alert(t('projectExists')); return; }
        currentData.projects[name] = { topics: [] };
        input.value = '';
        saveData(() => {
            renderProjects();
            renderProjectSelectors();
        });
    } catch (err) {
        console.error("Add project error:", err);
    }
}

function addTopic() {
    try {
        const sel = document.getElementById('projectSelector');
        const input = document.getElementById('topicInput');
        if (!sel || !input) return;
        const project = sel.value;
        const name = input.value.trim();
        if (!project) { alert(t('selectProjectFirst')); return; }
        if (!name) { alert(t('enterTopicName')); return; }
        currentData.projects[project].topics.push({ name, done: false });
        input.value = '';
        saveData(() => {
            renderProjects();
            renderProjectSelectors();
        });
    } catch (err) {
        console.error("Add topic error:", err);
    }
}

// ============================================================
//  برنامه هفتگی با قابلیت ویرایش هدف
// ============================================================
function renderWeeklyPlans() {
    try {
        const container = document.getElementById('weeklyPlanList');
        if (!container) return;
        const planNames = Object.keys(currentData.weeklyPlans);
        if (planNames.length === 0) {
            container.innerHTML = `<span style="color:#64748b; font-size:14px;">${t('noPlans')}</span>`;
            document.getElementById('weeklyGrid').innerHTML = '';
            document.getElementById('weeklyGoalContainer').innerHTML = '';
            return;
        }
        container.innerHTML = planNames.map(name => `
            <button class="${name === currentData.currentPlan ? 'active-plan' : ''}" data-plan="${name}">${name}</button>
        `).join('');

        container.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', function() {
                currentData.currentPlan = this.dataset.plan;
                saveData(() => {
                    renderWeeklyPlans();
                    renderWeeklyGrid();
                    renderWeeklyGoalEditor();
                    renderCharts();
                });
            });
        });

        if (!currentData.currentPlan || !currentData.weeklyPlans[currentData.currentPlan]) {
            currentData.currentPlan = planNames[0] || null;
            if (currentData.currentPlan) {
                saveData(() => {
                    renderWeeklyPlans();
                    renderWeeklyGrid();
                    renderWeeklyGoalEditor();
                    renderCharts();
                });
            }
        }
        renderWeeklyGrid();
        renderWeeklyGoalEditor();
    } catch (err) {
        console.error("Render weekly plans error:", err);
    }
}

function renderWeeklyGoalEditor() {
    try {
        const container = document.getElementById('weeklyGoalContainer');
        if (!container) return;
        if (!currentData.currentPlan || !currentData.weeklyPlans[currentData.currentPlan]) {
            container.innerHTML = '';
            return;
        }
        const plan = currentData.weeklyPlans[currentData.currentPlan];
        const goal = plan.goalHours || 0;
        container.innerHTML = `
            <div class="weekly-goal-edit">
                <span style="color:#94a3b8;">🎯 ${t('weeklyGoal')}:</span>
                <input type="number" id="goalEditInput" value="${goal}" step="0.5" min="0" style="width:80px;">
                <button id="updateGoalBtn">${t('weeklyGoalUpdate')}</button>
            </div>
        `;

        document.getElementById('updateGoalBtn').addEventListener('click', function() {
            const input = document.getElementById('goalEditInput');
            const newGoal = parseFloat(input.value);
            if (isNaN(newGoal) || newGoal < 0) {
                alert('Please enter a valid number!');
                return;
            }
            if (currentData.currentPlan && currentData.weeklyPlans[currentData.currentPlan]) {
                currentData.weeklyPlans[currentData.currentPlan].goalHours = newGoal;
                saveData(() => {
                    renderWeeklyGrid();
                    renderWeeklyGoalEditor();
                    renderCharts();
                });
            }
        });
    } catch (err) {
        console.error("Render weekly goal editor error:", err);
    }
}

function renderWeeklyGrid() {
    try {
        const grid = document.getElementById('weeklyGrid');
        if (!grid) return;
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        if (!currentData.currentPlan || !currentData.weeklyPlans[currentData.currentPlan]) {
            grid.innerHTML = `<div style="color:#64748b; text-align:center; padding:20px;">${t('noPlanSelected')}</div>`;
            return;
        }
        const plan = currentData.weeklyPlans[currentData.currentPlan];
        const goal = plan.goalHours || 0;
        let html = `
            <div style="grid-column: 1 / -1; background: #0f172a; border-radius: 16px; padding: 12px; text-align: center; margin-bottom: 6px; border: 1px solid #334155;">
                🎯 ${t('weeklyGoal')}: <span style="color: #facc15; font-weight: 700;">${goal} hrs</span>
            </div>
        `;
        html += days.map(day => `
            <div class="day">
                <div class="day-name">${day}</div>
                <textarea data-day="${day}" placeholder="Plan for this day...">${plan.days[day] || ''}</textarea>
            </div>
        `).join('');

        grid.innerHTML = html;

        grid.querySelectorAll('textarea').forEach(ta => {
            ta.addEventListener('change', function() {
                if (currentData.currentPlan && currentData.weeklyPlans[currentData.currentPlan]) {
                    currentData.weeklyPlans[currentData.currentPlan].days[this.dataset.day] = this.value;
                    saveData();
                    renderCharts();
                }
            });
        });
    } catch (err) {
        console.error("Render weekly grid error:", err);
    }
}

function createWeeklyPlan() {
    try {
        const nameInput = document.getElementById('newPlanName');
        const goalInput = document.getElementById('planHourGoal');
        if (!nameInput || !goalInput) return;
        const name = nameInput.value.trim();
        const goal = parseFloat(goalInput.value) || 0;
        if (!name) { alert(t('enterPlanName')); return; }
        if (currentData.weeklyPlans[name]) { alert(t('planExists')); return; }
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const emptyPlan = {};
        days.forEach(d => emptyPlan[d] = '');
        currentData.weeklyPlans[name] = { days: emptyPlan, goalHours: goal };
        currentData.currentPlan = name;
        nameInput.value = '';
        goalInput.value = '';
        saveData(() => {
            renderWeeklyPlans();
            renderWeeklyGrid();
            renderWeeklyGoalEditor();
            renderCharts();
        });
    } catch (err) {
        console.error("Create weekly plan error:", err);
    }
}

function deleteCurrentPlan() {
    try {
        if (!currentData.currentPlan) { alert(t('noPlanToDelete')); return; }
        if (!confirm(t('confirmDelete'))) return;
        delete currentData.weeklyPlans[currentData.currentPlan];
        const planNames = Object.keys(currentData.weeklyPlans);
        currentData.currentPlan = planNames.length > 0 ? planNames[0] : null;
        saveData(() => {
            renderWeeklyPlans();
            renderWeeklyGrid();
            renderWeeklyGoalEditor();
            renderCharts();
        });
    } catch (err) {
        console.error("Delete weekly plan error:", err);
    }
}

// ============================================================
//  یادداشت‌ها
// ============================================================
function renderNotes() {
    try {
        const container = document.getElementById('noteList');
        if (!container) return;
        if (currentData.notes.length === 0) {
            container.innerHTML = `<span style="color:#64748b; font-size:14px;">${t('noNotes')}</span>`;
            return;
        }
        container.innerHTML = currentData.notes.map(n => `
            <div class="note-item" data-id="${n.id}">
                <div class="note-title">${n.title}</div>
                <span class="note-date">${new Date(n.date).toLocaleDateString('en-US')}</span>
                <div class="note-actions">
                    <button class="edit-note" data-id="${n.id}">✏️ ${t('taskEdit')}</button>
                    <button class="del-note" data-id="${n.id}">🗑️</button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.edit-note').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = this.dataset.id;
                const note = currentData.notes.find(n => n.id === id);
                if (note) {
                    document.getElementById('noteTitle').value = note.title;
                    document.getElementById('noteContent').value = note.content;
                    currentData.notes = currentData.notes.filter(n => n.id !== id);
                    saveData(() => renderNotes());
                }
            });
        });

        container.querySelectorAll('.del-note').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (confirm(t('confirmDelete'))) {
                    const id = this.dataset.id;
                    currentData.notes = currentData.notes.filter(n => n.id !== id);
                    saveData(() => renderNotes());
                }
            });
        });

        container.querySelectorAll('.note-title').forEach(title => {
            title.addEventListener('click', function() {
                const parent = this.closest('.note-item');
                if (!parent) return;
                const id = parent.dataset.id;
                const note = currentData.notes.find(n => n.id === id);
                if (note) {
                    alert(`📝 ${note.title}\n\n${note.content}`);
                }
            });
        });
    } catch (err) {
        console.error("Render notes error:", err);
    }
}

function saveNote() {
    try {
        const titleInput = document.getElementById('noteTitle');
        const contentInput = document.getElementById('noteContent');
        if (!titleInput || !contentInput) return;
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        if (!title) { alert(t('noteTitleRequired')); return; }
        if (!content) { alert(t('noteContentRequired')); return; }
        currentData.notes.push({
            id: generateId(),
            title: title,
            content: content,
            date: new Date().toISOString()
        });
        titleInput.value = '';
        contentInput.value = '';
        saveData(() => renderNotes());
    } catch (err) {
        console.error("Save note error:", err);
    }
}

// ============================================================
//  جمله انگیزشی (نمایش در بالای صفحه و ویرایش در تنظیمات)
// ============================================================
function updateMotivationDisplay() {
    try {
        const display = document.getElementById('currentMotivationDisplay');
        if (display) {
            display.textContent = `Current: ${currentData.motivation}`;
        }
        let motDisplay = document.getElementById('motivationDisplay');
        if (!motDisplay) {
            let section = document.getElementById('motivationSection');
            if (!section) {
                section = document.createElement('div');
                section.className = 'motivation-section';
                section.id = 'motivationSection';
                const header = document.querySelector('.main-header');
                if (header && header.parentNode) {
                    header.parentNode.insertBefore(section, header.nextSibling);
                } else {
                    document.body.insertBefore(section, document.body.firstChild);
                }
            }
            motDisplay = document.createElement('div');
            motDisplay.className = 'motivation-text';
            motDisplay.id = 'motivationDisplay';
            section.appendChild(motDisplay);
        }
        motDisplay.textContent = currentData.motivation;
    } catch (err) {
        console.error("Update motivation display error:", err);
    }
}

function saveMotivation() {
    try {
        const input = document.getElementById('motivationInput');
        if (!input) return;
        const text = input.value.trim();
        if (!text) { alert('Please enter a motivation message!'); return; }
        currentData.motivation = text;
        saveData(() => {
            updateMotivationDisplay();
            input.value = '';
        });
    } catch (err) {
        console.error("Save motivation error:", err);
    }
}

// ============================================================
//  تقویم میلادی
// ============================================================
function renderCalendar(year, month) {
    try {
        const grid = document.getElementById('calendarGrid');
        const label = document.getElementById('calMonthLabel');
        if (!grid || !label) return;

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        label.textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        const todayDate = today.getDate();
        const todayMonth = today.getMonth();
        const todayYear = today.getFullYear();

        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let html = weekdays.map(w => `<div class="weekday">${w}</div>`).join('');

        for (let i = 0; i < firstDay; i++) {
            html += `<div class="day-cell empty"></div>`;
        }

        const eventsThisMonth = currentData.events.filter(e => {
            const d = new Date(e.dateTime);
            return d.getFullYear() === year && d.getMonth() === month;
        });
        const eventDays = new Set(eventsThisMonth.map(e => new Date(e.dateTime).getDate()));

        for (let d = 1; d <= daysInMonth; d++) {
            const isToday = (d === todayDate && month === todayMonth && year === todayYear);
            const hasEvent = eventDays.has(d);
            html += `<div class="day-cell ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}">${d}</div>`;
        }

        grid.innerHTML = html;
    } catch (err) {
        console.error("Render calendar error:", err);
    }
}

// ============================================================
//  روزشمار
// ============================================================
function renderCountdowns() {
    try {
        const container = document.getElementById('countdownList');
        if (!container) return;
        if (currentData.events.length === 0) {
            container.innerHTML = `<div style="color:#64748b;">${t('noEvents')}</div>`;
            return;
        }

        const now = new Date();
        const sorted = [...currentData.events].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

        container.innerHTML = sorted.map(e => {
            const target = new Date(e.dateTime);
            const diffMs = target - now;
            let remaining = '';
            if (diffMs <= 0) {
                remaining = t('eventPast');
            } else {
                const totalSec = Math.floor(diffMs / 1000);
                const days = Math.floor(totalSec / 86400);
                const hours = Math.floor((totalSec % 86400) / 3600);
                const mins = Math.floor((totalSec % 3600) / 60);
                const secs = totalSec % 60;
                remaining = `${days}d ${hours}h ${mins}m ${secs}s`;
            }
            return `
                <div class="countdown-item">
                    <div class="cd-info">
                        <span class="cd-title">${e.title}</span>
                        <span class="cd-date">${new Date(e.dateTime).toLocaleDateString('en-US')} ${new Date(e.dateTime).toLocaleTimeString('en-US')}</span>
                    </div>
                    <div>
                        <span class="cd-remaining">${remaining}</span>
                        <button class="del-cd" data-id="${e.id}">✕</button>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.del-cd').forEach(btn => {
            btn.addEventListener('click', function() {
                if (confirm(t('confirmDelete'))) {
                    const id = this.dataset.id;
                    currentData.events = currentData.events.filter(e => e.id !== id);
                    saveData(() => {
                        renderCountdowns();
                        renderCalendar(calendarYear, calendarMonth);
                    });
                }
            });
        });
    } catch (err) {
        console.error("Render countdowns error:", err);
    }
}

function addEvent() {
    try {
        const titleInput = document.getElementById('eventTitle');
        const dateInput = document.getElementById('eventDateTime');
        if (!titleInput || !dateInput) return;
        const title = titleInput.value.trim();
        const dateTime = dateInput.value;
        if (!title) { alert(t('eventTitleRequired')); return; }
        if (!dateTime) { alert(t('eventDateTimeRequired')); return; }
        currentData.events.push({
            id: generateId(),
            title: title,
            dateTime: dateTime
        });
        titleInput.value = '';
        dateInput.value = '';
        saveData(() => {
            renderCountdowns();
            renderCalendar(calendarYear, calendarMonth);
        });
    } catch (err) {
        console.error("Add event error:", err);
    }
}

function startCountdownUpdater() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(renderCountdowns, 1000);
}

// ============================================================
//  نمودارها
// ============================================================
function renderCharts() {
    renderGoalChart();
    renderTrendChart();
}

function renderGoalChart() {
    try {
        const canvas = document.getElementById('goalChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = 80;

        ctx.clearRect(0, 0, width, height);

        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);
        let weekHours = 0;
        currentData.studyLogs.forEach(log => {
            if (new Date(log.date) >= weekStart) {
                weekHours += log.hours;
            }
        });

        let goal = 0;
        if (currentData.currentPlan && currentData.weeklyPlans[currentData.currentPlan]) {
            goal = currentData.weeklyPlans[currentData.currentPlan].goalHours || 0;
        }
        if (goal === 0) goal = 1;

        const percent = Math.min((weekHours / goal) * 100, 100);
        document.getElementById('goalPercent').textContent = `${Math.round(percent)}%`;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 16;
        ctx.stroke();

        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (percent / 100) * 2 * Math.PI;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.strokeStyle = percent < 30 ? '#ef4444' : percent < 70 ? '#f59e0b' : '#22c55e';
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'bold 24px Tahoma';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(percent)}%`, centerX, centerY - 4);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px Tahoma';
        ctx.fillText(`${weekHours.toFixed(1)}/${goal}h`, centerX, centerY + 30);
    } catch (err) {
        console.error("Render goal chart error:", err);
    }
}

function renderTrendChart() {
    try {
        const canvas = document.getElementById('trendChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const days = [];
        const hours = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
            let dayHours = 0;
            currentData.studyLogs.forEach(log => {
                if (log.date.split('T')[0] === dateStr) {
                    dayHours += log.hours;
                }
            });
            days.push(dayName);
            hours.push(dayHours);
        }

        const maxVal = Math.max(...hours, 1);
        const padding = 30;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        const points = hours.map((h, i) => {
            const x = padding + (i / (hours.length - 1)) * chartWidth;
            const y = height - padding - (h / maxVal) * chartHeight;
            return { x, y, val: h };
        });

        ctx.beginPath();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2.5;
        points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        points.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = '#3b82f6';
            ctx.fill();
            ctx.fillStyle = '#f1f5f9';
            ctx.font = '10px Tahoma';
            ctx.textAlign = 'center';
            ctx.fillText(p.val.toFixed(1), p.x, p.y - 10);
        });

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px Tahoma';
        ctx.textAlign = 'center';
        days.forEach((d, i) => {
            const x = padding + (i / (days.length - 1)) * chartWidth;
            ctx.fillText(d, x, height - padding + 16);
        });
    } catch (err) {
        console.error("Render trend chart error:", err);
    }
}

// ============================================================
//  پشتیبان‌گیری
// ============================================================
function exportBackup() {
    try {
        const data = JSON.stringify(currentData, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        a.download = `backup-${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Export backup error:", err);
        alert("Error exporting backup!");
    }
}

function importBackup(file) {
    try {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);
                const requiredKeys = ['projects', 'studyLogs', 'weeklyPlans', 'notes', 'events', 'motivation', 'categories', 'tasks', 'dailyOverrides'];
                const hasAll = requiredKeys.every(key => key in imported);
                if (!hasAll) {
                    alert(t('invalidBackup'));
                    return;
                }
                if (!confirm(t('confirmOverwrite'))) return;
                currentData = imported;
                saveData(() => {
                    renderProjects();
                    renderStudyLogs();
                    renderAllStats();
                    renderWeeklyPlans();
                    renderNotes();
                    renderCountdowns();
                    renderCalendar(calendarYear, calendarMonth);
                    renderCharts();
                    updateHeaderStudyTime();
                    updateMotivationDisplay();
                    renderProjectSelectors();
                    renderTaskFilters();
                    renderTasks();
                    alert(t('importSuccess'));
                });
            } catch (err) {
                alert('Error: ' + err.message);
            }
        };
        reader.readAsText(file);
    } catch (err) {
        console.error("Import backup error:", err);
    }
}

// ============================================================
//  مدیریت تب‌ها
// ============================================================
function switchTab(tabId) {
    try {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tabs button').forEach(btn => btn.classList.remove('active'));

        const targetTab = document.getElementById(tabId);
        if (targetTab) targetTab.classList.add('active');
        else return;

        const targetBtn = document.querySelector(`.tabs button[data-tab="${tabId}"]`);
        if (targetBtn) targetBtn.classList.add('active');

        if (tabId === 'tab-timer') {
            renderStudyLogs();
            renderAllStats();
            updateHeaderStudyTime();
        }
        if (tabId === 'tab-calendar') {
            renderCountdowns();
            renderCalendar(calendarYear, calendarMonth);
        }
        if (tabId === 'tab-projects') {
            renderCharts();
        }
        if (tabId === 'tab-tasks') {
            renderTasks();
        }
        if (tabId === 'tab-settings') {
            updateMotivationDisplay();
        }
    } catch (err) {
        console.error("Switch tab error:", err);
    }
}

// ============================================================
//  وظایف
// ============================================================
function getTasksForDate(dateStr) {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const tasks = [];
    const now = new Date();

    currentData.tasks.forEach(task => {
        if (task.status === 'done') {
            if (task.completedDate) {
                const completed = new Date(task.completedDate);
                const diffDays = (now - completed) / (1000 * 60 * 60 * 24);
                if (diffDays < 2) {
                    tasks.push({ ...task });
                }
            }
            return;
        }

        if (task.recurrence === null || task.recurrence === undefined) {
            if (task.date === dateStr) {
                tasks.push({ ...task });
            }
        } else if (task.recurrence.type === 'daily') {
            tasks.push({ ...task });
        } else if (task.recurrence.type === 'weekly') {
            const days = task.recurrence.daysOfWeek || [];
            if (days.includes(dayOfWeek)) {
                tasks.push({ ...task });
            }
        }
    });

    const overrides = currentData.dailyOverrides.filter(o => o.date === dateStr);
    tasks.forEach(task => {
        const override = overrides.find(o => o.taskId === task.id);
        if (override) {
            if (override.status) task.status = override.status;
            if (override.note) task.overrideNote = override.note;
        }
    });

    return tasks;
}

function getFutureTasks() {
    const todayStr = getTodayStr();
    const tasks = [];
    currentData.tasks.forEach(task => {
        if (task.status === 'done') return;
        if (task.recurrence !== null && task.recurrence !== undefined) return;
        if (task.date && task.date > todayStr) {
            tasks.push({ ...task });
        }
    });
    return tasks;
}

function renderTasks() {
    try {
        const container = document.getElementById('tasksList');
        if (!container) return;

        const dateInput = document.getElementById('taskDateFilter');
        const dateStr = dateInput ? dateInput.value : getTodayStr();
        const categoryFilter = document.getElementById('taskCategoryFilter');
        const catFilter = categoryFilter ? categoryFilter.value : 'all';
        const filterType = document.getElementById('taskFilterType');
        const type = filterType ? filterType.value : 'today';

        let tasks = [];
        if (type === 'today') {
            tasks = getTasksForDate(dateStr);
        } else if (type === 'future') {
            tasks = getFutureTasks();
        } else {
            const todayTasks = getTasksForDate(dateStr);
            const futureTasks = getFutureTasks();
            tasks = [...todayTasks, ...futureTasks];
            const seen = new Set();
            tasks = tasks.filter(t => {
                if (seen.has(t.id)) return false;
                seen.add(t.id);
                return true;
            });
        }

        if (catFilter !== 'all') {
            tasks = tasks.filter(t => t.category === catFilter);
        }

        if (tasks.length === 0) {
            container.innerHTML = `<div style="color:#64748b; text-align:center; padding:30px 0;">✅ ${t('taskNoTasks')}</div>`;
            return;
        }

        const priorityOrder = { high: 0, medium: 1, low: 2 };
        tasks.sort((a, b) => {
            if (a.status === 'done' && b.status !== 'done') return 1;
            if (b.status === 'done' && a.status !== 'done') return -1;
            return (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
        });

        let html = '';
        tasks.forEach(task => {
            const isDone = task.status === 'done';
            const doneClass = isDone ? 'done-title' : '';
            const priorityLabel = task.priority === 'high' ? t('taskPriorityHigh') : task.priority === 'medium' ? t('taskPriorityMedium') : t('taskPriorityLow');
            const priorityClass = task.priority;

            const cat = currentData.categories.find(c => c.id === task.category);
            const catName = cat ? cat.name : task.category;

            let recurrenceLabel = '';
            if (task.recurrence) {
                if (task.recurrence.type === 'daily') recurrenceLabel = t('taskRecurrenceDaily');
                else if (task.recurrence.type === 'weekly') {
                    const days = task.recurrence.daysOfWeek || [];
                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const daysStr = days.map(d => dayNames[d]).join(', ');
                    recurrenceLabel = `${t('taskRecurrenceWeekly')} (${daysStr})`;
                }
            }

            let subtasksHtml = '';
            if (task.subtasks && task.subtasks.length > 0) {
                subtasksHtml = `<div class="task-subtasks">`;
                task.subtasks.forEach((sub, idx) => {
                    const subDoneClass = sub.done ? 'sub-done' : '';
                    const checked = sub.done ? 'checked' : '';
                    subtasksHtml += `
                        <div class="subtask-item">
                            <input type="checkbox" class="subtask-checkbox" data-taskid="${task.id}" data-subidx="${idx}" ${checked} ${isDone ? 'disabled' : ''}>
                            <span class="${subDoneClass}">${sub.title}</span>
                        </div>
                    `;
                });
                subtasksHtml += `</div>`;
            }

            let overrideHtml = '';
            if (task.overrideNote) {
                overrideHtml = `<div class="task-override-note">📌 ${task.overrideNote}</div>`;
            }

            let doneBadge = '';
            if (isDone && task.completedDate) {
                const doneDate = new Date(task.completedDate);
                const diffHours = Math.floor((new Date() - doneDate) / (1000 * 60 * 60));
                doneBadge = `<span style="font-size:12px; color:#22c55e; background:#1e293b; padding:2px 10px; border-radius:30px; border:1px solid #22c55e;">✅ Done (${diffHours}h ago)</span>`;
            }

            let futureBadge = '';
            if (task.date && task.date > getTodayStr()) {
                futureBadge = `<span class="task-future-badge">📅 ${new Date(task.date).toLocaleDateString('en-US')}</span>`;
            }

            html += `
                <div class="task-item" data-taskid="${task.id}">
                    <div class="task-header">
                        <span class="task-title ${doneClass}">${task.title}</span>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <span class="task-priority ${priorityClass}">${priorityLabel}</span>
                            <span class="task-category">${catName}</span>
                            ${recurrenceLabel ? `<span class="task-recurrence">${recurrenceLabel}</span>` : ''}
                            ${doneBadge}
                            ${futureBadge}
                        </div>
                    </div>
                    ${task.description ? `<div class="task-desc">${task.description}</div>` : ''}
                    ${subtasksHtml}
                    ${overrideHtml}
                    <div class="task-actions">
                        ${!isDone ? `<button class="done-task-btn" data-id="${task.id}">${t('taskDone')}</button>` : `<button class="undone-task-btn" data-id="${task.id}">${t('taskUndo')}</button>`}
                        <button class="edit-task-btn" data-id="${task.id}">${t('taskEdit')}</button>
                        <button class="del-task-btn" data-id="${task.id}">${t('taskDelete')}</button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.done-task-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                const task = currentData.tasks.find(t => t.id === id);
                if (task) {
                    task.status = 'done';
                    task.completedDate = new Date().toISOString();
                    saveData(() => {
                        renderTasks();
                        renderCharts();
                    });
                }
            });
        });

        container.querySelectorAll('.undone-task-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                const task = currentData.tasks.find(t => t.id === id);
                if (task) {
                    task.status = 'pending';
                    task.completedDate = null;
                    saveData(() => {
                        renderTasks();
                        renderCharts();
                    });
                }
            });
        });

        container.querySelectorAll('.edit-task-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                openEditTaskModal(id);
            });
        });

        container.querySelectorAll('.del-task-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (confirm(t('confirmDelete'))) {
                    const id = this.dataset.id;
                    currentData.tasks = currentData.tasks.filter(t => t.id !== id);
                    saveData(() => {
                        renderTasks();
                        renderCharts();
                    });
                }
            });
        });

        container.querySelectorAll('.subtask-checkbox').forEach(cb => {
            cb.addEventListener('change', function() {
                const taskId = this.dataset.taskid;
                const subIdx = parseInt(this.dataset.subidx);
                const task = currentData.tasks.find(t => t.id === taskId);
                if (task && task.subtasks && task.subtasks[subIdx]) {
                    task.subtasks[subIdx].done = this.checked;
                    saveData(() => {
                        renderTasks();
                    });
                }
            });
        });
    } catch (err) {
        console.error("Render tasks error:", err);
    }
}

function renderTaskFilters() {
    try {
        const dateInput = document.getElementById('taskDateFilter');
        if (dateInput && !dateInput.value) {
            dateInput.value = getTodayStr();
        }

        const catSelect = document.getElementById('taskCategoryFilter');
        if (catSelect) {
            const currentVal = catSelect.value;
            catSelect.innerHTML = `<option value="all">${t('taskAllCategories')}</option>`;
            currentData.categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = cat.name;
                catSelect.appendChild(opt);
            });
            if (currentVal) catSelect.value = currentVal;
        }

        const modalCatSelect = document.getElementById('taskCategoryInput');
        if (modalCatSelect) {
            const currentVal = modalCatSelect.value;
            modalCatSelect.innerHTML = '';
            currentData.categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = cat.name;
                modalCatSelect.appendChild(opt);
            });
            if (currentVal && currentData.categories.some(c => c.id === currentVal)) {
                modalCatSelect.value = currentVal;
            }
        }
    } catch (err) {
        console.error("Render task filters error:", err);
    }
}

// ============================================================
//  مودال تسک
// ============================================================
function openAddTaskModal() {
    try {
        editingTaskId = null;
        document.getElementById('taskModalTitle').textContent = t('taskModalNew');
        document.getElementById('taskTitleInput').value = '';
        document.getElementById('taskDescInput').value = '';
        document.getElementById('taskDateInput').value = '';
        document.getElementById('taskRecurrenceInput').value = 'none';
        document.getElementById('weeklyDaysGroup').style.display = 'none';
        document.querySelectorAll('.weekly-day').forEach(cb => cb.checked = false);
        document.getElementById('taskSubtasksInput').value = '';
        const catSelect = document.getElementById('taskCategoryInput');
        if (catSelect.options.length > 0) catSelect.selectedIndex = 0;
        document.getElementById('taskPriorityInput').value = 'medium';
        document.getElementById('taskModal').classList.add('active');
    } catch (err) {
        console.error("Open add task modal error:", err);
    }
}

function openEditTaskModal(taskId) {
    try {
        const task = currentData.tasks.find(t => t.id === taskId);
        if (!task) return;
        editingTaskId = taskId;
        document.getElementById('taskModalTitle').textContent = t('taskModalEdit');
        document.getElementById('taskTitleInput').value = task.title || '';
        document.getElementById('taskDescInput').value = task.description || '';
        document.getElementById('taskDateInput').value = task.date || '';
        document.getElementById('taskCategoryInput').value = task.category || '';
        document.getElementById('taskPriorityInput').value = task.priority || 'medium';

        const rec = task.recurrence;
        if (rec && rec.type === 'daily') {
            document.getElementById('taskRecurrenceInput').value = 'daily';
            document.getElementById('weeklyDaysGroup').style.display = 'none';
        } else if (rec && rec.type === 'weekly') {
            document.getElementById('taskRecurrenceInput').value = 'weekly';
            document.getElementById('weeklyDaysGroup').style.display = 'flex';
            const days = rec.daysOfWeek || [];
            document.querySelectorAll('.weekly-day').forEach(cb => {
                cb.checked = days.includes(parseInt(cb.value));
            });
        } else {
            document.getElementById('taskRecurrenceInput').value = 'none';
            document.getElementById('weeklyDaysGroup').style.display = 'none';
            document.querySelectorAll('.weekly-day').forEach(cb => cb.checked = false);
        }

        if (task.subtasks && task.subtasks.length > 0) {
            document.getElementById('taskSubtasksInput').value = task.subtasks.map(s => s.title).join('\n');
        } else {
            document.getElementById('taskSubtasksInput').value = '';
        }

        document.getElementById('taskModal').classList.add('active');
    } catch (err) {
        console.error("Open edit task modal error:", err);
    }
}

function closeTaskModal() {
    document.getElementById('taskModal').classList.remove('active');
    editingTaskId = null;
}

function saveTaskFromModal() {
    try {
        const title = document.getElementById('taskTitleInput').value.trim();
        if (!title) { alert(t('enterTitle')); return; }

        const description = document.getElementById('taskDescInput').value.trim();
        const category = document.getElementById('taskCategoryInput').value;
        const priority = document.getElementById('taskPriorityInput').value;
        const date = document.getElementById('taskDateInput').value;
        const recurrenceType = document.getElementById('taskRecurrenceInput').value;

        let recurrence = null;
        if (recurrenceType === 'daily') {
            recurrence = { type: 'daily' };
        } else if (recurrenceType === 'weekly') {
            const days = [];
            document.querySelectorAll('.weekly-day:checked').forEach(cb => {
                days.push(parseInt(cb.value));
            });
            if (days.length === 0) {
                alert(t('selectWeeklyDay'));
                return;
            }
            recurrence = { type: 'weekly', daysOfWeek: days };
        }

        const subtasksText = document.getElementById('taskSubtasksInput').value;
        const subtasks = subtasksText.split('\n').filter(s => s.trim() !== '').map(s => ({
            id: generateId(),
            title: s.trim(),
            done: false
        }));

        if (editingTaskId) {
            const task = currentData.tasks.find(t => t.id === editingTaskId);
            if (task) {
                task.title = title;
                task.description = description;
                task.category = category;
                task.priority = priority;
                task.date = date || null;
                task.recurrence = recurrence;
                task.subtasks = subtasks;
            }
        } else {
            const newTask = {
                id: generateId(),
                title: title,
                description: description,
                category: category,
                priority: priority,
                status: 'pending',
                date: date || null,
                recurrence: recurrence,
                subtasks: subtasks,
                createdAt: new Date().toISOString(),
                completedDate: null
            };
            currentData.tasks.push(newTask);
        }

        saveData(() => {
            closeTaskModal();
            renderTasks();
            renderCharts();
        });
    } catch (err) {
        console.error("Save task error:", err);
    }
}

// ============================================================
//  مقداردهی اولیه
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    loadData(() => {
        // دکمه‌های زبان
        document.getElementById('langEn').addEventListener('click', () => {
            saveLanguage('en');
            document.getElementById('langEn').classList.add('active');
            document.getElementById('langFa').classList.remove('active');
            applyLanguage();
        });
        document.getElementById('langFa').addEventListener('click', () => {
            saveLanguage('fa');
            document.getElementById('langFa').classList.add('active');
            document.getElementById('langEn').classList.remove('active');
            applyLanguage();
        });

        if (currentLang === 'fa') {
            document.getElementById('langFa').classList.add('active');
            document.getElementById('langEn').classList.remove('active');
        } else {
            document.getElementById('langEn').classList.add('active');
            document.getElementById('langFa').classList.remove('active');
        }
        applyLanguage();

        updateHeaderStudyTime();
        updateMotivationDisplay();

        // تایمر
        updateTimerDisplay();
        document.getElementById('startBtn').addEventListener('click', toggleTimer);
        document.getElementById('resetBtn').addEventListener('click', resetTimer);

        document.querySelectorAll('.quick-times button').forEach(btn => {
            btn.addEventListener('click', function() {
                setTimerFromMinutes(parseInt(this.dataset.minutes));
            });
        });

        document.getElementById('setCustomCountdown').addEventListener('click', setCustomCountdown);
        document.getElementById('customMinutes').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') setCustomCountdown();
        });

        document.getElementById('modeStopwatch').addEventListener('click', () => switchTimerMode('stopwatch'));
        document.getElementById('modeCountdown').addEventListener('click', () => switchTimerMode('countdown'));

        document.getElementById('saveTimerSession').addEventListener('click', saveTimerSession);
        document.getElementById('logStudyBtn').addEventListener('click', logStudy);
        renderStudyLogs();
        renderAllStats();

        // پروژه‌ها
        document.getElementById('addProjectBtn').addEventListener('click', addProject);
        document.getElementById('addTopicBtn').addEventListener('click', addTopic);
        document.getElementById('projectInput').addEventListener('keypress', e => { if (e.key === 'Enter') addProject(); });
        document.getElementById('topicInput').addEventListener('keypress', e => { if (e.key === 'Enter') addTopic(); });
        renderProjects();

        // برنامه هفتگی
        document.getElementById('createPlanBtn').addEventListener('click', createWeeklyPlan);
        document.getElementById('deletePlanBtn').addEventListener('click', deleteCurrentPlan);
        renderWeeklyPlans();

        // یادداشت
        document.getElementById('saveNoteBtn').addEventListener('click', saveNote);
        renderNotes();

        // تقویم
        renderCalendar(calendarYear, calendarMonth);
        document.getElementById('calPrev').addEventListener('click', () => {
            if (calendarMonth === 0) { calendarMonth = 11; calendarYear--; } else { calendarMonth--; }
            renderCalendar(calendarYear, calendarMonth);
        });
        document.getElementById('calNext').addEventListener('click', () => {
            if (calendarMonth === 11) { calendarMonth = 0; calendarYear++; } else { calendarMonth++; }
            renderCalendar(calendarYear, calendarMonth);
        });

        document.getElementById('addEventBtn').addEventListener('click', addEvent);
        renderCountdowns();
        startCountdownUpdater();

        renderCharts();

        // پشتیبان
        document.getElementById('exportBackupBtn').addEventListener('click', exportBackup);
        document.getElementById('importBackupBtn').addEventListener('click', () => document.getElementById('importBackupInput').click());
        document.getElementById('importBackupInput').addEventListener('change', function(e) {
            if (this.files && this.files[0]) {
                importBackup(this.files[0]);
            }
            this.value = '';
        });

        // تب‌ها
        document.getElementById('tabsContainer').addEventListener('click', function(e) {
            const btn = e.target.closest('button');
            if (!btn) return;
            const tabId = btn.dataset.tab;
            if (tabId) switchTab(tabId);
        });

        // وظایف
        renderTaskFilters();
        renderTasks();

        document.getElementById('refreshTasksBtn').addEventListener('click', renderTasks);
        document.getElementById('taskDateFilter').addEventListener('change', renderTasks);
        document.getElementById('taskCategoryFilter').addEventListener('change', renderTasks);
        document.getElementById('taskFilterType').addEventListener('change', renderTasks);

        document.getElementById('openAddTaskModal').addEventListener('click', openAddTaskModal);
        document.getElementById('closeTaskModal').addEventListener('click', closeTaskModal);
        document.getElementById('saveTaskBtn').addEventListener('click', saveTaskFromModal);

        document.getElementById('taskModal').addEventListener('click', function(e) {
            if (e.target === this) closeTaskModal();
        });

        document.getElementById('taskRecurrenceInput').addEventListener('change', function() {
            const group = document.getElementById('weeklyDaysGroup');
            group.style.display = this.value === 'weekly' ? 'block' : 'none';
        });

        // تنظیمات - جمله انگیزشی
        document.getElementById('saveMotivationBtn').addEventListener('click', saveMotivation);

        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    });
});