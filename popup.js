// 전역 변수
let currentTabId = null;
let serverTimeOffset = 0; // 로컬 시간과 서버 시간의 차이 (밀리초)

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
  await syncServerTime();
  await loadCurrentTab();
  await loadTimerList();
  startClockUpdate();
  setupEventListeners();
});

// 표준시 API로 서버 시간 동기화
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
      
      const offsetMs = Math.abs(serverTimeOffset);
      const offsetText = serverTimeOffset > 0 
        ? `로컬 시간이 ${(offsetMs / 1000).toFixed(2)}초 느립니다`
        : `로컬 시간이 ${(offsetMs / 1000).toFixed(2)}초 빠릅니다`;
      
      document.getElementById('timeOffset').textContent = offsetText;
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
      
      const offsetMs = Math.abs(serverTimeOffset);
      const offsetText = serverTimeOffset > 0 
        ? `로컬 시간이 ${(offsetMs / 1000).toFixed(2)}초 느립니다`
        : `로컬 시간이 ${(offsetMs / 1000).toFixed(2)}초 빠릅니다`;
      
      document.getElementById('timeOffset').textContent = offsetText;
      return;
    }
  } catch (error) {
    console.log('Cloudflare 시간 동기화 실패:', error);
  }
  
  // 모두 실패
  console.error('서버 시간 동기화 실패');
  document.getElementById('timeOffset').textContent = '동기화 실패 (로컬 시간 사용)';
  serverTimeOffset = 0;
}

// 정확한 현재 시간 가져오기 (서버 시간 기준)
function getAccurateTime() {
  return new Date(Date.now() + serverTimeOffset);
}

// 시계 업데이트
function startClockUpdate() {
  function updateClock() {
    const now = getAccurateTime();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('serverTime').textContent = `${hours}:${minutes}:${seconds}`;
  }
  
  updateClock();
  setInterval(updateClock, 100); // 0.1초마다 업데이트로 정확도 향상
}

// 현재 탭 정보 로드
async function loadCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    currentTabId = tab.id;
    document.getElementById('tabTitle').textContent = tab.title;
    document.getElementById('tabUrl').textContent = tab.url;
    
    // 저장된 타이머가 있으면 폼에 채우기
    const timers = await chrome.storage.local.get('timers');
    const tabTimer = timers.timers?.[tab.id];
    if (tabTimer) {
      document.getElementById('concertName').value = tabTimer.concertName || '';
      const openDateTime = new Date(tabTimer.openTime);
      document.getElementById('openDate').value = openDateTime.toISOString().split('T')[0];
      document.getElementById('openTime').value = openDateTime.toTimeString().split(' ')[0];
      document.getElementById('autoRefresh').checked = tabTimer.autoRefresh || false;
    }
  }
}

// 타이머 목록 로드
async function loadTimerList() {
  const { timers = {} } = await chrome.storage.local.get('timers');
  const container = document.getElementById('timerListContainer');
  
  const timerEntries = Object.entries(timers);
  if (timerEntries.length === 0) {
    container.innerHTML = '<div class="empty-state">설정된 타이머가 없습니다</div>';
    return;
  }
  
  container.innerHTML = '';
  
  for (const [tabId, timer] of timerEntries) {
    const timerItem = createTimerItem(tabId, timer);
    container.appendChild(timerItem);
  }
  
  // 카운트다운 업데이트 시작
  updateAllCountdowns();
  setInterval(updateAllCountdowns, 1000);
}

// 타이머 아이템 생성
function createTimerItem(tabId, timer) {
  const div = document.createElement('div');
  div.className = 'timer-item';
  div.dataset.tabId = tabId;
  
  const openTime = new Date(timer.openTime);
  const dateStr = openTime.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  div.innerHTML = `
    <div class="concert-name">${timer.concertName}</div>
    <div class="timer-info">📅 ${dateStr}</div>
    <div class="countdown" data-target="${timer.openTime}">계산 중...</div>
    <div class="tab-link">${timer.tabTitle}</div>
    <div class="actions">
      <button class="btn-small btn-goto" data-tab-id="${tabId}">탭으로 이동</button>
      <button class="btn-small btn-delete" data-tab-id="${tabId}">삭제</button>
    </div>
  `;
  
  return div;
}

// 모든 카운트다운 업데이트
function updateAllCountdowns() {
  const countdowns = document.querySelectorAll('.countdown');
  const now = getAccurateTime().getTime();
  
  countdowns.forEach(countdown => {
    const targetTime = new Date(countdown.dataset.target).getTime();
    const diff = targetTime - now;
    
    if (diff <= 0) {
      countdown.textContent = '⏰ 오픈 시각 도래!';
      countdown.style.color = '#dc3545';
    } else {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      let countdownText = '';
      if (days > 0) {
        countdownText = `${days}일 ${hours}시간 ${minutes}분 ${seconds}초`;
      } else if (hours > 0) {
        countdownText = `${hours}시간 ${minutes}분 ${seconds}초`;
      } else if (minutes > 0) {
        countdownText = `${minutes}분 ${seconds}초`;
      } else {
        countdownText = `${seconds}초`;
      }
      
      countdown.textContent = countdownText;
    }
  });
}

// 이벤트 리스너 설정
function setupEventListeners() {
  // 타이머 저장 버튼
  document.getElementById('saveTimer').addEventListener('click', saveTimer);
  
  // 타이머 목록의 버튼들 (이벤트 위임)
  document.getElementById('timerListContainer').addEventListener('click', async (e) => {
    const tabId = e.target.dataset.tabId;
    if (!tabId) return;
    
    if (e.target.classList.contains('btn-goto')) {
      // 탭으로 이동
      await chrome.tabs.update(parseInt(tabId), { active: true });
      window.close();
    } else if (e.target.classList.contains('btn-delete')) {
      // 타이머 삭제
      await deleteTimer(tabId);
    }
  });
}

// 타이머 저장
async function saveTimer() {
  const concertName = document.getElementById('concertName').value.trim();
  const openDate = document.getElementById('openDate').value;
  const openTime = document.getElementById('openTime').value;
  const autoRefresh = document.getElementById('autoRefresh').checked;
  
  if (!concertName || !openDate || !openTime) {
    alert('모든 필드를 입력해주세요.');
    return;
  }
  
  const openDateTime = new Date(`${openDate}T${openTime}`);
  if (openDateTime <= new Date()) {
    alert('미래 시각을 입력해주세요.');
    return;
  }
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const timerData = {
    concertName,
    openTime: openDateTime.toISOString(),
    autoRefresh,
    tabTitle: tab.title,
    tabUrl: tab.url,
    createdAt: new Date().toISOString()
  };
  
  // 저장
  const { timers = {} } = await chrome.storage.local.get('timers');
  timers[tab.id] = timerData;
  await chrome.storage.local.set({ timers });
  
  // 백그라운드에 알림 설정 요청
  chrome.runtime.sendMessage({
    action: 'setAlarm',
    tabId: tab.id,
    openTime: openDateTime.toISOString()
  });
  
  alert('타이머가 설정되었습니다! ✅');
  await loadTimerList();
}

// 타이머 삭제
async function deleteTimer(tabId) {
  if (!confirm('이 타이머를 삭제하시겠습니까?')) {
    return;
  }
  
  const { timers = {} } = await chrome.storage.local.get('timers');
  delete timers[tabId];
  await chrome.storage.local.set({ timers });
  
  // 백그라운드에 알람 취소 요청
  chrome.runtime.sendMessage({
    action: 'clearAlarm',
    tabId: tabId
  });
  
  await loadTimerList();
}
