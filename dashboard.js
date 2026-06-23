// ============================================================
//  ۱. داده‌ها و کلید ذخیره‌سازی
// ============================================================
const STORAGE_KEY = "examTrackerData";

let currentData = {
    subjects: {},
    studyLogs: [],
    weeklyPlans: {},
    currentPlan: null,
    notes: [],
    events: [],
    motivation: "به توانایی‌هایت ایمان داشته باش ✨"
};

// ============================================================
//  ۲. توابع ذخیره و بارگذاری
// ============================================================
function loadData(callback) {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (result[STORAGE_KEY]) {
            const saved = result[STORAGE_KEY];
            currentData.subjects = saved.subjects || {};
            currentData.studyLogs = saved.studyLogs || [];
            currentData.weeklyPlans = saved.weeklyPlans || {};
            currentData.currentPlan = saved.currentPlan || null;
            currentData.notes = saved.notes || [];
            currentData.events = saved.events || [];
            currentData.motivation = saved.motivation || "به توانایی‌هایت ایمان داشته باش ✨";
        }
        callback();
    });
}

function saveData(callback) {
    chrome.storage.local.set({ [STORAGE_KEY]: currentData }, callback);
}

// ============================================================
//  ۳. توابع تاریخ شمسی دقیق (الگوریتم جلالی)
// ============================================================
function gregorianToJalali(gy, gm, gd) {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
    let jy = -1595 + (33 * Math.floor(days / 12053));
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
        jy += Math.floor((days - 1) / 366);
        days = (days - 1) % 366;
    }
    let jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
    let jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return [jy, jm, jd];
}

function getPersianMonthNameByDate(date) {
    const [jy, jm] = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, 1);
    const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    return `${monthNames[jm - 1]} ${jy}`;
}

// ============================================================
//  ۴. توابع کمکی
// ============================================================
function pad(n) { return String(n).padStart(2, '0'); }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ============================================================
//  ۵. هدر - نمایش ساعت مطالعه امروز
// ============================================================
function updateHeaderStudyTime() {
    const todayStr = new Date().toISOString().split('T')[0];
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
        el.innerHTML = `${hours}H : ${pad(mins)}MIN <span>امروز</span>`;
    }
}

// ============================================================
//  ۶. تایمر
// ============================================================
let timerInterval = null;
let seconds = 0;
let isRunning = false;
let timerMode = 'stopwatch';
let countdownTarget = 0;

function updateTimerDisplay() {
    const h = pad(Math.floor(seconds / 3600));
    const m = pad(Math.floor((seconds % 3600) / 60));
    const s = pad(seconds % 60);
    const display = document.getElementById('timerDisplay');
    if (display) display.textContent = `${h}:${m}:${s}`;
}

function toggleTimer() {
    const startBtn = document.getElementById('startBtn');
    const statusBadge = document.getElementById('statusBadge');
    if (!startBtn || !statusBadge) return;

    if (isRunning) {
        clearInterval(timerInterval);
        isRunning = false;
        startBtn.textContent = '▶ شروع';
        startBtn.classList.remove('running');
        statusBadge.textContent = '⏸️ متوقف';
        return;
    }
    if (timerMode === 'countdown' && seconds <= 0 && countdownTarget > 0) {
        seconds = countdownTarget;
        updateTimerDisplay();
    }
    if (timerMode === 'countdown' && seconds <= 0) {
        alert('لطفاً ابتدا زمان مورد نظر را با دکمه‌های سریع یا ورودی دستی تنظیم کن.');
        return;
    }
    isRunning = true;
    startBtn.textContent = '⏹ توقف';
    startBtn.classList.add('running');
    statusBadge.textContent = '▶ در حال کار';
    timerInterval = setInterval(() => {
        if (timerMode === 'stopwatch') {
            seconds++;
        } else {
            if (seconds > 0) {
                seconds--;
            } else {
                clearInterval(timerInterval);
                isRunning = false;
                startBtn.textContent = '▶ شروع';
                startBtn.classList.remove('running');
                statusBadge.textContent = '⏰ زمان تمام شد!';
                if (Notification.permission === 'granted') {
                    new Notification('⏰ زمان تمرکز تمام شد!');
                }
            }
        }
        updateTimerDisplay();
    }, 1000);
}

