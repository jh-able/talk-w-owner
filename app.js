document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  // ==========================================
  // --- Firebase & Firestore Configuration ---
  // ==========================================
  const firebaseConfig = {
    apiKey: "AIzaSyCri_QkHRJqZgzZqdcoWxyF9kFuHCpDGUI",
    authDomain: "radio-f79f9.firebaseapp.com",
    projectId: "radio-f79f9",
    storageBucket: "radio-f79f9.firebasestorage.app",
    messagingSenderId: "4987890307",
    appId: "1:4987890307:web:f2a9330a7bb1c52c9649b6"
  };

  // Firebase 및 Firestore 초기화
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const collectionRef = db.collection('chalkboard_stories');

  let stories = [];

  // 기본 초기 사연 (가이드 데이터)
  const defaultStories = [
    { nickname: '낭만청춘', story: '힘든 시기에 늘 저를 위로해 주었던 노래입니다. 막막하다는 기분이 들 때, 이 노래를 흥얼거리면 마법처럼 힘이 났어요!', song: '옥상달빛 - 수고했어 오늘도', x: 35, y: 55, rotation: -3 }
  ];

  // --- Realtime Data Synchronization (실시간 데이터 동기화) ---
  const listenToStories = () => {
    collectionRef.onSnapshot((snapshot) => {
      stories = [];
      snapshot.forEach((doc) => {
        stories.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // 만약 DB가 완전히 비어있다면 디폴트 사연 생성 후 즉시 리턴
      if (stories.length === 0 && snapshot.empty) {
        defaultStories.forEach(async (item) => {
          await collectionRef.add({ ...item, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        });
        return; 
      }

      // 화면 새로 그리기 및 카운터 업데이트
      renderAllNotes();
    }, (error) => {
      console.error("Firestore listen error: ", error);
    });
  };

  // ==========================================
  // --- DOM Elements ---
  // ==========================================
  const chalkboard = document.getElementById('chalkboard');
  const notesGrid = document.getElementById('notes-grid');
  const storyCounter = document.getElementById('story-counter');
  const btnWriteStory = document.getElementById('btn-write-story');
  const btnClearBoard = document.getElementById('btn-clear-board');
  const animationViewport = document.getElementById('animation-viewport');

  // Portal & DJ Login Elements
  const landingPortal = document.getElementById('landing-portal');
  const btnEnterGuest = document.getElementById('btn-enter-guest');
  const btnShowDjLogin = document.getElementById('btn-show-dj-login');
  const djLoginPanel = document.getElementById('dj-login-panel');
  const portalChoices = document.getElementById('portal-choices');
  const btnBackToChoices = document.getElementById('btn-back-to-choices');
  const djLoginForm = document.getElementById('dj-login-form');
  const loginId = document.getElementById('login-id');
  const loginPw = document.getElementById('login-pw');
  const loginErrorMsg = document.getElementById('login-error-msg');
  const eraserHolder = document.getElementById('eraser-holder');
  const djModeBadge = document.getElementById('dj-mode-badge');

  // Modals
  const modalWrite = document.getElementById('modal-write');
  const modalDetail = document.getElementById('modal-detail');
  const btnCloseWrite = document.getElementById('btn-close-write');
  const btnCloseDetail = document.getElementById('btn-close-detail');

  // Custom Deletion Confirm Modal Elements
  const modalConfirm = document.getElementById('modal-confirm');
  const btnConfirmYes = document.getElementById('btn-confirm-yes');
  const btnConfirmNo = document.getElementById('btn-confirm-no');

  // Form Elements
  const storyForm = document.getElementById('story-form');
  const storyFormPaper = document.getElementById('story-form-paper');
  const inputNickname = document.getElementById('input-nickname');
  const inputStory = document.getElementById('input-story');
  const inputSong = document.getElementById('input-song');

  // Detail elements
  const detailNickname = document.getElementById('detail-nickname');
  const detailStory = document.getElementById('detail-story');
  const detailRequestedSong = document.getElementById('detail-requested-song');
  const btnDeleteStory = document.getElementById('btn-delete-story');
  const btnYoutubeLink = document.getElementById('btn-youtube-link');
  const btnYoutubeText = document.getElementById('btn-youtube-text');
  const detailLpPanel = document.getElementById('detail-lp-panel');

  let activeStoryId = null;
  let pendingDeleteStoryId = null;
  let isDJMode = false;

  // --- Modal Utilities ---
  const showModal = (modal) => { modal.classList.remove('hidden'); };
  const hideModal = (modal) => { modal.classList.add('hidden'); };

  // --- Counter Stats ---
  const updateStats = () => {
    storyCounter.textContent = `사연: ${stories.length}개`;
  };

  // --- Sticky Note Rendering ---
  const renderNote = (story) => {
    const note = document.createElement('div');
    note.className = 'chalk-sticky-note';
    note.id = `note-${story.id}`;
    note.style.left = `${story.x}%`;
    note.style.top = `${story.y}%`;
    note.style.transform = `rotate(${story.rotation}deg)`;
    
    note.innerHTML = `
      <div class="pushpin"></div>
      <div class="note-nickname">${escapeHTML(story.nickname)}</div>
      <div class="note-story-snippet">${escapeHTML(story.story)}</div>
      <div class="note-song-title">
        <i data-lucide="music"></i>
        <span>${escapeHTML(story.song)}</span>
      </div>
    `;

    note.addEventListener('click', () => openDetailModal(story));
    notesGrid.appendChild(note);
    lucide.createIcons();
  };

  const renderAllNotes = () => {
    notesGrid.innerHTML = '';
    stories.forEach(story => renderNote(story));
    updateStats();
  };

  // Escape HTML helper
  const escapeHTML = (str) => {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  };

  // --- Open Detail View ---
  const openDetailModal = (story) => {
    activeStoryId = story.id;
    detailNickname.textContent = story.nickname;
    detailStory.textContent = story.story;
    detailRequestedSong.textContent = story.song;

    const cleanSongQuery = story.song.trim();
    btnYoutubeLink.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanSongQuery)}`;

    const maxDisplayLen = 22;
    const displaySong = cleanSongQuery.length > maxDisplayLen 
      ? cleanSongQuery.substring(0, maxDisplayLen) + '...' 
      : cleanSongQuery;
    btnYoutubeText.textContent = `"${displaySong}" 재생하기`;

    showModal(modalDetail);

    detailLpPanel.classList.remove('active');
    void detailLpPanel.offsetWidth; 
    detailLpPanel.classList.add('active');
  };

  // --- Delete Story ---
  btnDeleteStory.addEventListener('click', () => {
    if (!activeStoryId) return;
    pendingDeleteStoryId = activeStoryId;
    showModal(modalConfirm);
  });

  btnConfirmYes.addEventListener('click', async () => {
    if (!pendingDeleteStoryId) return;

    const noteEl = document.getElementById(`note-${pendingDeleteStoryId}`);
    if (noteEl) {
      noteEl.style.transform = 'scale(0) rotate(20deg)';
      noteEl.style.opacity = '0';
    }

    try {
      await collectionRef.doc(pendingDeleteStoryId).delete();
      setTimeout(() => {
        hideModal(modalConfirm);
        hideModal(modalDetail);
        detailLpPanel.classList.remove('active');
        pendingDeleteStoryId = null;
      }, 300);
    } catch (error) {
      alert("사연 삭제에 실패했습니다: " + error.message);
    }
  });

  btnConfirmNo.addEventListener('click', () => {
    hideModal(modalConfirm);
    pendingDeleteStoryId = null;
  });

  modalConfirm.addEventListener('click', (e) => {
    if (e.target === modalConfirm) {
      hideModal(modalConfirm);
      pendingDeleteStoryId = null;
    }
  });

  // --- Clear Board ---
  btnClearBoard.addEventListener('click', async () => {
    if (confirm('칠판의 모든 사연과 기록을 지우개로 깨끗이 지우시겠습니까?\n(온라인 데이터베이스가 완전히 초기화됩니다.)')) {
      const notes = document.querySelectorAll('.chalk-sticky-note');
      notes.forEach((note, index) => {
        setTimeout(() => {
          note.style.transform = 'scale(0) translateY(40px)';
          note.style.opacity = '0';
        }, index * 80);
      });

      try {
        const snapshot = await collectionRef.get();
        const batch = db.batch();
        snapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      } catch (error) {
        console.error("전체 삭제 오류:", error);
      }
    }
  });

  // --- Write Modal trigger buttons ---
  btnWriteStory.addEventListener('click', () => {
    storyForm.reset();
    showModal(modalWrite);
  });

  btnCloseWrite.addEventListener('click', () => { hideModal(modalWrite); });
  btnCloseDetail.addEventListener('click', () => {
    detailLpPanel.classList.remove('active');
    hideModal(modalDetail);
  });

  [modalWrite, modalDetail].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        detailLpPanel.classList.remove('active');
        hideModal(modal);
      }
    });
  });

  // ==========================================
  // --- Portal & DJ Login Handlers (복원 파트) ---
  // ==========================================
  const applyRoleSettings = () => {
    if (isDJMode) {
      eraserHolder.style.display = 'block';
      djModeBadge.classList.remove('hidden');
    } else {
      eraserHolder.style.display = 'none';
      djModeBadge.classList.add('hidden');
    }
  };

  // Guest Enter
  btnEnterGuest.addEventListener('click', () => {
    isDJMode = false;
    sessionStorage.setItem('visible_radio_role', 'guest');
    applyRoleSettings();
    landingPortal.classList.add('portal-slide-up');
    setTimeout(() => { hideModal(landingPortal); }, 600);
  });

  // Show DJ Login
  btnShowDjLogin.addEventListener('click', () => {
    portalChoices.classList.add('hidden');
    djLoginPanel.classList.remove('hidden');
    loginId.focus();
  });

  // Back to Choices
  btnBackToChoices.addEventListener('click', () => {
    portalChoices.classList.remove('hidden');
    djLoginPanel.classList.add('hidden');
    djLoginForm.reset();
    loginErrorMsg.classList.add('hidden');
  });

  // DJ Login Submit (ID: admin, PW: admin4250)
  djLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const idVal = loginId.value.trim();
    const pwVal = loginPw.value.trim();

    if (idVal === 'admin' && pwVal === 'admin4250') {
      isDJMode = true;
      sessionStorage.setItem('visible_radio_role', 'dj');
      applyRoleSettings();
      landingPortal.classList.add('portal-slide-up');
      setTimeout(() => { hideModal(landingPortal); }, 600);
    } else {
      loginErrorMsg.classList.remove('hidden');
      const portalCard = document.querySelector('.portal-card');
      portalCard.classList.remove('shake-animation');
      void portalCard.offsetWidth; 
      portalCard.classList.add('shake-animation');
    }
  });

  // Persistent role restoration on load
  const restoreUserRole = () => {
    const savedRole = sessionStorage.getItem('visible_radio_role');
    if (savedRole === 'dj') {
      isDJMode = true;
      applyRoleSettings();
      landingPortal.style.display = 'none';
      hideModal(landingPortal);
    } else if (savedRole === 'guest') {
      isDJMode = false;
      applyRoleSettings();
      landingPortal.style.display = 'none';
      hideModal(landingPortal);
    } else {
      isDJMode = false;
      applyRoleSettings();
    }
  };

  // Run restoration
  restoreUserRole();

  // --- 새 사연 등록 및 애니메이션 ---
  storyForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const nickname = inputNickname.value.trim();
    const story = inputStory.value.trim();
    const song = inputSong.value.trim();

    if (!nickname || !story || !song) return;

    const surfaceRect = chalkboard.getBoundingClientRect();
    const paperRect = storyFormPaper.getBoundingClientRect();

    const startX = paperRect.left + (paperRect.width / 2) - surfaceRect.left;
    const startY = paperRect.top + (paperRect.height / 2) - surfaceRect.top;

    const endXPercent = Math.random() * 70 + 10;
    const endYPercent = Math.random() * 60 + 12;
    
    const endX = (endXPercent / 100) * surfaceRect.width;
    const endY = (endYPercent / 100) * surfaceRect.height;
    
    const randomRotation = Math.floor(Math.random() * 14) - 7;

    storyFormPaper.classList.add('folding-prep');
    setTimeout(() => { storyFormPaper.classList.add('fold-collapse'); }, 300);

    setTimeout(() => {
      createPaperAirplaneFlight(startX, startY, endX, endY, async () => {
        createChalkDustPuff(endX, endY);

        const newStoryData = {
          nickname,
          story,
          song,
          x: endXPercent,
          y: endYPercent,
          rotation: randomRotation,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
          await collectionRef.add(newStoryData);
        } catch (err) {
          alert("데이터 저장 실패: " + err.message);
        }

        hideModal(modalWrite);
        storyFormPaper.classList.remove('folding-prep', 'fold-collapse');
        storyForm.reset();
      });
    }, 700);
  });

  // --- 이펙트 기능 구현부 ---
  const createPaperAirplaneFlight = (startX, startY, endX, endY, callback) => {
    const plane = document.createElement('div');
    plane.className = 'origami-airplane-flight';
    plane.style.setProperty('--start-x', `${startX}px`);
    plane.style.setProperty('--start-y', `${startY}px`);
    plane.style.setProperty('--end-x', `${endX}px`);
    plane.style.setProperty('--end-y', `${endY}px`);

    plane.innerHTML = `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <polygon points="50,15 15,80 50,65" fill="hsl(355, 80%, 93%)" />
        <polygon points="50,15 85,80 50,65" fill="hsl(355, 78%, 88%)" />
        <polygon points="50,15 50,65 35,80" fill="hsl(355, 60%, 82%)" />
        <polygon points="50,15 50,65 65,80" fill="hsl(355, 55%, 78%)" />
        <polygon points="50,65 50,85 42,80" fill="hsl(355, 50%, 75%)" />
        <polygon points="50,65 50,85 58,80" fill="hsl(355, 48%, 70%)" />
      </svg>
    `;

    plane.style.animation = 'flyAirplane 1.8s cubic-bezier(0.2, 0.7, 0.45, 1) forwards';
    animationViewport.appendChild(plane);

    plane.addEventListener('animationend', () => {
      plane.remove();
      if (callback) callback();
    });
  };

  const createChalkDustPuff = (x, y) => {
    const puff = document.createElement('div');
    puff.className = 'dust-puff';
    puff.style.left = `${x}px`;
    puff.style.top = `${y}px`;
    animationViewport.appendChild(puff);
    puff.addEventListener('animationend', () => { puff.remove(); });
  };

  // 실시간 동기화 리스너 구동
  listenToStories();
});
