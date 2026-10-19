import { API_URL, ROLE_MARKETS, PARTY_MARKETS, DEFAULT_PARTY_SLUG, getRoleCandidates, getElectionOutcomes, getGovernmentOutcomes, getPartyDistributions } from './polymarket.mjs';

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
    "Gideon Sa’ar": "גדעון סער",
    "Yariv Levin": "יריב לוין",
    "Israel Katz": "ישראל כ״ץ",
    "Ofer Winter": "עופר וינטר",
    "Eli Cohen": "אלי כהן",
    "Matan Kahana": "מתן כהנא",
    "Elazar Stern": "אלעזר שטרן",
    "Moshe Feiglin": "משה פייגלין",
    "Yoram Cohen": "יורם כהן",
    "Amir Ohana": "אמיר אוחנה",
    "Shaul Meridor": "שאול מרידור",
    "Yaron Zelekha": "ירון זליכה",
    "Orit Farkash-Hacohen": "אורית פרקש הכהן",
    "Hili Tropper": "חילי טרופר",
    "Hili Tropper (Yechiel Tropper)": "חילי טרופר",
    "Ron Dermer": "רון דרמר",
    "Ayelet Shaked": "איילת שקד",
    "Simcha Rothman": "שמחה רוטמן",
    "Ofir Katz": "אופיר כץ",
    "Gilad Kariv": "גלעד קריב",
    "Oded Forer": "עודד פורר",
    "Tally Gotliv": "טלי גוטליב",
    "Avi Dichter": "אבי דיכטר",
    "Yoav Segalovich": "יואב סגלוביץ׳",
    "Meirav Ben-Ari": "מירב בן ארי",
    "Ram Ben-Barak": "רם בן ברק",
    "Talya Lankri": "טליה לנקרי",
    "Aryeh Deri": "אריה דרעי",
    "Moshe Arbel": "משה ארבל",
    "Miri Regev": "מירי רגב",
    "Keren Terner Eyal": "קרן טרנר אייל",
    "Meirav Cohen": "מירב כהן",
    "Michael Malchieli": "מיכאל מלכיאלי",
    "Yoav Ben-Tzur": "יואב בן צור",
}));

const panel = document.querySelector('#odds-panel');
const list = document.querySelector('#candidates');
const loadingIndicator = document.querySelector('#loading');
const roleSelect = document.querySelector('#role-select');
const roleSelectValue = document.querySelector('#role-select-value');
const roleSource = document.querySelector('#role-source');
const roleStatus = document.querySelector('#role-status');
const emptyState = document.querySelector('#empty-state');
const partyPanel = document.querySelector('#party-panel');
const partySelect = document.querySelector('#party-select');
const partySelectValue = document.querySelector('#party-select-value');
const partyResults = document.querySelector('#party-results');
const partySource = document.querySelector('#party-source');
const partyLoading = document.querySelector('#party-loading');
const seatBars = document.querySelector('#seat-bars');
const seatDetail = document.querySelector('#seat-detail');
const electionPanel = document.querySelector('#election-panel');
const electionOutcomes = document.querySelector('#election-outcomes');
const electionValues = {
    onSchedule: document.querySelector('#election-on-schedule'),
};
const electionLoading = document.querySelector('#election-loading');
const governmentPanel = document.querySelector('#government-panel');
const governmentOutcomes = document.querySelector('#government-outcomes');
const governmentValues = {
    novemberDecember2026: document.querySelector('#government-november-december-2026'),
    januaryFebruary2027: document.querySelector('#government-january-february-2027'),
    marchJune2027: document.querySelector('#government-march-june-2027'),
    anotherElection: document.querySelector('#government-another-election'),
};
const governmentLoading = document.querySelector('#government-loading');
const updates = document.querySelector('#updates');
const refresh = document.querySelector('#refresh');
const refreshLabel = document.querySelector('#refresh-label');
const initialStatus = document.querySelector('#initial-status');
const lastUpdated = document.querySelector('#last-updated');
const countdownLabel = document.querySelector('#countdown-label');
const countdown = document.querySelector('#countdown');
const updateError = document.querySelector('#update-error');
const percent = new Intl.NumberFormat('he-IL', { style: 'percent', maximumFractionDigits: 4 });
const chartPercent = new Intl.NumberFormat('he-IL', { style: 'percent', maximumFractionDigits: 1 });
const timeFormat = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
const dateFormat = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
let loading = false;
let timer;
let lastFetchedAt;
let nextRefreshAt;
let selectedRole = ROLE_MARKETS[0];
let roleCandidates = new Map();
let selectedParty = PARTY_MARKETS.find(party => party.slug === DEFAULT_PARTY_SLUG);
let partyDistributions = new Map();
let selectedSeatRange;