function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    const startBtn = document.getElementById('startBtn');
    const statusBadge = document.getElementById('statusBadge');
    if (startBtn) {
        startBtn.textContent = '▶ شروع';
        startBtn.classList.remove('running');
    }
    if (statusBadge) statusBadge.textContent = '⏸️ متوقف';
    if (timerMode === 'stopwatch') {
        seconds = 0;
    } else {
        seconds = countdownTarget;
    }
    updateTimerDisplay();
}

function setTimerFromMinutes(minutes) {
    if (timerMode === 'countdown') {
        countdownTarget = minutes * 60;
        seconds = countdownTarget;
        updateTimerDisplay();
        const statusBadge = document.getElementById('statusBadge');
        if (statusBadge) statusBadge.textContent = `⏱ ${minutes} دقیقه (معکوس)`;
    } else {
        resetTimer();
        seconds = minutes * 60;
        updateTimerDisplay();
        const statusBadge = document.getElementById('statusBadge');
        if (statusBadge) statusBadge.textContent = `⏱ ${minutes} دقیقه`;
    }
}

function setCustomCountdown() {
    const input = document.getElementById('customMinutes');
    if (!input) return;
    const minutes = parseInt(input.value);
    if (!minutes || minutes <= 0) {
        alert('لطفاً یک عدد معتبر (دقیقه) وارد کن!');
        return;
    }
    if (timerMode !== 'countdown') {
        alert('لطفاً ابتدا حالت شمارش معکوس را انتخاب کن!');
        return;
    }
    setTimerFromMinutes(minutes);
    input.value = '';
}

function switchTimerMode(mode) {
    if (mode === timerMode) return;
    clearInterval(timerInterval);
    isRunning = false;
    timerMode = mode;
    const startBtn = document.getElementById('startBtn');
    const statusBadge = document.getElementById('statusBadge');
    if (startBtn) {
        startBtn.textContent = '▶ شروع';
        startBtn.classList.remove('running');
    }
    if (statusBadge) statusBadge.textContent = '⏸️ متوقف';
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
}

// ============================================================
//  ۷. ثبت جلسه از تایمر
// ============================================================
function saveTimerSession() {
    const sel = document.getElementById('timerSubjectSelect');
    if (!sel) return;
    const subject = sel.value;
    if (!subject) { alert('لطفاً یک درس را انتخاب کن!'); return; }
    let elapsedSeconds;
    if (timerMode === 'countdown') {
        elapsedSeconds = countdownTarget - seconds;
        if (elapsedSeconds < 0) elapsedSeconds = 0;
    } else {
        elapsedSeconds = seconds;
    }
    if (elapsedSeconds < 1) { alert('زمانی ثبت نشده!'); return; }

    const hours = elapsedSeconds / 3600;
    const log = {
        id: generateId(),
        date: new Date().toISOString(),
        hours: Math.round(hours * 100) / 100,
        subject: subject,
        desc: timerMode === 'countdown' ? 'جلسه تایمر (معکوس)' : 'جلسه تایمر'
    };
    currentData.studyLogs.push(log);
    saveData(() => {
        renderStudyStats();
        renderStudyLogs();
        renderAllStats();
        renderSubjectSelectors();
        renderCharts();
        updateHeaderStudyTime();
        alert('✅ جلسه با موفقیت ثبت شد!');
    });
}

// ============================================================
//  ۸. ثبت جلسات مطالعه دستی
// ============================================================
function logStudy() {
    const hoursInput = document.getElementById('studyHours');
    const subjectSel = document.getElementById('studySubjectSelect');
    if (!hoursInput || !subjectSel) return;
    const hours = parseFloat(hoursInput.value);
    const subject = subjectSel.value;
    if (!hours || hours <= 0) { alert('لطفاً ساعت معتبر وارد کن!'); return; }
    if (!subject) { alert('لطفاً درس را انتخاب کن!'); return; }

    const log = {
        id: generateId(),
        date: new Date().toISOString(),
        hours: hours,
        subject: subject,
        desc: 'ثبت دستی'
    };
    currentData.studyLogs.push(log);
    hoursInput.value = '';
    saveData(() => {
        renderStudyStats();
        renderStudyLogs();
        renderAllStats();
        renderSubjectSelectors();
        renderCharts();
        updateHeaderStudyTime();
    });
}

