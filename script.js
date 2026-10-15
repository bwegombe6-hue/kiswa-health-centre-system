const STORAGE_KEY = 'kiswa_queue_data';

function getQueueData() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
        return { queue: [], currentServing: null, servedCount: 0, date: new Date().toDateString() };
    }
    const parsed = JSON.parse(data);
    if (parsed.date !== new Date().toDateString()) {
        return { queue: [], currentServing: null, servedCount: 0, date: new Date().toDateString() };
    }
    return parsed;
}

function saveQueueData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function generateToken() {
    const data = getQueueData();
    const nextNum = data.queue.length + 1;
    return 'A-' + String(nextNum).padStart(3, '0');
}

function addPatient(patient) {
    const data = getQueueData();
    const token = generateToken();
    const now = new Date();
    const timeIn = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    const newPatient = {
        id: Date.now(),
        token: token,
        fullName: patient.fullName,
        age: patient.age,
        gender: patient.gender,
        phone: patient.phone || '',
        village: patient.village || '',
        priority: patient.priority || 'normal',
        status: 'waiting',
        timeIn: timeIn,
        timeInMs: Date.now(),
        calledAt: null,
        waitTime: null
    };

    data.queue.push(newPatient);
    saveQueueData(data);
    return { token: token, patient: newPatient };
}

function callNextPatient() {
    const data = getQueueData();
    const waiting = data.queue
        .filter(p => p.status === 'waiting')
        .sort((a, b) => {
            const priorityOrder = { 'emergency': 1, 'urgent': 2, 'normal': 3 };
            const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (pDiff !== 0) return pDiff;
            return a.timeInMs - b.timeInMs;
        });

    if (waiting.length === 0) return null;

    const next = waiting[0];

    if (data.currentServing) {
        const prev = data.queue.find(p => p.token === data.currentServing);
        if (prev && prev.status === 'serving') {
            prev.status = 'completed';
            prev.waitTime = Math.round((Date.now() - prev.timeInMs) / 60000);
            data.servedCount++;
        }
    }

    next.status = 'serving';
    next.calledAt = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    data.currentServing = next.token;

    saveQueueData(data);
    return { token: next.token, patient: next };
}

function resetDayData() {
    localStorage.removeItem(STORAGE_KEY);
}

function getStats() {
    const data = getQueueData();
    const total = data.queue.length;
    const served = data.queue.filter(p => p.status === 'completed').length;
    const waiting = data.queue.filter(p => p.status === 'waiting').length;

    let avgWait = 0;
    const servedList = data.queue.filter(p => p.status === 'completed' && p.waitTime);
    if (servedList.length > 0) {
        avgWait = Math.round(servedList.reduce((sum, p) => sum + p.waitTime, 0) / servedList.length);
    }

    return { total, served, waiting, avgWait };
}