roleSelect.replaceChildren(...ROLE_MARKETS.map(role => {
    const option = document.createElement('option');
    option.value = role.slug;
    option.textContent = role.label;
    return option;
}));
roleSelect.value = selectedRole.slug;
partySelect.replaceChildren(...PARTY_MARKETS.map(party => {
    const option = document.createElement('option');
    option.value = party.slug;
    option.textContent = party.label;
    return option;
}));
partySelect.value = selectedParty.slug;

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

function renderSelectedRole() {
    const candidates = roleCandidates.get(selectedRole.slug);
    if (!candidates) return;
    roleSelectValue.textContent = selectedRole.label;
    const deadlineStart = selectedRole.label.indexOf(' (');
    if (deadlineStart >= 0) {
        const deadline = document.createElement('span');
        deadline.className = 'role-select-deadline';
        deadline.textContent = selectedRole.label.slice(deadlineStart + 1);
        roleSelectValue.replaceChildren(selectedRole.label.slice(0, deadlineStart), ' ', deadline);
    }
    roleSource.href = `https://polymarket.com/event/${selectedRole.slug}`;
    const sourceLabel = `שוק ${selectedRole.label} בפולימרקט`;
    roleSource.setAttribute('aria-label', sourceLabel);
    roleSource.title = sourceLabel;
    render(candidates);
    emptyState.hidden = candidates.length > 0;
    loadingIndicator.hidden = true;
    roleStatus.textContent = `מוצגות ${candidates.length} תוצאות עבור ${selectedRole.label}`;
}

function partyRangeDescription(bin) {
    if (bin.label.startsWith('<')) return `פחות מ־${bin.max + 1} מנדטים`;
    if (bin.label.endsWith('+')) return `${bin.min} מנדטים ומעלה`;
    if (bin.min === bin.max) return `${bin.min} מנדטים`;
    return `${bin.min} עד ${bin.max} מנדטים`;
}

function selectSeatBin(index) {
    const bins = partyDistributions.get(selectedParty.slug);
    const bin = bins[index];
    selectedSeatRange = bin.label;
    [...seatBars.children].forEach((button, buttonIndex) => {
        button.setAttribute('aria-pressed', String(buttonIndex === index));
    });
    const value = document.createElement('bdi');
    value.dir = 'ltr';
    value.textContent = percent.format(bin.probability);
    seatDetail.replaceChildren(`${partyRangeDescription(bin)} · `, value,
        selectedParty.estimateSeatsFromVoteShare ? ' סיכוי (אומדן)' : ' סיכוי');
}