// ============================================================
//  ۹. آمار
// ============================================================
function renderAllStats() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
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

    const statDaily = document.getElementById('statDaily');
    const statWeekly = document.getElementById('statWeekly');
    const statMonthly = document.getElementById('statMonthly');
    const statYearly = document.getElementById('statYearly');
    if (statDaily) statDaily.textContent = daily.toFixed(1);
    if (statWeekly) statWeekly.textContent = weekly.toFixed(1);
    if (statMonthly) statMonthly.textContent = monthly.toFixed(1);
    if (statYearly) statYearly.textContent = yearly.toFixed(1);
}

function renderStudyStats() {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);

    let todayHours = 0, weekHours = 0, totalHours = 0;
    currentData.studyLogs.forEach(log => {
        const logDate = log.date.split('T')[0];
        totalHours += log.hours;
        if (logDate === today) todayHours += log.hours;
        if (new Date(log.date) >= weekStart) weekHours += log.hours;
    });

    const todayStudy = document.getElementById('todayStudy');
    const weekStudy = document.getElementById('weekStudy');
    const totalStudy = document.getElementById('totalStudy');
    if (todayStudy) todayStudy.textContent = `امروز: ${todayHours.toFixed(1)} ساعت`;
    if (weekStudy) weekStudy.textContent = `این هفته: ${weekHours.toFixed(1)} ساعت`;
    if (totalStudy) totalStudy.textContent = `کل: ${totalHours.toFixed(1)} ساعت`;
}

