let mediaElements = [];
let loopSequences = [];
let currentSequenceIndex = 0;
let isLooping = false;

// Load sequences from storage
chrome.storage.local.get(['sequences'], function(result) {
    loopSequences = result.sequences || [];
});

function findMediaElements() {
    const videos = Array.from(document.getElementsByTagName('video'));
    const audios = Array.from(document.getElementsByTagName('audio'));
    mediaElements = [...videos, ...audios];

    mediaElements.forEach(media => {
        if (!media.hasLoopListener) {
            media.addEventListener('timeupdate', checkLoopPoints);
            media.hasLoopListener = true;
        }
    });
}

function checkLoopPoints() {
    if (!isLooping || loopSequences.length === 0) return;

    const currentMedia = this;
    const currentTime = currentMedia.currentTime;
    const currentSequence = loopSequences[currentSequenceIndex];

    if (currentTime >= currentSequence.end) {
        currentSequenceIndex = (currentSequenceIndex + 1) % loopSequences.length;
        const nextSequence = loopSequences[currentSequenceIndex];
        currentMedia.currentTime = nextSequence.start;
        currentMedia.play();
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'ADD_SEQUENCE':
            loopSequences.push({
                start: request.startTime,
                end: request.endTime
            });
            sendResponse({ success: true });
            break;
        case 'START_LOOP':
            isLooping = true;
            currentSequenceIndex = 0;
            if (mediaElements.length > 0) {
                mediaElements[0].currentTime = loopSequences[0].start;
            }
            sendResponse({ success: true });
            break;
        case 'STOP_LOOP':
            isLooping = false;
            sendResponse({ success: true });
            break;
        case 'GET_CURRENT_TIME':
            if (mediaElements.length > 0) {
                sendResponse({ currentTime: mediaElements[0].currentTime });
            } else {
                sendResponse({ error: 'No media found' });
            }
            break;
        case 'GET_SEQUENCES':
            sendResponse({ sequences: loopSequences });
            break;
        case 'UPDATE_SEQUENCE':
            loopSequences[request.index] = {
                start: request.startTime,
                end: request.endTime
            };
            sendResponse({ success: true });
            break;
        case 'REMOVE_SEQUENCE':
            loopSequences.splice(request.index, 1);
            sendResponse({ success: true });
            break;
    }
    return true;
});

window.addEventListener('load', findMediaElements);
setInterval(findMediaElements, 2000);