function renderSelectedParty() {
    const bins = partyDistributions.get(selectedParty.slug);
    if (!bins) return;
    partySelectValue.textContent = selectedParty.label;
    partyResults.setAttribute('aria-label', `התפלגות המנדטים של ${selectedParty.label}`);
    partySource.href = `https://polymarket.com/event/${selectedParty.slug}`;
    const measure = selectedParty.estimateSeatsFromVoteShare ? 'אחוז הקולות' : 'המנדטים';
    const sourceLabel = `שוק ${measure} של ${selectedParty.label} בפולימרקט`;
    partySource.setAttribute('aria-label', sourceLabel);
    partySource.title = sourceLabel;
    const bars = document.createDocumentFragment();
    bins.forEach((bin, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'seat-bin';
        button.style.setProperty('--probability', String(bin.probability));
        const label = `${partyRangeDescription(bin)}: ${percent.format(bin.probability)}`;
        button.setAttribute('aria-label', label);
        button.title = label;
        const track = document.createElement('span');
        track.className = 'seat-bar-track';
        track.setAttribute('aria-hidden', 'true');
        const probability = document.createElement('span');
        probability.className = 'seat-bar-value';
        probability.textContent = chartPercent.format(bin.probability);
        const bar = document.createElement('span');
        bar.className = 'seat-bar';
        track.append(probability, bar);
        const range = document.createElement('bdi');
        range.className = 'seat-range';
        range.textContent = bin.label;
        range.setAttribute('aria-hidden', 'true');
        button.append(track, range);
        button.addEventListener('click', () => selectSeatBin(index));
        bars.append(button);
    });
    seatBars.style.gridTemplateColumns = `repeat(${bins.length}, minmax(0, 1fr))`;
    seatBars.replaceChildren(bars);
    let selectedIndex = bins.findIndex(bin => bin.label === selectedSeatRange);
    if (selectedIndex < 0) {
        selectedIndex = bins.reduce((best, bin, index) => bin.probability > bins[best].probability ? index : best, 0);
    }
    selectSeatBin(selectedIndex);
    partyResults.hidden = false;
    partyLoading.hidden = true;
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
    loadingIndicator.hidden = roleCandidates.has(selectedRole.slug);
    electionLoading.hidden = !electionOutcomes.hidden;
    governmentLoading.hidden = !governmentOutcomes.hidden;
    partyLoading.hidden = partyDistributions.has(selectedParty.slug);
    panel.setAttribute('aria-busy', 'true');
    electionPanel.setAttribute('aria-busy', 'true');
    governmentPanel.setAttribute('aria-busy', 'true');
    partyPanel.setAttribute('aria-busy', 'true');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
        const response = await fetch(API_URL, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const events = await response.json();
        if (!Array.isArray(events)) throw new Error('Expected an array of events');
        const candidatesByRole = getRoleCandidates(events);
        const election = getElectionOutcomes(events);
        const government = getGovernmentOutcomes(events);
        const distributions = getPartyDistributions(events);
        roleCandidates = candidatesByRole;
        partyDistributions = distributions;
        renderSelectedRole();
        renderSelectedParty();
        roleSelect.disabled = false;
        partySelect.disabled = false;
        Object.entries(electionValues).forEach(([key, element]) => {
            element.textContent = percent.format(election[key]);
        });
        electionOutcomes.hidden = false;
        Object.entries(governmentValues).forEach(([key, element]) => {
            element.textContent = percent.format(government[key]);
        });
        governmentOutcomes.hidden = false;
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
        electionLoading.hidden = true;
        governmentLoading.hidden = true;
        partyLoading.hidden = true;
        panel.setAttribute('aria-busy', 'false');
        electionPanel.setAttribute('aria-busy', 'false');
        governmentPanel.setAttribute('aria-busy', 'false');
        partyPanel.setAttribute('aria-busy', 'false');
        refresh.disabled = false;
        refreshLabel.textContent = 'עדכון עכשיו';
        countdownLabel.textContent = 'העדכון הבא בעוד';
        nextRefreshAt = Date.now() + REFRESH_MS;
        countdown.hidden = false;
        updateCountdown();
        timer = setTimeout(loadOdds, REFRESH_MS);
    }
}

roleSelect.addEventListener('change', () => {
    const role = ROLE_MARKETS.find(role => role.slug === roleSelect.value);
    if (!role || !roleCandidates.has(role.slug)) return;
    selectedRole = role;
    renderSelectedRole();
});
partySelect.addEventListener('change', () => {
    const party = PARTY_MARKETS.find(party => party.slug === partySelect.value);
    if (!party || !partyDistributions.has(party.slug)) return;
    selectedParty = party;
    selectedSeatRange = undefined;
    renderSelectedParty();
});
refresh.addEventListener('click', loadOdds);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loadOdds();
});
setInterval(updateCountdown, 1000);
loadOdds();