function renderStudyLogs() {
    const container = document.getElementById('studyLogList');
    if (!container) return;
    const logs = currentData.studyLogs.slice(-15).reverse();
    if (logs.length === 0) {
        container.innerHTML = '<div style="color:#64748b;">هنوز جلسه‌ای ثبت نشده</div>';
        return;
    }
    container.innerHTML = logs.map(log => `
        <div class="log-item">
            <span>📌 ${new Date(log.date).toLocaleDateString('fa-IR')} — <strong>${log.subject}</strong> — ${log.hours} ساعت</span>
            <div class="log-actions">
                <button class="del-log" data-id="${log.id}">🗑️</button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.del-log').forEach(btn => {
        btn.addEventListener('click', function() {
            if (confirm('آیا این جلسه حذف شود؟')) {
                const id = this.dataset.id;
                currentData.studyLogs = currentData.studyLogs.filter(l => l.id !== id);
                saveData(() => {
                    renderStudyStats();
                    renderStudyLogs();
                    renderAllStats();
                    renderCharts();
                    updateHeaderStudyTime();
                });
            }
        });
    });
}

// ============================================================
//  ۱۰. مدیریت دروس
// ============================================================
function renderSubjects() {
    const container = document.getElementById('subjectsList');
    if (!container) return;
    const subjects = currentData.subjects;
    const names = Object.keys(subjects);

    let totalTopics = 0, doneTopics = 0;

    if (names.length === 0) {
        container.innerHTML = `<div style="color:#64748b; text-align:center; padding:20px 0;">هنوز درسی اضافه نکردی</div>`;
        updateGlobalProgress(0, 0);
        renderSubjectSelectors();
        return;
    }

    let html = '';
    for (const name of names) {
        const topics = subjects[name].topics || [];
        const done = topics.filter(t => t.done).length;
        const total = topics.length;
        totalTopics += total;
        doneTopics += done;
        const percent = total === 0 ? 0 : Math.round((done / total) * 100);

        html += `
            <div class="subject-card">
                <div class="subject-title">
                    <span>📘 ${name}</span>
                    <span style="font-size:14px; color:#94a3b8;">${done}/${total}</span>
                </div>
                <div class="subject-stats">
                    <span>📊 ${percent}%</span>
                    <span>📌 ${total} مبحث</span>
                </div>
                <div class="progress-mini"><div class="fill" style="width:${percent}%; background: ${percent < 30 ? '#ef4444' : percent < 70 ? '#f59e0b' : '#22c55e'};"></div></div>
        `;

        if (topics.length === 0) {
            html += `<div style="color:#64748b; font-size:14px; padding:4px 0;">هیچ ریزمبحثی اضافه نشده</div>`;
        } else {
            for (let i = 0; i < topics.length; i++) {
                const t = topics[i];
                const checked = t.done ? 'checked' : '';
                const doneClass = t.done ? 'done-text' : '';
                html += `
                    <div class="topic-item">
                        <input type="checkbox" data-subject="${name}" data-index="${i}" ${checked}>
                        <span class="${doneClass}">${t.name}</span>
                        <button class="del-topic" data-subject="${name}" data-index="${i}">✕</button>
                    </div>
                `;
            }
        }
        html += `</div>`;
    }

    container.innerHTML = html;

    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', function() {
            const subject = this.dataset.subject;
            const index = parseInt(this.dataset.index);
            if (currentData.subjects[subject] && currentData.subjects[subject].topics[index]) {
                currentData.subjects[subject].topics[index].done = this.checked;
                saveData(() => {
                    renderSubjects();
                    renderSubjectSelectors();
                    renderCharts();
                });
            }
        });
    });

    container.querySelectorAll('.del-topic').forEach(btn => {
        btn.addEventListener('click', function() {
            const subject = this.dataset.subject;
            const index = parseInt(this.dataset.index);
            if (confirm('آیا این ریزمبحث حذف شود؟')) {
                currentData.subjects[subject].topics.splice(index, 1);
                saveData(() => {
                    renderSubjects();
                    renderSubjectSelectors();
                });
            }
        });
    });

    updateGlobalProgress(totalTopics, doneTopics);
    renderSubjectSelectors();
}

function updateGlobalProgress(total, done) {
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    const bigNumber = document.getElementById('globalProgressBig');
    const fill = document.getElementById('globalProgressFill');
    const detail = document.getElementById('globalProgressDetail');
    if (bigNumber) bigNumber.textContent = percent + '%';
    if (fill) fill.style.width = percent + '%';
    if (detail) detail.textContent = `${done} از ${total} مبحث`;
}

function renderSubjectSelectors() {
    const names = Object.keys(currentData.subjects);
    const selects = ['subjectSelector', 'timerSubjectSelect', 'studySubjectSelect'];
    selects.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const currentVal = sel.value;
        sel.innerHTML = '<option value="">انتخاب درس</option>';
        names.forEach(n => {
            const opt = document.createElement('option');
            opt.value = n;
            opt.textContent = n;
            sel.appendChild(opt);
        });
        if (names.includes(currentVal)) sel.value = currentVal;
    });
}

function addSubject() {
    const input = document.getElementById('subjectInput');
    if (!input) return;
    const name = input.value.trim();
    if (!name) { alert('نام درس را وارد کن!'); return; }
    if (currentData.subjects[name]) { alert('این درس قبلاً اضافه شده!'); return; }
    currentData.subjects[name] = { topics: [] };
    input.value = '';
    saveData(() => {
        renderSubjects();
        renderSubjectSelectors();
    });
}

function addTopic() {
    const sel = document.getElementById('subjectSelector');
    const input = document.getElementById('topicInput');
    if (!sel || !input) return;
    const subject = sel.value;
    const name = input.value.trim();
    if (!subject) { alert('ابتدا یک درس را انتخاب کن!'); return; }
    if (!name) { alert('نام ریزمبحث را وارد کن!'); return; }
    currentData.subjects[subject].topics.push({ name, done: false });
    input.value = '';
    saveData(() => {
        renderSubjects();
        renderSubjectSelectors();
    });
}

// ============================================================
//  ۱۱. برنامه هفتگی
// ============================================================
function renderWeeklyPlans() {
    const container = document.getElementById('weeklyPlanList');
    if (!container) return;
    const planNames = Object.keys(currentData.weeklyPlans);
    if (planNames.length === 0) {
        container.innerHTML = '<span style="color:#64748b; font-size:14px;">برنامه‌ای وجود ندارد.</span>';
        const grid = document.getElementById('weeklyGrid');
        if (grid) grid.innerHTML = '';
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
                renderCharts();
            });
        }
    }
    renderWeeklyGrid();
}

function renderWeeklyGrid() {
    const grid = document.getElementById('weeklyGrid');
    if (!grid) return;
    const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
    if (!currentData.currentPlan || !currentData.weeklyPlans[currentData.currentPlan]) {
        grid.innerHTML = '<div style="color:#64748b; text-align:center; padding:20px;">برنامه‌ای انتخاب نشده یا ساخته نشده است.</div>';
        return;
    }
    const plan = currentData.weeklyPlans[currentData.currentPlan];
    const goal = plan.goalHours || 0;
    let html = `
        <div style="grid-column: 1 / -1; background: #0f172a; border-radius: 16px; padding: 12px; text-align: center; margin-bottom: 6px; border: 1px solid #334155;">
            🎯 هدف هفتگی: <span style="color: #facc15; font-weight: 700;">${goal} ساعت</span>
        </div>
    `;
    html += days.map(day => `
        <div class="day">
            <div class="day-name">${day}</div>
            <textarea data-day="${day}" placeholder="برنامهٔ این روز...">${plan.days[day] || ''}</textarea>
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
}

function createWeeklyPlan() {
    const nameInput = document.getElementById('newPlanName');
    const goalInput = document.getElementById('planHourGoal');
    if (!nameInput || !goalInput) return;
    const name = nameInput.value.trim();
    const goal = parseFloat(goalInput.value) || 0;
    if (!name) { alert('لطفاً نامی برای برنامه انتخاب کن!'); return; }
    if (currentData.weeklyPlans[name]) { alert('برنامه‌ای با این نام قبلاً وجود دارد!'); return; }
    const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
    const emptyPlan = {};
    days.forEach(d => emptyPlan[d] = '');
    currentData.weeklyPlans[name] = { days: emptyPlan, goalHours: goal };
    currentData.currentPlan = name;
    nameInput.value = '';
    goalInput.value = '';
    saveData(() => {
        renderWeeklyPlans();
        renderWeeklyGrid();
        renderCharts();
    });
}

function deleteCurrentPlan() {
    if (!currentData.currentPlan) { alert('برنامه‌ای برای حذف وجود ندارد!'); return; }
    if (!confirm(`آیا برنامه "${currentData.currentPlan}" حذف شود؟`)) return;
    delete currentData.weeklyPlans[currentData.currentPlan];
    const planNames = Object.keys(currentData.weeklyPlans);
    currentData.currentPlan = planNames.length > 0 ? planNames[0] : null;
    saveData(() => {
        renderWeeklyPlans();
        renderWeeklyGrid();
        renderCharts();
    });
}

// ============================================================
//  ۱۲. یادداشت‌ها
// ============================================================
function renderNotes() {
    const container = document.getElementById('noteList');
    if (!container) return;
    if (currentData.notes.length === 0) {
        container.innerHTML = '<span style="color:#64748b; font-size:14px;">هیچ یادداشتی ذخیره نشده.</span>';
        return;
    }
    container.innerHTML = currentData.notes.map(n => `
        <div class="note-item" data-id="${n.id}">
            <div class="note-title">${n.title}</div>
            <span class="note-date">${new Date(n.date).toLocaleDateString('fa-IR')}</span>
            <div class="note-actions">
                <button class="edit-note" data-id="${n.id}">✏️ ویرایش</button>
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
                const titleInput = document.getElementById('noteTitle');
                const contentInput = document.getElementById('noteContent');
                if (titleInput) titleInput.value = note.title;
                if (contentInput) contentInput.value = note.content;
                currentData.notes = currentData.notes.filter(n => n.id !== id);
                saveData(() => renderNotes());
            }
        });
    });

    container.querySelectorAll('.del-note').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (confirm('آیا این یادداشت حذف شود؟')) {
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
}

function saveNote() {
    const titleInput = document.getElementById('noteTitle');
    const contentInput = document.getElementById('noteContent');
    if (!titleInput || !contentInput) return;
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    if (!title) { alert('عنوان یادداشت را وارد کن!'); return; }
    if (!content) { alert('متن یادداشت را وارد کن!'); return; }
    currentData.notes.push({
        id: generateId(),
        title: title,
        content: content,
        date: new Date().toISOString()
    });
    titleInput.value = '';
    contentInput.value = '';
    saveData(() => renderNotes());
}

// ============================================================
//  ۱۳. جمله انگیزشی
// ============================================================
function renderMotivation() {
    const display = document.getElementById('motivationDisplay');
    if (display) display.textContent = currentData.motivation;
}

function editMotivation() {
    const newText = prompt('جمله انگیزشی جدید را وارد کن:', currentData.motivation);
    if (newText !== null && newText.trim() !== '') {
        currentData.motivation = newText.trim();
        saveData(() => renderMotivation());
    }
}

// ============================================================
//  ۱۴. تقویم شمسی (با اعداد شمسی)
// ============================================================
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth();

function renderCalendar(year, month) {
    const grid = document.getElementById('calendarGrid');
    const label = document.getElementById('calMonthLabel');
    if (!grid || !label) return;

    // گرفتن اطلاعات ماه شمسی
    const [jy, jm] = gregorianToJalali(year, month + 1, 1);
    const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    label.textContent = `${monthNames[jm - 1]} ${jy}`;

    // تعداد روزهای ماه شمسی
    let daysInMonth;
    if (jm <= 6) {
        daysInMonth = 31;
    } else if (jm <= 11) {
        daysInMonth = 30;
    } else {
        // اسفند: بررسی کبیسه
        const isLeap = (jy % 33 === 1 || jy % 33 === 5 || jy % 33 === 9 || jy % 33 === 13 || 
                        jy % 33 === 17 || jy % 33 === 22 || jy % 33 === 26 || jy % 33 === 30);
        daysInMonth = isLeap ? 30 : 29;
    }

    // اولین روز ماه شمسی (میلادی معادل)
    const firstDayDate = new Date(year, month, 1);
    // روز هفته برای اولین روز شمسی (0=شنبه)
    const firstDayOfWeek = firstDayDate.getDay();

    // امروز شمسی
    const today = new Date();
    const [todayJy, todayJm, todayJd] = gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());

    const weekdays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
    let html = weekdays.map(w => `<div class="weekday">${w}</div>`).join('');

    // سلول‌های خالی ابتدا
    for (let i = 0; i < firstDayOfWeek; i++) {
        html += `<div class="day-cell empty"></div>`;
    }

    // رویدادهای این ماه شمسی
    const eventsThisMonth = currentData.events.filter(e => {
        const d = new Date(e.dateTime);
        const [ey, em] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, 1);
        return ey === jy && em === jm;
    });
    const eventDays = new Set(eventsThisMonth.map(e => {
        const d = new Date(e.dateTime);
        const [_, __, ed] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
        return ed;
    }));

    for (let d = 1; d <= daysInMonth; d++) {
        const isToday = (d === todayJd && jm === todayJm && jy === todayJy);
        const hasEvent = eventDays.has(d);
        html += `<div class="day-cell ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}">${d}</div>`;
    }

    grid.innerHTML = html;
}

// ============================================================
//  ۱۵. روزشمار
// ============================================================
function renderCountdowns() {
    const container = document.getElementById('countdownList');
    if (!container) return;
    if (currentData.events.length === 0) {
        container.innerHTML = '<div style="color:#64748b;">هیچ رویدادی ثبت نشده.</div>';
        return;
    }

    const now = new Date();
    const sorted = [...currentData.events].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

    container.innerHTML = sorted.map(e => {
        const target = new Date(e.dateTime);
        const diffMs = target - now;
        let remaining = '';
        if (diffMs <= 0) {
            remaining = '⏰ زمان گذشته';
        } else {
            const totalSec = Math.floor(diffMs / 1000);
            const days = Math.floor(totalSec / 86400);
            const hours = Math.floor((totalSec % 86400) / 3600);
            const mins = Math.floor((totalSec % 3600) / 60);
            const secs = totalSec % 60;
            remaining = `${days} روز ${hours} ساعت ${mins} دقیقه ${secs} ثانیه`;
        }
        return `
            <div class="countdown-item">
                <div class="cd-info">
                    <span class="cd-title">${e.title}</span>
                    <span class="cd-date">${new Date(e.dateTime).toLocaleDateString('fa-IR')} ${new Date(e.dateTime).toLocaleTimeString('fa-IR')}</span>
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
            if (confirm('آیا این رویداد حذف شود؟')) {
                const id = this.dataset.id;
                currentData.events = currentData.events.filter(e => e.id !== id);
                saveData(() => {
                    renderCountdowns();
                    renderCalendar(calendarYear, calendarMonth);
                });
            }
        });
    });
}

