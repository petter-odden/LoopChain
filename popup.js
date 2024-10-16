let sequences = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Load sequences from storage
    chrome.storage.local.get(['sequences'], function(result) {
        sequences = result.sequences || [];
        updateSequencesDisplay();
    });

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_SEQUENCES' });
    if (response && response.sequences) {
        sequences = response.sequences;
        updateSequencesDisplay();
        // Save sequences to storage
        chrome.storage.local.set({sequences: sequences});
    }
});

document.getElementById('addSequence').addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_CURRENT_TIME' });

    if (response.currentTime !== undefined) {
        const startTime = response.currentTime;
        const endTime = startTime + 10; // Default 10-second sequence

        sequences.push({ start: startTime, end: endTime });
        await chrome.tabs.sendMessage(tabs[0].id, {
            action: 'ADD_SEQUENCE',
            startTime,
            endTime
        });
        saveSequences();
        updateSequencesDisplay();
    }
});

document.getElementById('startLoop').addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tabs[0].id, { action: 'START_LOOP' });
});

document.getElementById('stopLoop').addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tabs[0].id, { action: 'STOP_LOOP' });
});

async function setCurrentTime(index, isStart) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_CURRENT_TIME' });

    if (response.currentTime !== undefined) {
        const newTime = response.currentTime;
        await chrome.tabs.sendMessage(tabs[0].id, {
            action: 'UPDATE_SEQUENCE',
            index,
            startTime: isStart ? newTime : sequences[index].start,
            endTime: isStart ? sequences[index].end : newTime
        });
        if (isStart) {
            sequences[index].start = newTime;
        } else {
            sequences[index].end = newTime;
        }
        updateSequencesDisplay();
    }
}

function secondsToMMSSmmm(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const milliseconds = Math.round((remainingSeconds % 1) * 1000);
    return `${minutes.toString().padStart(2, '0')}:${Math.floor(remainingSeconds).toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

function MMSSmmToSeconds(timeString) {
    const [minutesSeconds, milliseconds] = timeString.split('.');
    const [minutes, seconds] = minutesSeconds.split(':');
    return parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) / 1000;
}

async function updateSequence(index, startTime, endTime) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'UPDATE_SEQUENCE',
        index,
        startTime,
        endTime
    });
    sequences[index] = { start: startTime, end: endTime };
    saveSequences();
    updateSequencesDisplay();
}

async function removeSequence(index) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'REMOVE_SEQUENCE',
        index
    });
    sequences.splice(index, 1);
    saveSequences();
    updateSequencesDisplay();
}

function updateSequencesDisplay() {
    const container = document.getElementById('sequences');
    container.innerHTML = '';
    sequences.forEach((seq, index) => {
        const div = document.createElement('div');
        div.className = 'sequence';
        div.innerHTML = `
            <div>Sequence ${index + 1}</div>
            <div>
                <input type="text" value="${secondsToMMSSmmm(seq.start)}" class="start-time"> to 
                <input type="text" value="${secondsToMMSSmmm(seq.end)}" class="end-time">
            </div>
            <div>
                <button class="set-current-time start">Set Start</button>
                <button class="set-current-time end">Set End</button>
                <button class="remove-sequence">Remove</button>
            </div>
        `;

        div.querySelector('.start-time').addEventListener('change', async (e) => {
            const newStart = MMSSmmToSeconds(e.target.value);
            await updateSequence(index, newStart, seq.end);
        });

        div.querySelector('.end-time').addEventListener('change', async (e) => {
            const newEnd = MMSSmmToSeconds(e.target.value);
            await updateSequence(index, seq.start, newEnd);
        });

        div.querySelector('.set-current-time.start').addEventListener('click', () => setCurrentTime(index, true));
        div.querySelector('.set-current-time.end').addEventListener('click', () => setCurrentTime(index, false));

        div.querySelector('.remove-sequence').addEventListener('click', async () => {
            await removeSequence(index);
        });

        container.appendChild(div);
    });
}

function saveSequences() {
    chrome.storage.local.set({sequences: sequences});
}
