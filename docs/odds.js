import { API_URL, CANDIDATES_SLUG, SCHEDULE_SLUG, getCandidates, getElectionSchedule } from './polymarket.mjs';

const REFRESH_MS = 60_000;
const names = new Map(Object.entries({
    "Benjamin Netanyahu": "בנימין נתניהו",
    "Bibi Netanyahu": "בנימין נתניהו",
    "Naftali Bennett": "נפתלי בנט",
    "Yair Lapid": "יאיר לפיד",
    "Benny Gantz": "בני גנץ",
    "Gadi Eisenkot": "גדי איזנקוט",
    "Gadi Eizenkot": "גדי איזנקוט",
    "Avigdor Lieberman": "אביגדור ליברמן",
    "Avigdor Liberman": "אביגדור ליברמן",
    "Yair Golan": "יאיר גולן",
    "Yossi Cohen": "יוסי כהן",
    "Nir Barkat": "ניר ברקת",
    "Itamar Ben-Gvir": "איתמר בן גביר",
    "Itamar Ben Gvir": "איתמר בן גביר",
    "Bezalel Smotrich": "בצלאל סמוטריץ׳",
    "Gideon Sa'ar": "גדעון סער",
    "Gideon Saar": "גדעון סער",
    "Yariv Levin": "יריב לוין",
}));

const panel = document.querySelector('#odds-panel');
const list = document.querySelector('#candidates');
const loadingIndicator = document.querySelector('#loading');
const schedulePanel = document.querySelector('#schedule-panel');
const scheduleOutcomes = document.querySelector('#schedule-outcomes');
const scheduleYes = document.querySelector('#schedule-yes');
const scheduleNo = document.querySelector('#schedule-no');
const scheduleLoading = document.querySelector('#schedule-loading');
const updates = document.querySelector('#updates');
const refresh = document.querySelector('#refresh');
const refreshLabel = document.querySelector('#refresh-label');
const initialStatus = document.querySelector('#initial-status');
const lastUpdated = document.querySelector('#last-updated');
const countdownLabel = document.querySelector('#countdown-label');
const countdown = document.querySelector('#countdown');
const updateError = document.querySelector('#update-error');
const percent = new Intl.NumberFormat('he-IL', { style: 'percent', maximumFractionDigits: 4 });
const timeFormat = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
const dateFormat = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
let loading = false;
let timer;
let lastFetchedAt;
let nextRefreshAt;

function updateTimestamp() {
    if (!lastFetchedAt) return;
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const day = lastFetchedAt.toDateString() === now.toDateString() ? 'היום'
        : lastFetchedAt.toDateString() === yesterday.toDateString() ? 'אתמול'
        : `ב־${dateFormat.format(lastFetchedAt)}`;
    const text = `עודכן ${day} ב־${timeFormat.format(lastFetchedAt)}`;
    if (lastUpdated.textContent !== text) lastUpdated.textContent = text;
}

function updateCountdown() {
    updateTimestamp();
    if (loading || !nextRefreshAt) return;
    const seconds = Math.max(0, Math.ceil((nextRefreshAt - Date.now()) / 1000));
    countdown.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function render(candidates) {
    const rows = document.createDocumentFragment();
    candidates.forEach(candidate => {
        const row = document.createElement('li');
        row.className = 'candidate';

        const portrait = document.createElement('span');
        portrait.className = 'portrait';
        portrait.setAttribute('aria-hidden', 'true');
        if (candidate.image) {
            const image = document.createElement('img');
            image.src = candidate.image;
            image.alt = '';
            image.width = 72;
            image.height = 72;
            image.loading = 'lazy';
            image.decoding = 'async';
            image.addEventListener('error', () => image.remove(), { once: true });
            portrait.append(image);
        }

        const name = document.createElement('bdi');
        name.className = 'candidate-name';
        name.textContent = names.get(candidate.name) || candidate.name;

        const probability = document.createElement('span');
        probability.className = 'probability';
        probability.textContent = percent.format(candidate.probability);

        row.append(portrait, name, probability);
        rows.append(row);
    });
    list.replaceChildren(rows);
}

async function loadOdds() {
    if (loading) return;
    loading = true;
    clearTimeout(timer);
    nextRefreshAt = null;
    updates.dataset.state = 'loading';
    refresh.disabled = true;
    refreshLabel.textContent = 'מעדכנים…';
    countdownLabel.textContent = 'מעדכנים נתונים…';
    countdown.hidden = true;
    updateError.hidden = true;
    if (!lastFetchedAt) initialStatus.textContent = 'טוענים את הנתונים…';
    loadingIndicator.hidden = list.childElementCount > 0;
    scheduleLoading.hidden = !scheduleOutcomes.hidden;
    panel.setAttribute('aria-busy', 'true');
    schedulePanel.setAttribute('aria-busy', 'true');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
        const response = await fetch(API_URL, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const events = await response.json();
        if (!Array.isArray(events)) throw new Error('Expected an array of events');
        const candidateEvent = events.find(event => event?.slug === CANDIDATES_SLUG);
        const scheduleEvent = events.find(event => event?.slug === SCHEDULE_SLUG);
        const candidates = getCandidates(candidateEvent);
        const schedule = getElectionSchedule(scheduleEvent);
        render(candidates);
        scheduleYes.textContent = percent.format(schedule.yes);
        scheduleNo.textContent = percent.format(schedule.no);
        scheduleOutcomes.hidden = false;
        lastFetchedAt = new Date();
        lastUpdated.dateTime = lastFetchedAt.toISOString();
        lastUpdated.title = `${dateFormat.format(lastFetchedAt)}, ${timeFormat.format(lastFetchedAt)}`;
        updateTimestamp();
        initialStatus.hidden = true;
        lastUpdated.hidden = false;
        updates.dataset.state = 'success';
    } catch {
        controller.abort();
        updates.dataset.state = 'error';
        if (!lastFetchedAt) initialStatus.textContent = 'עדיין אין עדכון';
        updateError.textContent = lastFetchedAt
            ? 'העדכון לא הצליח. בינתיים מוצגים הנתונים הקודמים.'
            : 'לא הצלחנו לטעון את הנתונים. אפשר לנסות שוב.';
        updateError.hidden = false;
    } finally {
        clearTimeout(timeout);
        loading = false;
        loadingIndicator.hidden = true;
        scheduleLoading.hidden = true;
        panel.setAttribute('aria-busy', 'false');
        schedulePanel.setAttribute('aria-busy', 'false');
        refresh.disabled = false;
        refreshLabel.textContent = 'עדכון עכשיו';
        countdownLabel.textContent = 'העדכון הבא בעוד';
        nextRefreshAt = Date.now() + REFRESH_MS;
        countdown.hidden = false;
        updateCountdown();
        timer = setTimeout(loadOdds, REFRESH_MS);
    }
}

refresh.addEventListener('click', loadOdds);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loadOdds();
});
setInterval(updateCountdown, 1000);
loadOdds();