function addEvent() {
    const titleInput = document.getElementById('eventTitle');
    const dateInput = document.getElementById('eventDateTime');
    if (!titleInput || !dateInput) return;
    const title = titleInput.value.trim();
    const dateTime = dateInput.value;
    if (!title) { alert('عنوان رویداد را وارد کن!'); return; }
    if (!dateTime) { alert('تاریخ و زمان رویداد را انتخاب کن!'); return; }
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
}

let countdownInterval = null;
function startCountdownUpdater() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        renderCountdowns();
    }, 1000);
}

// ============================================================
//  ۱۶. نمودارهای پیشرفت
// ============================================================
function renderCharts() {
    renderGoalChart();
    renderTrendChart();
}

function renderGoalChart() {
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
}

function renderTrendChart() {
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
        const dayName = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'][d.getDay()];
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
}

// ============================================================
//  ۱۷. پشتیبان‌گیری و بازیابی
// ============================================================
function exportBackup() {
    const data = JSON.stringify(currentData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    a.download = `backup-${jy}-${pad(jm)}-${pad(jd)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importBackup(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            // بررسی وجود کلیدهای اصلی
            const requiredKeys = ['subjects', 'studyLogs', 'weeklyPlans', 'notes', 'events', 'motivation'];
            const hasAll = requiredKeys.every(key => key in imported);
            if (!hasAll) {
                alert('فایل پشتیبان معتبر نیست!');
                return;
            }
            if (!confirm('⚠️ تمام داده‌های فعلی شما بازنویسی می‌شوند. ادامه می‌دهید؟')) return;
            currentData = imported;
            saveData(() => {
                // به‌روزرسانی کامل همه بخش‌ها
                renderSubjects();
                renderStudyStats();
                renderStudyLogs();
                renderAllStats();
                renderWeeklyPlans();
                renderNotes();
                renderCountdowns();
                renderCalendar(calendarYear, calendarMonth);
                renderCharts();
                updateHeaderStudyTime();
                renderMotivation();
                renderSubjectSelectors();
                alert('✅ پشتیبان با موفقیت بازیابی شد!');
            });
        } catch (err) {
            alert('خطا در خواندن فایل: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// ============================================================
//  ۱۸. مدیریت تب‌ها
// ============================================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelectorAll('.tabs button').forEach(btn => {
        btn.classList.remove('active');
    });

    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
    } else {
        console.error('تب مورد نظر پیدا نشد:', tabId);
        return;
    }

    const targetBtn = document.querySelector(`.tabs button[data-tab="${tabId}"]`);
    if (targetBtn) {
        targetBtn.classList.add('active');
    }

    if (tabId === 'tab-timer') {
        renderStudyStats();
        renderStudyLogs();
        renderAllStats();
        updateHeaderStudyTime();
    }
    if (tabId === 'tab-calendar') {
        renderCountdowns();
        renderCalendar(calendarYear, calendarMonth);
    }
    if (tabId === 'tab-subjects') {
        renderCharts();
    }
}

// ============================================================
//  ۱۹. مقداردهی اولیه
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    loadData(() => {
        // هدر
        updateHeaderStudyTime();

        // جمله انگیزشی
        renderMotivation();
        const editBtn = document.getElementById('editMotivationBtn');
        if (editBtn) editBtn.addEventListener('click', editMotivation);

        // تایمر
        updateTimerDisplay();
        const startBtn = document.getElementById('startBtn');
        const resetBtn = document.getElementById('resetBtn');
        if (startBtn) startBtn.addEventListener('click', toggleTimer);
        if (resetBtn) resetBtn.addEventListener('click', resetTimer);

        document.querySelectorAll('.quick-times button').forEach(btn => {
            btn.addEventListener('click', function() {
                setTimerFromMinutes(parseInt(this.dataset.minutes));
            });
        });

        const customBtn = document.getElementById('setCustomCountdown');
        if (customBtn) customBtn.addEventListener('click', setCustomCountdown);
        const customInput = document.getElementById('customMinutes');
        if (customInput) {
            customInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') setCustomCountdown();
            });
        }

        const modeStopwatch = document.getElementById('modeStopwatch');
        const modeCountdown = document.getElementById('modeCountdown');
        if (modeStopwatch) modeStopwatch.addEventListener('click', () => switchTimerMode('stopwatch'));
        if (modeCountdown) modeCountdown.addEventListener('click', () => switchTimerMode('countdown'));

        const saveTimerBtn = document.getElementById('saveTimerSession');
        if (saveTimerBtn) saveTimerBtn.addEventListener('click', saveTimerSession);

        // ثبت جلسات
        const logBtn = document.getElementById('logStudyBtn');
        if (logBtn) logBtn.addEventListener('click', logStudy);
        renderStudyStats();
        renderStudyLogs();
        renderAllStats();

        // دروس
        const addSubBtn = document.getElementById('addSubjectBtn');
        const addTopBtn = document.getElementById('addTopicBtn');
        const subInput = document.getElementById('subjectInput');
        const topInput = document.getElementById('topicInput');
        if (addSubBtn) addSubBtn.addEventListener('click', addSubject);
        if (addTopBtn) addTopBtn.addEventListener('click', addTopic);
        if (subInput) {
            subInput.addEventListener('keypress', e => { if (e.key === 'Enter') addSubject(); });
        }
        if (topInput) {
            topInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTopic(); });
        }
        renderSubjects();

        // برنامه هفتگی
        const createPlanBtn = document.getElementById('createPlanBtn');
        const deletePlanBtn = document.getElementById('deletePlanBtn');
        if (createPlanBtn) createPlanBtn.addEventListener('click', createWeeklyPlan);
        if (deletePlanBtn) deletePlanBtn.addEventListener('click', deleteCurrentPlan);
        renderWeeklyPlans();

        // یادداشت
        const saveNoteBtn = document.getElementById('saveNoteBtn');
        if (saveNoteBtn) saveNoteBtn.addEventListener('click', saveNote);
        renderNotes();

        // تقویم
        renderCalendar(calendarYear, calendarMonth);
        const calPrev = document.getElementById('calPrev');
        const calNext = document.getElementById('calNext');
        if (calPrev) {
            calPrev.addEventListener('click', () => {
                if (calendarMonth === 0) { calendarMonth = 11; calendarYear--; } else { calendarMonth--; }
                renderCalendar(calendarYear, calendarMonth);
            });
        }
        if (calNext) {
            calNext.addEventListener('click', () => {
                if (calendarMonth === 11) { calendarMonth = 0; calendarYear++; } else { calendarMonth++; }
                renderCalendar(calendarYear, calendarMonth);
            });
        }

        const addEventBtn = document.getElementById('addEventBtn');
        if (addEventBtn) addEventBtn.addEventListener('click', addEvent);
        renderCountdowns();
        startCountdownUpdater();

        // نمودارها
        renderCharts();

        // پشتیبان‌گیری
        const exportBtn = document.getElementById('exportBackupBtn');
        const importBtn = document.getElementById('importBackupBtn');
        const importInput = document.getElementById('importBackupInput');
        if (exportBtn) exportBtn.addEventListener('click', exportBackup);
        if (importBtn && importInput) {
            importBtn.addEventListener('click', () => importInput.click());
            importInput.addEventListener('change', function(e) {
                if (this.files && this.files[0]) {
                    importBackup(this.files[0]);
                }
                this.value = '';
            });
        }

        // مدیریت تب‌ها
        const tabsContainer = document.getElementById('tabsContainer');
        if (tabsContainer) {
            tabsContainer.addEventListener('click', function(e) {
                const btn = e.target.closest('button');
                if (!btn) return;
                const tabId = btn.dataset.tab;
                if (tabId) {
                    switchTab(tabId);
                }
            });
        }

        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    });
});