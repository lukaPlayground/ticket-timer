// 서비스 워커 초기화
let activeAlarms = {}; // tabId -> alarmInfo 매핑
let serverTimeOffset = 0;

// 설치 시 초기화
chrome.runtime.onInstalled.addListener(() => {
  console.log('티켓팅 타이머 확장 프로그램 설치됨');
  syncServerTime();
  loadExistingTimers();
});

// 시작 시 초기화
chrome.runtime.onStartup.addListener(() => {
  syncServerTime();
  loadExistingTimers();
});

// 서버 시간 동기화 (여러 방법 시도)
async function syncServerTime() {
  // 방법 1: HTTP HEAD 요청으로 서버 시간 가져오기
  try {
    const startTime = Date.now();
    const response = await fetch('https://www.google.com', { method: 'HEAD' });
    const serverDateHeader = response.headers.get('date');
    const roundTripTime = Date.now() - startTime;
    
    if (serverDateHeader) {
      const serverTime = new Date(serverDateHeader).getTime();
      const localTime = Date.now();
      
      serverTimeOffset = serverTime - localTime + (roundTripTime / 2);
      console.log('서버 시간 동기화 완료 (Google). 오차:', serverTimeOffset, 'ms');
      return;
    }
  } catch (error) {
    console.log('Google 시간 동기화 실패:', error);
  }
  
  // 방법 2: Cloudflare 시간 API
  try {
    const startTime = Date.now();
    const response = await fetch('https://cloudflare.com/cdn-cgi/trace');
    const text = await response.text();
    const roundTripTime = Date.now() - startTime;
    
    const tsMatch = text.match(/ts=([\d.]+)/);
    if (tsMatch) {
      const serverTime = parseFloat(tsMatch[1]) * 1000;
      const localTime = Date.now();
      
      serverTimeOffset = serverTime - localTime + (roundTripTime / 2);
      console.log('서버 시간 동기화 완료 (Cloudflare). 오차:', serverTimeOffset, 'ms');
      return;
    }
  } catch (error) {
    console.log('Cloudflare 시간 동기화 실패:', error);
  }
  
  // 모두 실패하면 로컬 시간 사용
  console.warn('서버 시간 동기화 실패. 로컬 시간을 사용합니다.');
  serverTimeOffset = 0;
}

// 정확한 현재 시간
function getAccurateTime() {
  return new Date(Date.now() + serverTimeOffset);
}

// 저장된 타이머 로드 및 알람 설정
async function loadExistingTimers() {
  const { timers = {} } = await chrome.storage.local.get('timers');
  
  for (const [tabId, timer] of Object.entries(timers)) {
    const openTime = new Date(timer.openTime);
    const now = getAccurateTime();
    
    // 아직 시간이 안 된 타이머만 설정
    if (openTime > now) {
      setAlarmForTab(parseInt(tabId), timer);
    }
  }
}

// 탭에 대한 알람 설정
function setAlarmForTab(tabId, timer) {
  const openTime = new Date(timer.openTime);
  const now = getAccurateTime();
  const delay = openTime.getTime() - now.getTime();
  
  if (delay <= 0) {
    console.log(`탭 ${tabId}: 이미 지난 시각`);
    return;
  }
  
  // 기존 알람이 있으면 취소
  if (activeAlarms[tabId]) {
    clearTimeout(activeAlarms[tabId].timeoutId);
  }
  
  // 새 알람 설정
  const timeoutId = setTimeout(() => {
    handleAlarmTrigger(tabId, timer);
  }, delay);
  
  activeAlarms[tabId] = {
    timeoutId,
    timer,
    openTime: timer.openTime
  };
  
  console.log(`탭 ${tabId}: 알람 설정됨 (${delay}ms 후)`);
  
  // 배지 업데이트 시작
  updateBadgeForTab(tabId);
}

// 알람 트리거 시 처리
async function handleAlarmTrigger(tabId, timer) {
  console.log(`탭 ${tabId}: 타이머 도래!`);
  
  // 알림 표시
  chrome.notifications.create(`timer-${tabId}`, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: '🎫 티켓팅 시간입니다!',
    message: `${timer.concertName}\n지금 바로 티켓팅을 시작하세요!`,
    priority: 2,
    requireInteraction: true
  });
  
  // 탭 활성화
  try {
    await chrome.tabs.update(tabId, { active: true });
    const tab = await chrome.tabs.get(tabId);
    await chrome.windows.update(tab.windowId, { focused: true });
  } catch (error) {
    console.error('탭 활성화 실패:', error);
  }
  
  // 자동 새로고침
  if (timer.autoRefresh) {
    try {
      await chrome.tabs.reload(tabId);
      console.log(`탭 ${tabId}: 자동 새로고침 완료`);
    } catch (error) {
      console.error('자동 새로고침 실패:', error);
    }
  }
  
  // 알람 정리
  delete activeAlarms[tabId];
  
  // 배지 제거
  updateBadgeForTab(tabId);
}

// 배지 업데이트 (남은 시간 표시)
function updateBadgeForTab(tabId) {
  const alarm = activeAlarms[tabId];
  
  if (!alarm) {
    // 알람 없으면 배지 제거
    chrome.action.setBadgeText({ text: '', tabId: parseInt(tabId) });
    return;
  }
  
  function update() {
    const now = getAccurateTime().getTime();
    const openTime = new Date(alarm.openTime).getTime();
    const diff = openTime - now;
    
    if (diff <= 0) {
      chrome.action.setBadgeText({ text: '!', tabId: parseInt(tabId) });
      chrome.action.setBadgeBackgroundColor({ color: '#dc3545', tabId: parseInt(tabId) });
      return;
    }
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    let badgeText = '';
    if (days > 0) {
      badgeText = `${days}d`;
    } else if (hours > 0) {
      badgeText = `${hours}h`;
    } else if (minutes > 0) {
      badgeText = `${minutes}m`;
    } else if (seconds > 0) {
      badgeText = `${seconds}s`;
    }
    
    chrome.action.setBadgeText({ text: badgeText, tabId: parseInt(tabId) });
    chrome.action.setBadgeBackgroundColor({ color: '#667eea', tabId: parseInt(tabId) });
    
    // 1초 후 다시 업데이트
    setTimeout(update, 1000);
  }
  
  update();
}

// 팝업으로부터 메시지 수신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'setAlarm') {
    const { tabId, openTime } = message;
    chrome.storage.local.get('timers').then(({ timers = {} }) => {
      const timer = timers[tabId];
      if (timer) {
        setAlarmForTab(tabId, timer);
      }
    });
  } else if (message.action === 'clearAlarm') {
    const { tabId } = message;
    if (activeAlarms[tabId]) {
      clearTimeout(activeAlarms[tabId].timeoutId);
      delete activeAlarms[tabId];
    }
    chrome.action.setBadgeText({ text: '', tabId: parseInt(tabId) });
  }
  
  return true;
});

// 탭이 닫히면 알람 제거
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeAlarms[tabId]) {
    clearTimeout(activeAlarms[tabId].timeoutId);
    delete activeAlarms[tabId];
  }
  
  // 저장소에서도 제거
  chrome.storage.local.get('timers').then(({ timers = {} }) => {
    if (timers[tabId]) {
      delete timers[tabId];
      chrome.storage.local.set({ timers });
    }
  });
});

// 주기적으로 서버 시간 재동기화 (10분마다)
setInterval(syncServerTime, 10 * 60 * 1000);
