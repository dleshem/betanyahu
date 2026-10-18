import { API_URL, getCandidates } from './polymarket.mjs';

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
const retry = document.querySelector('#retry');
const percent = new Intl.NumberFormat('he-IL', { style: 'percent', maximumFractionDigits: 4 });
let loading = false;
let timer;

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
    retry.hidden = true;
    loadingIndicator.hidden = list.childElementCount > 0;
    panel.setAttribute('aria-busy', 'true');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
        const response = await fetch(API_URL, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const candidates = getCandidates(await response.json());
        render(candidates);
    } catch {
        retry.setAttribute('aria-label', list.childElementCount
            ? 'העדכון נכשל. מוצגים הסיכויים מהעדכון הקודם. נסו שוב'
            : 'טעינת הסיכויים נכשלה. נסו שוב');
        retry.hidden = false;
    } finally {
        clearTimeout(timeout);
        loading = false;
        loadingIndicator.hidden = true;
        panel.setAttribute('aria-busy', 'false');
        timer = setTimeout(loadOdds, REFRESH_MS);
    }
}

retry.addEventListener('click', loadOdds);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loadOdds();
});
loadOdds();
