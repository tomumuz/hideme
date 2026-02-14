// 国コードと名前のマッピング
const COUNTRY_NAMES = {
    'US': 'アメリカ',
    'NL': 'オランダ',
    'CH': 'スイス',
    'DE': 'ドイツ',
    'FI': 'フィンランド',
    'FR': 'フランス',
    'GB': '英国'
};

// 作品IDの高速検索用インデックス
let workIdIndex = new Map();

// 作品IDの履歴管理（localStorage）
const WorkIdHistory = {
    STORAGE_KEY: 'unogs_work_id_history',
    
    // 履歴を取得
    getHistory() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('履歴の読み込みに失敗:', e);
            return {};
        }
    },
    
    // 履歴を保存
    saveHistory(history) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
        } catch (e) {
            console.error('履歴の保存に失敗:', e);
        }
    },
    
    // 作品の一意キーを生成（タイトル+年+カテゴリ）
    getItemKey(item) {
        const title = item.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        const year = item.year || 'unknown';
        const category = item.category || 'unknown';
        return `${title}::${year}::${category}`;
    },
    
    // 履歴からIDを取得
    getId(item) {
        const history = this.getHistory();
        const key = this.getItemKey(item);
        return history[key];
    },
    
    // 履歴にIDを保存
    setId(item, workId) {
        const history = this.getHistory();
        const key = this.getItemKey(item);
        history[key] = workId;
        this.saveHistory(history);
    }
};

// 特別カテゴリのリスト
const SPECIAL_CATEGORIES = {
    'ghibli': {
        name: 'スタジオジブリ',
        movies: [
            'Spirited Away',
            'Princess Mononoke',
            'Howl\u2019s Moving Castle',
            'My Neighbor Totoro',
            'Kiki\u2019s Delivery Service',
            'Ponyo',
            'The Wind Rises',
            'Nausicaä of the Valley of the Wind',
            'Castle in the Sky',
            'Grave of the Fireflies',
            'The Secret World of Arrietty',
            'When Marnie Was There',
            'Whisper of the Heart',
            'From Up on Poppy Hill',
            'My Neighbors the Yamadas',
            'Ocean Waves',
            'Tales from Earthsea',
            'The Cat Returns',
            'Kaguyahime no monogatari',
            'Porco Rosso',
            'Only Yesterday',
            'Pom Poko',
            'The Tale of the Princess Kaguya',
            'The Boy and the Heron',
            'Earwig and the Witch',
            'The Red Turtle'
        ]
    },
    'conan': {
        name: '名探偵コナン',
        movies: [
            'Detective Conan : The Time-Bombed Skyscraper',
            'Detective Conan : The Fourteenth Target',
            'Detective Conan : The Last Wizard of the Century',
            'Detective Conan : Captured in Her Eyes',
            'Detective Conan : Countdown to Heaven',
            'Detective Conan : The Phantom of Baker Street',
            'Detective Conan : Crossroad in the Ancient Capital',
            'Detective Conan : Magician of the Silver Sky',
            'Detective Conan : Strategy Above the Depths',
            'Detective Conan : The Private Eyes\' Requiem',
            'Detective Conan : Jolly Roger in the Deep Azure',
            'Detective Conan : Full Score of Fear',
            'Detective Conan : The Raven Chaser',
            'Detective Conan : The Lost Ship in The Sky',
            'Detective Conan : Quarter of Silence',
            'Detective Conan : The Eleventh Striker',
            'Detective Conan : Private Eye in the Distant Sea',
            'Detective Conan : Dimensional Sniper',
            'Detective Conan : Sunflowers of Inferno',
            'Detective Conan : The Darkest Nightmare',
            'Detective Conan : The Crimson Love Letter',
            'Detective Conan : Zero The Enforcer',
            'Detective Conan : The Fist of Blue Sapphire',
            'Detective Conan : The Scarlet Bullet',
            'Detective Conan : The Bride of Halloween',
            'Detective Conan : Black Iron Submarine'
        ]
    },
    'onepiece': {
        name: 'ワンピース',
        movies: [
            'One Piece',
            'One Piece: Clockwork Island Adventure',
            'One Piece: Chopper\u2019s Kingdom on the Island of Strange Animals',
            'One Piece: Dead End Adventure',
            'One Piece: The Cursed Holy Sword',
            'One Piece: Baron Omatsuri and the Secret Island',
            'One Piece: The Giant Mechanical Soldier of Karakuri Castle',
            'One Piece: Episode of Alabasta',
            'One Piece: Episode of Chopper: Bloom in the Winter, Miracle Sakura',
            'One Piece Film: Strong World',
            'One Piece 3D: Straw Hat Chase',
            'One Piece Film Z',
            'One Piece Episode of East blue - Luffy and His Four Crewmates\u2019 Great Adventure',
            'One Piece: 3D2Y - Overcome Ace\u2019s Death! Luffy\u2019s Vow to His Friends',
            'One Piece Adventure of Nebulandia',
            'One Piece Film: Gold',
            'One Piece Episode of Skypiea',
            'One Piece Stampede',
            'One Piece Film: Red'
        ]
    },
    'naruto': {
        name: 'NARUTO',
        movies: [
            'Naruto the Movie: Ninja Clash in the Land of Snow',
            'Naruto the Movie 2: Legend of the Stone of Gelel',
            'Naruto the Movie 3: Guardians of the Crescent Moon Kingdom',
            'Naruto Shippuden: The Movie',
            'Naruto Shippuden The Movie: Bonds',
            'Naruto Shippuden the Movie: The Will of Fire',
            'Naruto Shippuden: The Movie: The Lost Tower',
            'Naruto Shippuden : Blood Prison',
            'Road to Ninja: Naruto the Movie',
            'The Last: Naruto the Movie',
            'Boruto: Naruto the Movie'
        ]
    }
};

function normalizeTitle(text) {
    return (text || '')
        .replace(/[’‘]/g, "'")
        .replace(/[“”]/g, '"')
        .trim();
}

let allData = [];
let yearFiltersInitialized = false; // 年フィルターが初期化されたかどうか
let searchQuery = ''; // 検索クエリ

// DOM要素の取得
const extractHtmlBtn = document.getElementById('extractHtmlBtn');
const loadBtn = document.getElementById('loadBtn');
const searchBox = document.getElementById('searchBox');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results');
const resultCountSpan = document.getElementById('resultCount');
const countryCheckboxes = document.querySelectorAll('.country-checkbox');
const selectAllCheckbox = document.getElementById('selectAll');
const deselectAllCheckbox = document.getElementById('deselectAll');
const dataTimestampSpan = document.getElementById('dataTimestamp');

// URLパラメータからフィルター状態を読み込むフラグ
let isInitialLoad = true;

// ステータス表示
function setStatus(message, type = '') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
}

// URLパラメータにフィルター状態を保存
function saveFiltersToURL() {
    const params = new URLSearchParams();
    
    // 国フィルター
    const selectedCountries = Array.from(countryCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    if (selectedCountries.length > 0 && selectedCountries.length < countryCheckboxes.length) {
        params.set('countries', selectedCountries.join(','));
    }
    
    // カテゴリフィルター
    const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
    const selectedCategories = Array.from(categoryCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    if (selectedCategories.length > 0 && selectedCategories.length < categoryCheckboxes.length) {
        params.set('categories', selectedCategories.join(','));
    }
    
    // 年フィルター
    const startYearSelect = document.getElementById('startYearSelect');
    const endYearSelect = document.getElementById('endYearSelect');
    if (startYearSelect && endYearSelect) {
        const startYear = startYearSelect.value;
        const endYear = endYearSelect.value;
        if (startYear) params.set('startYear', startYear);
        if (endYear) params.set('endYear', endYear);
    }
    
    // 特別カテゴリフィルター（URLパラメータから直接取得して保持）
    const currentParams = new URLSearchParams(window.location.search);
    const specialParam = currentParams.get('special');
    if (specialParam) {
        params.set('special', specialParam);
    }
    
    // 検索クエリ
    if (searchQuery) {
        params.set('search', searchQuery);
    }
    
    // URLを更新（ページをリロードしない）
    const newURL = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newURL);
}

// 特別カテゴリパラメータをリセット
function resetSpecialCategory() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('special')) {
        params.delete('special');
        const newURL = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
        window.history.replaceState({}, '', newURL);
    }
}

// URLパラメータからフィルター状態を復元
function loadFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);
    
    // 特別カテゴリが指定されている場合の処理
    const specialParam = params.get('special');
    
    // 国フィルター
    const countriesParam = params.get('countries');
    if (countriesParam) {
        const selectedCountries = countriesParam.split(',');
        countryCheckboxes.forEach(cb => {
            cb.checked = selectedCountries.includes(cb.value);
        });
    }
    
    // 国フィルターの「全て選択」「全て解除」チェックボックスを更新
    const allCountriesChecked = Array.from(countryCheckboxes).every(cb => cb.checked);
    const noCountriesChecked = Array.from(countryCheckboxes).every(cb => !cb.checked);
    selectAllCheckbox.checked = allCountriesChecked;
    deselectAllCheckbox.checked = noCountriesChecked;
    
    // カテゴリフィルター
    const categoriesParam = params.get('categories');
    if (categoriesParam) {
        const selectedCategories = categoriesParam.split(',');
        const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
        categoryCheckboxes.forEach(cb => {
            cb.checked = selectedCategories.includes(cb.value);
        });
    } else if (specialParam && SPECIAL_CATEGORIES[specialParam]) {
        // 特別カテゴリが指定されている場合は「日本の映画(アニメ)」のみをチェック
        const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
        categoryCheckboxes.forEach(cb => {
            cb.checked = (cb.value === '日本の映画(アニメ)');
        });
    }
    
    // カテゴリフィルターの「全て選択」「全て解除」チェックボックスを更新
    const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
    const allCategoriesChecked = Array.from(categoryCheckboxes).every(cb => cb.checked);
    const noCategoriesChecked = Array.from(categoryCheckboxes).every(cb => !cb.checked);
    const selectAllCategoriesCheckbox = document.getElementById('selectAllCategories');
    const deselectAllCategoriesCheckbox = document.getElementById('deselectAllCategories');
    if (selectAllCategoriesCheckbox) selectAllCategoriesCheckbox.checked = allCategoriesChecked;
    if (deselectAllCategoriesCheckbox) deselectAllCategoriesCheckbox.checked = noCategoriesChecked;
    
    // 年フィルター（データ読み込み後に設定）
    const startYear = params.get('startYear');
    const endYear = params.get('endYear');
    if (startYear || endYear) {
        // データが読み込まれた後に年フィルターを設定
        setTimeout(() => {
            const startYearSelect = document.getElementById('startYearSelect');
            const endYearSelect = document.getElementById('endYearSelect');
            if (startYearSelect && startYear) {
                startYearSelect.value = startYear;
            }
            if (endYearSelect && endYear) {
                endYearSelect.value = endYear;
            }
        }, 100);
    }
    
    // 特別カテゴリのメタタグ更新
    if (specialParam && SPECIAL_CATEGORIES[specialParam]) {
        updateMetaTagsForSpecialCategory(specialParam);
    } else {
        // 特別カテゴリでない場合はデフォルトに戻す
        resetMetaTags();
    }
    
    // 検索クエリを復元
    const searchParam = params.get('search');
    if (searchParam) {
        searchQuery = searchParam;
        searchBox.value = searchParam;
        clearSearchBtn.style.display = 'flex';
    }
}

// データの更新日時を取得して表示
async function updateDataTimestamp() {
    try {
        const response = await fetch('metadata.json');
        const metadata = await response.json();
        
        if (metadata && (metadata.timestamp || metadata.lastUpdated)) {
            const date = new Date(metadata.timestamp || metadata.lastUpdated);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const hours = date.getHours();
            const minutes = String(date.getMinutes()).padStart(2, '0');
            
            dataTimestampSpan.textContent = `${year}年${month}月${day}日 ${hours}時${minutes}分`;
            dataTimestampSpan.style.color = '#059669';
            dataTimestampSpan.style.fontWeight = '600';
        } else {
            dataTimestampSpan.textContent = 'データ未取得';
            dataTimestampSpan.style.color = '#dc2626';
            dataTimestampSpan.style.fontWeight = '600';
        }
    } catch (error) {
        console.error('タイムスタンプ取得エラー:', error);
        dataTimestampSpan.textContent = '不明';
        dataTimestampSpan.style.color = '#6b7280';
    }
}

// HTMLから抽出
async function extractFromHTML() {
    setStatus('HTMLからデータを抽出中... しばらくお待ちください（大量データの場合は数分かかります）', 'loading');
    extractHtmlBtn.disabled = true;

    try {
        const response = await fetch('/api/extract-html', {
            signal: AbortSignal.timeout(300000) // 5分のタイムアウト
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || `サーバーエラー: ${response.status} ${response.statusText}`);
        }

        if (result.success && result.data && Array.isArray(result.data)) {
            allData = result.data;
            
            // 全データにIDを付与（衝突を避けるため）
            allData.forEach((item, index) => {
                item._workId = generateWorkId(item, allData);
            });
            
            // IDでインデックスを作成（高速検索用）
            workIdIndex = new Map();
            allData.forEach(item => {
                workIdIndex.set(item._workId, item);
            });
            
            setStatus(`データ抽出完了: ${allData.length}件`, 'success');
            // 年フィルターを初期化
            initializeYearFilters();
            applyFilters();
            // データ抽出成功後、ボタン表示を更新
            extractHtmlBtn.style.display = 'none';
            loadBtn.style.display = 'inline-block';
            // 更新日時を更新
            await updateDataTimestamp();
            // 初期ロード完了
            isInitialLoad = false;
        } else {
            setStatus(`エラー: ${result.error || '不明なエラー'}`, 'error');
            allData = []; // allDataを空配列に初期化
        }
    } catch (error) {
        if (error.name === 'TimeoutError') {
            setStatus('エラー: タイムアウトしました。データ量が多すぎる可能性があります。', 'error');
        } else {
            setStatus(`エラー: ${error.message}`, 'error');
        }
        console.error('データ抽出エラー:', error);
        allData = []; // allDataを空配列に初期化
    } finally {
        extractHtmlBtn.disabled = false;
    }
}

// 全量データ取得（使用しない - コメントアウト）
/*
async function fetchAllDataFromAPI() {
    setStatus('全量データを取得中... 数分かかる場合があります', 'loading');
    extractHtmlBtn.disabled = true;

    try {
        const response = await fetch('/api/fetch-all');
        const result = await response.json();

        if (result.success) {
            allData = result.data;
            setStatus(`データ取得完了: ${allData.length}件`, 'success');
            applyFilters();
        } else {
            setStatus(`エラー: ${result.error}`, 'error');
        }
    } catch (error) {
        setStatus(`エラー: ${error.message}`, 'error');
        console.error('データ取得エラー:', error);
    } finally {
        extractHtmlBtn.disabled = false;
    }
}
*/

// データ取得（API）
async function fetchDataFromAPI() {
    setStatus('データを取得中（API）... しばらくお待ちください', 'loading');
    // fetchAllBtn.disabled = true;
    // fetchApiBtn.disabled = true;
    // fetchBtn.disabled = true;
    // fetchPuppeteerBtn.disabled = true;

    try {
        const response = await fetch('/api/fetch-api');
        const result = await response.json();

        if (result.success) {
            allData = result.data;
            setStatus(`データ取得完了: ${allData.length}件`, 'success');
            applyFilters();
        } else {
            setStatus(`エラー: ${result.error}`, 'error');
        }
    } catch (error) {
        setStatus(`エラー: ${error.message}`, 'error');
        console.error('データ取得エラー:', error);
    } finally {
        // fetchAllBtn.disabled = false;
        // fetchApiBtn.disabled = false;
        // fetchBtn.disabled = false;
        // fetchPuppeteerBtn.disabled = false;
    }
}

// データ取得（通常）
async function fetchData() {
    setStatus('データを取得中...', 'loading');
    // fetchAllBtn.disabled = true;
    // fetchApiBtn.disabled = true;
    // fetchBtn.disabled = true;
    // fetchPuppeteerBtn.disabled = true;

    try {
        const response = await fetch('/api/fetch');
        const result = await response.json();

        if (result.success) {
            allData = result.data;
            setStatus(`データ取得完了: ${allData.length}件`, 'success');
            applyFilters();
        } else {
            setStatus(`エラー: ${result.error}`, 'error');
        }
    } catch (error) {
        setStatus(`エラー: ${error.message}`, 'error');
        console.error('データ取得エラー:', error);
    } finally {
        // fetchAllBtn.disabled = false;
        // fetchApiBtn.disabled = false;
        // fetchBtn.disabled = false;
        // fetchPuppeteerBtn.disabled = false;
    }
}

// データ取得（Puppeteer）
async function fetchDataWithPuppeteer() {
    setStatus('データを取得中（Puppeteer）...', 'loading');
    // fetchAllBtn.disabled = true;
    // fetchApiBtn.disabled = true;
    // fetchBtn.disabled = true;
    // fetchPuppeteerBtn.disabled = true;

    try {
        const response = await fetch('/api/fetch-puppeteer');
        const result = await response.json();

        if (result.success) {
            allData = result.data;
            setStatus(`データ取得完了: ${allData.length}件`, 'success');
            applyFilters();
        } else {
            setStatus(`エラー: ${result.error}`, 'error');
        }
    } catch (error) {
        setStatus(`エラー: ${error.message}`, 'error');
        console.error('データ取得エラー:', error);
    } finally {
        // fetchAllBtn.disabled = false;
        // fetchApiBtn.disabled = false;
        // fetchBtn.disabled = false;
        // fetchPuppeteerBtn.disabled = false;
    }
}

// 保存済みデータを読み込み
async function loadData() {
    setStatus('データを読み込み中...', 'loading');
    loadBtn.disabled = true;

    try {
        const response = await fetch('data.json');
        const data = await response.json();

        if (data && Array.isArray(data)) {
            allData = data;
            
            setStatus(`データ読み込み完了: ${allData.length}件`, 'success');
            applyFilters();
            // 更新日時を更新
            await updateDataTimestamp();
            // 初期ロード完了
            isInitialLoad = false;
        } else {
            setStatus(`エラー: ${result.error}`, 'error');
        }
    } catch (error) {
        setStatus(`エラー: ${error.message}`, 'error');
        console.error('データ読み込みエラー:', error);
    } finally {
        loadBtn.disabled = false;
    }
}

// 特別カテゴリキーワードマッピング（ジブリのみ）
const specialCategoryKeywords = {
    'ghibli': ['ジブリ', 'スタジオジブリ', 'ghibli', 'studio ghibli']
};

// 検索クエリが特別カテゴリにマッチするかチェック
function checkSpecialCategoryKeyword(query) {
    const lowerQuery = query.toLowerCase().trim();
    for (const [category, keywords] of Object.entries(specialCategoryKeywords)) {
        for (const keyword of keywords) {
            if (lowerQuery === keyword.toLowerCase()) {
                return category;
            }
        }
    }
    return null;
}

// 検索機能の初期化
function initSearch() {
    let searchTimeout;
    
    // 検索ボックスの入力イベント
    searchBox.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        // クリアボタンの表示/非表示
        clearSearchBtn.style.display = query ? 'flex' : 'none';
        
        // デバウンス処理（300ms待機）
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchQuery = query;
            applyFilters();
        }, 300);
    });
    
    // クリアボタンのクリックイベント
    clearSearchBtn.addEventListener('click', () => {
        searchBox.value = '';
        clearSearchBtn.style.display = 'none';
        searchQuery = '';
        applyFilters();
    });
}

// 検索フィルター適用
function searchInResults(results, query) {
    if (!query) return results;
    
    const searchText = query.toLowerCase();
    
    // 特別カテゴリキーワードをチェック
    const specialCategory = checkSpecialCategoryKeyword(query);
    
    if (specialCategory && SPECIAL_CATEGORIES[specialCategory]) {
        // 特別カテゴリにマッチした場合、該当カテゴリの作品のみを返す
        const categoryData = SPECIAL_CATEGORIES[specialCategory];
        const normalizedMovies = new Set(categoryData.movies.map(normalizeTitle));
        return results.filter(item => 
            normalizedMovies.has(normalizeTitle(item.title))
        );
    }
    
    // 通常の検索
    return results.filter(item => {
        // タイトル（英語）で検索
        if (item.title && item.title.toLowerCase().includes(searchText)) {
            return true;
        }
        
        // タイトル（日本語）で検索
        if (item.titleJa && item.titleJa.includes(searchText)) {
            return true;
        }
        
        // 概要（英語）で検索
        if (item.synopsis && item.synopsis.toLowerCase().includes(searchText)) {
            return true;
        }
        
        // 概要（日本語）で検索
        if (item.synopsisJa && item.synopsisJa.includes(searchText)) {
            return true;
        }
        
        // 概要（完全版、日本語）で検索
        if (item.synopsisJaFull && item.synopsisJaFull.includes(searchText)) {
            return true;
        }
        
        return false;
    });
}

// フィルター適用
function applyFilters() {
    // 年フィルターの遅延初期化（初回のみ）
    if (!yearFiltersInitialized && allData && allData.length > 0) {
        initializeYearFilters();
        yearFiltersInitialized = true;
    }
    
    // 特別カテゴリフィルター（URLパラメータから取得）
    const params = new URLSearchParams(window.location.search);
    const specialCategory = params.get('special');
    
    // 特別カテゴリが指定されている場合は、そのカテゴリの作品でベースデータを作成
    let baseData = allData;
    if (specialCategory && SPECIAL_CATEGORIES[specialCategory]) {
        const categoryData = SPECIAL_CATEGORIES[specialCategory];
        const normalizedMovies = new Set(categoryData.movies.map(normalizeTitle));
        baseData = allData.filter(item => 
            normalizedMovies.has(normalizeTitle(item.title))
        );
    }
    
    const selectedCountries = Array.from(countryCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    if (selectedCountries.length === 0) {
        resultsDiv.innerHTML = '<div class="empty-state"><h3>国を選択してください</h3></div>';
        resultCountSpan.textContent = '0';
        // URLパラメータを保存
        if (!isInitialLoad) {
            saveFiltersToURL();
        }
        return;
    }

    // カテゴリフィルターを取得
    const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
    const selectedCategories = Array.from(categoryCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    // カテゴリが1つも選択されていない場合
    if (selectedCategories.length === 0) {
        resultsDiv.innerHTML = '<div class="empty-state"><h3>カテゴリを選択してください</h3></div>';
        resultCountSpan.textContent = '0';
        // URLパラメータを保存
        if (!isInitialLoad) {
            saveFiltersToURL();
        }
        return;
    }

    // 年フィルターを取得
    const startYearSelect = document.getElementById('startYearSelect');
    const endYearSelect = document.getElementById('endYearSelect');
    const startYear = startYearSelect ? parseInt(startYearSelect.value) : 1966;
    const endYear = endYearSelect ? parseInt(endYearSelect.value) : 2025;

    // 各選択された国に一致する作品を抽出（重複なし）
    const filteredResults = [];
    const seenIds = new Set();

    baseData.forEach(item => {
        // カテゴリフィルター
        if (!selectedCategories.includes(item.category)) {
            return;
        }

        // 年フィルター
        const itemYear = parseInt(item.year);
        if (!isNaN(itemYear) && itemYear > 0) {
            if (itemYear < startYear || itemYear > endYear) {
                return;
            }
        }
        
        // 国情報が配列の場合
        if (Array.isArray(item.countries)) {
            const hasSelectedCountry = item.countries.some(c => 
                selectedCountries.includes(c.code)
            );
            
            if (hasSelectedCountry && !seenIds.has(item.id)) {
                seenIds.add(item.id);
                filteredResults.push(item);
            }
        }
        // 国情報が文字列の場合
        else if (typeof item.countries === 'string') {
            const hasSelectedCountry = selectedCountries.some(code => 
                item.countries.includes(code)
            );
            
            if (hasSelectedCountry && !seenIds.has(item.id)) {
                seenIds.add(item.id);
                filteredResults.push(item);
            }
        }
    });

    // 検索フィルターを適用（最後に実行）
    const searchedResults = searchInResults(filteredResults, searchQuery);

    displayResults(searchedResults);
    resultCountSpan.textContent = searchedResults.length;
    
    // URLパラメータを保存
    if (!isInitialLoad) {
        saveFiltersToURL();
    }
}

// 作品の一意なIDを生成（永続性を考慮）
function generateWorkId(item, allItems = []) {
    // 1. 履歴から既存IDを確認
    const existingId = WorkIdHistory.getId(item);
    if (existingId) {
        // 既存IDがあれば、衝突チェックのみ実施
        const isUnique = !allItems.some(other => 
            other !== item && other._workId === existingId
        );
        if (isUnique) {
            return existingId; // 既存IDをそのまま使用
        }
    }
    
    // 2. 新規ID生成
    const titleSlug = item.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');
    
    const genreMap = {
        'movie': 'movie',
        'film': 'movie',
        'series': 'tv',
        'tv': 'tv',
        'documentary': 'movie',
        'short': 'movie'
    };
    const genre = genreMap[item.type?.toLowerCase()] || 'movie';
    
    const isAnime = item.category?.includes('アニメ');
    const mediaType = isAnime ? 'anime' : 'live';
    
    const year = item.year || 'unknown';
    
    const baseId = `${titleSlug}-${genre}-${mediaType}-${year}`;
    
    // 3. 衝突チェックとsuffix付与
    let finalId = baseId;
    let suffix = 0;
    const suffixes = 'abcdefghijklmnopqrstuvwxyz';
    
    while (allItems.some(other => {
        const otherId = other._workId || WorkIdHistory.getId(other) || '';
        return otherId === finalId && other !== item;
    })) {
        if (suffix < suffixes.length) {
            finalId = `${baseId}-${suffixes[suffix]}`;
        } else {
            finalId = `${baseId}-${suffix}`;
        }
        suffix++;
    }
    
    // 4. 履歴に保存
    WorkIdHistory.setId(item, finalId);
    
    return finalId;
}

// タイプと年を日本語に変換
function formatTypeAndYear(item) {
    const typeMap = {
        'movie': '映画',
        'series': 'TVシリーズ',
        'tv': 'TVシリーズ',
        'film': '映画',
        'documentary': 'ドキュメンタリー',
        'short': '短編'
    };
    
    const type = typeMap[item.type?.toLowerCase()] || item.type || '不明';
    const year = item.year || '年不明';
    
    return `${type} / ${year}年`;
}

// meta タグを更新または作成
function setMetaTag(property, content) {
    // og:* の場合
    let meta = document.querySelector(`meta[property="${property}"]`);
    if (!meta) {
        // twitter:* や name属性の場合
        meta = document.querySelector(`meta[name="${property}"]`);
    }
    
    if (meta) {
        meta.setAttribute('content', content);
    } else {
        // 存在しない場合は新規作成
        meta = document.createElement('meta');
        if (property.startsWith('og:')) {
            meta.setAttribute('property', property);
        } else {
            meta.setAttribute('name', property);
        }
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
    }
}

// OGP等のmeta情報を更新
function updateMetaTags(item) {
    const displayTitle = item.titleJa 
        ? `${item.title} (${item.titleJa})` 
        : item.title;
    
    const description = (item.synopsisJa || item.synopsisJaFull || item.synopsis || '概要はありません。')
        .substring(0, 150) + '...';
    
    const imageUrl = item.imageUrl || 'https://via.placeholder.com/600x900';
    
    // タイトル
    document.title = `${displayTitle} | hide.me無料ユーザ向けNetflix作品リスト`;
    
    // OGP
    setMetaTag('og:title', displayTitle);
    setMetaTag('og:description', description);
    setMetaTag('og:image', imageUrl);
    setMetaTag('og:url', window.location.href);
    
    // Twitter Card
    setMetaTag('twitter:title', displayTitle);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', imageUrl);
}

// Meta情報をデフォルトに戻す
// 特別カテゴリ用のMeta情報を更新
function updateMetaTagsForSpecialCategory(specialKey) {
    const category = SPECIAL_CATEGORIES[specialKey];
    if (!category) return;
    
    // タイトル生成
    let displayTitle;
    if (specialKey === 'ghibli') {
        displayTitle = 'スタジオジブリ作品(映画)';
    } else {
        displayTitle = `${category.name}(映画)`;
    }
    
    const description = `${displayTitle}の一覧です。Netflixで視聴可能な作品を配信国別に検索できます。`;
    const fullTitle = `${displayTitle} | hide.me無料ユーザ向けNetflix作品リスト`;
    
    // タイトル
    document.title = fullTitle;
    
    // OGP
    setMetaTag('og:title', displayTitle);
    setMetaTag('og:description', description);
    setMetaTag('og:url', window.location.href);
    setMetaTag('og:image', '');
    
    // Twitter Card
    setMetaTag('twitter:title', displayTitle);
    setMetaTag('twitter:description', description);
}

function resetMetaTags() {
    document.title = 'hide.me無料ユーザ向けNetflix作品リスト';
    setMetaTag('og:title', 'hide.me無料ユーザ向けNetflix作品リスト');
    setMetaTag('og:description', 'Netflixの配信作品を国別に検索できるツール。hide.me(無料版)とuNoGSで視聴可能な7ヵ国の作品情報を提供しています。');
    setMetaTag('og:image', 'https://tomumuz.github.io/hideme/hideme-ogp.png');
    setMetaTag('og:url', window.location.origin + window.location.pathname);
    setMetaTag('twitter:title', 'hide.me無料ユーザ向けNetflix作品リスト');
    setMetaTag('twitter:description', 'Netflixの配信作品を国別に検索できるツール。hide.me(無料版)とuNoGSで視聴可能な7ヵ国の作品情報を提供しています。');
    setMetaTag('twitter:image', 'https://tomumuz.github.io/hideme/hideme-ogp.png');
}

// モーダル表示
function showModal(item) {
    const modal = document.getElementById('detailModal');
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('modalTitle');
    const modalType = document.getElementById('modalType');
    const modalRating = document.getElementById('modalRating');
    const modalCountries = document.getElementById('modalCountries');
    const modalSynopsis = document.getElementById('modalSynopsis');
    
    // 画像（遅延読み込み）
    const defaultImageUrl = 'https://via.placeholder.com/600x900/1a1a1a/ffffff?text=画像なし';
    const imageUrl = item.imageUrl || defaultImageUrl;
    const fallbackImageUrl = `https://via.placeholder.com/600x900/667eea/ffffff?text=${encodeURIComponent(item.englishTitle || item.title).substring(0, 30).replace(/%20/g, '+')}`;
    
    // まずローディング画像を表示（即座にモーダルを表示）
    modalImage.src = 'https://via.placeholder.com/600x900/f0f0f0/999999?text=Loading...';
    modalImage.style.opacity = '0.5';
    
    // 実際の画像を遅延読み込み
    const img = new Image();
    img.onload = function() {
        modalImage.src = imageUrl;
        modalImage.style.opacity = '1';
    };
    img.onerror = function() {
        modalImage.src = fallbackImageUrl;
        modalImage.style.opacity = '1';
    };
    img.src = imageUrl;
    // タイトル表示（英語（日本語）形式）
    let displayTitle = item.title;
    if (item.titleJa && item.titleJa !== item.title) {
        // タイトルから日本語部分を削除して英語部分のみを取得
        const englishOnly = item.title.replace(/\s*\([^\)]*[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf][^\)]*\)\s*$/, '').trim();
        displayTitle = `${englishOnly} (${item.titleJa})`;
    }
    modalImage.alt = displayTitle;
    
    // タイトル
    modalTitle.textContent = displayTitle;
    
    // タイプと年
    modalType.textContent = formatTypeAndYear(item);
    
    // 評価
    modalRating.textContent = item.rating ? `⭐ ${item.rating}` : '';
    
    // 国
    const countriesHtml = item.countries && item.countries.length > 0
        ? item.countries.map(c => 
            `<span class="country-badge">${c.name || COUNTRY_NAMES[c.code] || c.code}</span>`
        ).join('')
        : `<span class="country-badge">${item.filterCountryName || '不明'}</span>`;
    modalCountries.innerHTML = countriesHtml;
    
    // 概要（全文）- 日本語概要を優先的に表示
    const synopsis = item.synopsisJa || item.synopsisJaFull || item.synopsis || item.synopsisJapanese || '概要はありません。';
    modalSynopsis.textContent = synopsis;
    
    // IDを生成（まだ生成されていない場合のみ）
    if (!item._workId) {
        item._workId = generateWorkId(item, allData);
    }
    
    // URLにworkパラメータを追加
    const workId = item._workId;
    if (workId) {
        const url = new URL(window.location.href);
        url.searchParams.set('work', workId);
        
        // meta情報も更新
        updateMetaTags(item);
        
        window.history.pushState({ workId }, '', url.toString());
    }
    
    // モーダルを表示
    modal.style.display = 'block';
}

// モーダルを閉じる
function closeModal() {
    const modal = document.getElementById('detailModal');
    modal.style.display = 'none';
    
    // URLからworkパラメータを削除
    const url = new URL(window.location.href);
    url.searchParams.delete('work');
    
    // meta情報をデフォルトに戻す
    resetMetaTags();
    
    window.history.pushState({}, '', url.toString());
}

// 作品が見つからないモーダルを表示
function showNotFoundModal(workId) {
    const modal = document.getElementById('notFoundModal');
    modal.style.display = 'block';
    
    // meta情報を更新
    document.title = '作品が見つかりません | hide.me無料ユーザ向けNetflix作品リスト';
    setMetaTag('og:title', '作品が見つかりません | hide.me無料ユーザ向けNetflix作品リスト');
    setMetaTag('og:description', 'この作品は現在uNoGS上に存在しません。配信状況の変更や一時的な消失の可能性があります。');
}

// 作品が見つからないモーダルを閉じる
function closeNotFoundModal() {
    const modal = document.getElementById('notFoundModal');
    modal.style.display = 'none';
    
    // URLからworkパラメータを削除
    const url = new URL(window.location.href);
    url.searchParams.delete('work');
    window.history.pushState({}, '', url.toString());
    
    // meta情報をリセット
    resetMetaTags();
}

// トースト通知を表示
function showToast(message) {
    const toast = document.getElementById('copyToast');
    toast.textContent = message;
    toast.classList.add('show');
    
    // 2秒後に非表示
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// 現在のURLをコピー
async function copyCurrentUrl() {
    const url = window.location.href;
    
    try {
        await navigator.clipboard.writeText(url);
        showToast('URLをコピーしました');
    } catch (err) {
        console.error('コピーに失敗:', err);
        // フォールバック
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('URLをコピーしました');
    }
}

// シェアボタンのクリックハンドラ
async function shareWork() {
    // SNSシェア用の個別HTMLファイルURLを生成
    const params = new URLSearchParams(window.location.search);
    const workId = params.get('work');
    
    if (workId) {
        // GitHub Pages用の固定ベースURL
        const baseUrl = 'https://tomumuz.github.io/hideme';
        const shareUrl = `${baseUrl}/works/${workId}.html`;
        
        try {
            await navigator.clipboard.writeText(shareUrl);
            showToast('URLをコピーしました');
        } catch (err) {
            console.error('コピーに失敗:', err);
            // フォールバック
            const textarea = document.createElement('textarea');
            textarea.value = shareUrl;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('URLをコピーしました');
        }
    } else {
        // workIdがない場合は通常のURLをコピー
        await copyCurrentUrl();
    }
}

// 結果を表示
function displayResults(results) {
    if (results.length === 0) {
        resultsDiv.innerHTML = '<div class="empty-state"><h3>該当する作品が見つかりませんでした</h3><p>フィルター条件を変更してください</p></div>';
        return;
    }

    // ジブリ映画のリスト
    const ghibliMovies = [
        'Spirited Away',
        'Princess Mononoke',
        'Howl\'s Moving Castle',
        'My Neighbor Totoro',
        'Kiki\'s Delivery Service',
        'Ponyo',
        'The Wind Rises',
        'Nausicaä of the Valley of the Wind',
        'Castle in the Sky',
        'Grave of the Fireflies',
        'The Secret World of Arrietty',
        'When Marnie Was There',
        'Whisper of the Heart',
        'From Up on Poppy Hill',
        'My Neighbors the Yamadas',
        'Ocean Waves',
        'Tales from Earthsea',
        'The Cat Returns',
        'Kaguyahime no monogatari'
    ];

    // ソート: ジブリ映画 → 評価順 → 年順
    results.sort((a, b) => {
        const aIsGhibli = ghibliMovies.includes(a.title);
        const bIsGhibli = ghibliMovies.includes(b.title);
        
        if (aIsGhibli && !bIsGhibli) return -1;
        if (!aIsGhibli && bIsGhibli) return 1;
        
        // 両方ジブリの場合は、リストの順番で
        if (aIsGhibli && bIsGhibli) {
            return ghibliMovies.indexOf(a.title) - ghibliMovies.indexOf(b.title);
        }
        
        // それ以外は評価順、次に年順
        if (a.rating && b.rating) {
            const ratingDiff = parseFloat(b.rating) - parseFloat(a.rating);
            if (ratingDiff !== 0) return ratingDiff;
        } else if (a.rating) {
            return -1;
        } else if (b.rating) {
            return 1;
        }
        
        return (b.year || 0) - (a.year || 0);
    });

    // 評価順に並び替え（評価が高い順）
    const sortedResults = [...results].sort((a, b) => {
        const ratingA = parseFloat(a.rating) || 0;
        const ratingB = parseFloat(b.rating) || 0;
        if (ratingB !== ratingA) {
            return ratingB - ratingA; // 評価降順
        }
        // 評価が同じ場合は年順（新しい順）
        const yearA = parseInt(a.year) || 0;
        const yearB = parseInt(b.year) || 0;
        return yearB - yearA;
    });

    // 画面幅から推測される列数を計算（グリッドの minmax(200px, 1fr) に基づく）
    const estimateColumnsCount = () => {
        const containerWidth = resultsDiv.clientWidth || 1400; // デフォルト幅
        const minCardWidth = 200; // CSSのminmax値
        const gap = 25; // gap値
        const maxColumns = Math.floor((containerWidth + gap) / (minCardWidth + gap));
        return Math.max(1, Math.min(maxColumns, 5)); // 1〜5列の範囲で制限
    };

    const estimatedColumns = estimateColumnsCount();
    
    // 各カードにHTMLを生成（グリッドレイアウトを使用）
    resultsDiv.innerHTML = sortedResults.map((item, index) => {
        // 行番号を計算（推測値）
        const rowNumber = Math.floor(index / estimatedColumns) + 1;
        const isFirstInRow = index % estimatedColumns === 0;
        
        // 画像URLがない場合は、デフォルトのNetflix画像パターンを使用
        const defaultImageUrl = 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=画像なし';
        const imageUrl = item.imageUrl || defaultImageUrl;
        
        // 画像URLが無効な場合は、タイトルから検索用のプレースホルダーを生成
        const fallbackImageUrl = `https://via.placeholder.com/300x450/667eea/ffffff?text=${encodeURIComponent(item.englishTitle || item.title).substring(0, 30).replace(/%20/g, '+')}`;
        
        const imageHtml = `<img src="${imageUrl}" alt="${item.title}" onerror="this.onerror=null; this.src='${fallbackImageUrl}';">`;

        const countriesHtml = item.countries && item.countries.length > 0
            ? item.countries.map(c => 
                `<span class="country-badge">${c.name || COUNTRY_NAMES[c.code] || c.code}</span>`
            ).join('')
            : `<span class="country-badge">${item.filterCountryName || '不明'}</span>`;

        const typeAndYear = formatTypeAndYear(item);
        
        const ratingHtml = item.rating 
            ? `<div class="result-rating">⭐ ${item.rating}</div>` 
            : '';

        // 概要を表示（日本語概要を優先）
        const originalSynopsis = item.synopsisJa || item.synopsis || '';
        let displaySynopsis = '';
        
        // 日本語文字を含むかチェック
        const hasJapaneseChar = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(originalSynopsis);
        
        if (hasJapaneseChar) {
            // 日本語の場合：11文字×2行 = 22文字
            if (originalSynopsis.length > 21) {
                displaySynopsis = originalSynopsis.substring(0, 21) + '…';
            } else {
                displaySynopsis = originalSynopsis;
            }
            // 11文字で改行
            if (displaySynopsis.length > 11) {
                const line1 = displaySynopsis.substring(0, 11);
                const line2 = displaySynopsis.substring(11);
                displaySynopsis = line1 + '\n' + line2;
            }
        } else {
            // 英語の場合：26文字×2行 = 52文字
            if (originalSynopsis.length > 52) {
                displaySynopsis = originalSynopsis.substring(0, 49) + '...';
            } else {
                displaySynopsis = originalSynopsis;
            }
            // 26文字で改行
            if (displaySynopsis.length > 26) {
                const line1 = displaySynopsis.substring(0, 26);
                const line2 = displaySynopsis.substring(26);
                displaySynopsis = line1 + '\n' + line2;
            }
        }
        
        const synopsisHtml = originalSynopsis ? 
            `<div class="result-synopsis">${escapeHtml(displaySynopsis)}</div>` : '';
        
        // タイトル表示（英語（日本語）形式）
        let displayTitle = item.title;
        if (item.titleJa && item.titleJa !== item.title) {
            // タイトルから日本語部分を削除して英語部分のみを取得
            const englishOnly = item.title.replace(/\s*\([^\)]*[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf][^\)]*\)\s*$/, '').trim();
            // 日本語タイトルがある場合は「英語（日本語）」形式
            displayTitle = `${englishOnly} (${item.titleJa})`;
        }
        
        // 行番号のHTML（最初のカードだけに表示）
        const rowNumberHtml = isFirstInRow 
            ? `<div class="row-number-label" style="position: absolute; left: -40px; top: 0; bottom: 0; width: 30px; font-size: 11px; font-weight: 600; color: #999; display: flex; align-items: center; justify-content: center; background: #f8f9fa; border-radius: 3px;">${rowNumber}</div>`
            : '';
        
        return `
            <div class="result-card-wrapper" style="position: relative;">
                ${rowNumberHtml}
                <div class="result-card" data-index="${index}">
                    <div class="result-image">
                        ${imageHtml}
                    </div>
                    <div class="result-info">
                        <div class="result-title">${escapeHtml(displayTitle)}</div>
                        <div class="result-meta">${typeAndYear}</div>
                        ${ratingHtml}
                        ${synopsisHtml}
                        <div class="result-countries">
                            ${countriesHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // カードにクリックイベントを追加
    document.querySelectorAll('.result-card').forEach((card, index) => {
        card.addEventListener('click', () => {
            showModal(sortedResults[index]);
        });
    });
}

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// データをダウンロード
// downloadData関数（使用しない - コメントアウト）
/*
function downloadData() {
    if (allData.length === 0) {
        alert('ダウンロードするデータがありません。まずデータを取得または読み込んでください。');
        return;
    }
    
    // 選択されている国でフィルタリング
    const selectedCountries = Array.from(countryCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    
    let dataToDownload = allData;
    
    if (selectedCountries.length > 0) {
        dataToDownload = [];
        selectedCountries.forEach(countryCode => {
            const countryData = allData.filter(item => {
                if (Array.isArray(item.countries)) {
                    return item.countries.some(c => c.code === countryCode);
                }
                return false;
            });
            
            countryData.forEach(item => {
                if (!dataToDownload.find(r => r.id === item.id)) {
                    dataToDownload.push(item);
                }
            });
        });
    }
    
    // JSONファイルとしてダウンロード
    const dataStr = JSON.stringify(dataToDownload, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `unogs-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setStatus(`${dataToDownload.length}件のデータをダウンロードしました`, 'success');
}
*/

// 全て選択
function selectAllCountries() {
    countryCheckboxes.forEach(cb => {
        cb.checked = true;
    });
    applyFilters();
}

// 全て解除
function deselectAllCountries() {
    countryCheckboxes.forEach(cb => {
        cb.checked = false;
    });
    applyFilters();
}

// イベントリスナー
extractHtmlBtn.addEventListener('click', extractFromHTML);
// fetchAllBtn.addEventListener('click', fetchAllDataFromAPI);
// fetchApiBtn.addEventListener('click', fetchDataFromAPI);
// fetchBtn.addEventListener('click', fetchData);
// fetchPuppeteerBtn.addEventListener('click', fetchDataWithPuppeteer);
loadBtn.addEventListener('click', loadData);
// downloadBtn.addEventListener('click', downloadData);

// 全て選択/解除のチェックボックス
selectAllCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
        deselectAllCheckbox.checked = false;
        selectAllCountries();
        // 特別カテゴリパラメータをリセット
        resetSpecialCategory();
    }
});

deselectAllCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
        selectAllCheckbox.checked = false;
        deselectAllCountries();
        // 特別カテゴリパラメータをリセット
        resetSpecialCategory();
    }
});

// 国のチェックボックス
countryCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        // 全て選択されているかチェック
        const allChecked = Array.from(countryCheckboxes).every(cb => cb.checked);
        const noneChecked = Array.from(countryCheckboxes).every(cb => !cb.checked);
        
        selectAllCheckbox.checked = allChecked;
        deselectAllCheckbox.checked = noneChecked;
        
        applyFilters();
    });
});

// カテゴリフィルターの全選択/全解除
const selectAllCategoriesCheckbox = document.getElementById('selectAllCategories');
const deselectAllCategoriesCheckbox = document.getElementById('deselectAllCategories');

if (selectAllCategoriesCheckbox) {
    selectAllCategoriesCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            deselectAllCategoriesCheckbox.checked = false;
            const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
            categoryCheckboxes.forEach(cb => cb.checked = true);
            // 特別カテゴリパラメータをリセット
            resetSpecialCategory();
            applyFilters();
        }
    });
}

if (deselectAllCategoriesCheckbox) {
    deselectAllCategoriesCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            selectAllCategoriesCheckbox.checked = false;
            const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
            categoryCheckboxes.forEach(cb => cb.checked = false);
            // 特別カテゴリパラメータをリセット
            resetSpecialCategory();
            applyFilters();
        }
    });
}

// カテゴリのチェックボックス
document.querySelectorAll('.category-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
        const allChecked = Array.from(categoryCheckboxes).every(cb => cb.checked);
        const noneChecked = Array.from(categoryCheckboxes).every(cb => !cb.checked);
        
        if (selectAllCategoriesCheckbox) selectAllCategoriesCheckbox.checked = allChecked;
        if (deselectAllCategoriesCheckbox) deselectAllCategoriesCheckbox.checked = noneChecked;
        
        // 特別カテゴリパラメータをリセット
        resetSpecialCategory();
        applyFilters();
    });
});

// 年フィルター用のプルダウンを初期化
function initializeYearFilters() {
    if (!allData || allData.length === 0) return;
    
    // 7ヶ国でフィルタされた作品の年を抽出
    const TARGET_COUNTRY_CODES = ['US', 'NL', 'CH', 'DE', 'FI', 'FR', 'GB'];
    const filteredWorks = allData.filter(work => {
        if (!work.countries || !Array.isArray(work.countries)) return false;
        return work.countries.some(country => {
            if (typeof country === 'object' && country.code) {
                return TARGET_COUNTRY_CODES.includes(country.code);
            }
            return false;
        });
    });
    
    const years = filteredWorks
        .map(w => parseInt(w.year))
        .filter(y => !isNaN(y) && y > 0);
    
    if (years.length === 0) return;
    
    const uniqueYears = [...new Set(years)].sort((a, b) => a - b);
    const minYear = Math.min(...uniqueYears);
    const maxYear = Math.max(...uniqueYears);
    
    const startYearSelect = document.getElementById('startYearSelect');
    const endYearSelect = document.getElementById('endYearSelect');
    
    if (!startYearSelect || !endYearSelect) return;
    
    // 開始年のプルダウンを生成
    startYearSelect.innerHTML = '';
    uniqueYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year + '年';
        if (year === minYear) option.selected = true;
        startYearSelect.appendChild(option);
    });
    
    // 終了年のプルダウンを生成
    endYearSelect.innerHTML = '';
    uniqueYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year + '年';
        if (year === maxYear) option.selected = true;
        endYearSelect.appendChild(option);
    });
    
    // イベントリスナーを追加
    startYearSelect.addEventListener('change', () => {
        const startYear = parseInt(startYearSelect.value);
        const endYear = parseInt(endYearSelect.value);
        
        // 開始年が終了年より新しい場合、終了年を開始年と同じにする
        if (startYear > endYear) {
            endYearSelect.value = startYear;
        }
        
        applyFilters();
    });
    
    endYearSelect.addEventListener('change', () => {
        const startYear = parseInt(startYearSelect.value);
        const endYear = parseInt(endYearSelect.value);
        
        // 終了年が開始年より古い場合、開始年を終了年と同じにする
        if (endYear < startYear) {
            startYearSelect.value = endYear;
        }
        
        applyFilters();
    });
}

// タイトルを正規化（検索用）
function normalizeTitle(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')  // 英数字と空白以外を削除（ハイフンも削除）
        .replace(/\s+/g, ' ')      // 連続空白を1つに
        .trim();
}

// workIdから作品情報を抽出
function parseWorkId(workId) {
    // 形式: {title-slug}-{genre}-{type}-{year}[-suffix]
    // 例: her-blue-sky-movie-anime-2019
    const parts = workId.split('-');
    
    if (parts.length < 4) return null;
    
    // 最後から年、タイプ、ジャンルを取得
    const year = parts[parts.length - 1];
    const mediaType = parts[parts.length - 2];
    const genre = parts[parts.length - 3];
    
    // suffixがある場合（-a, -b, -c など）
    const hasSuffix = year.length === 1 && /[a-z]/.test(year);
    const actualYear = hasSuffix ? parts[parts.length - 2] : year;
    const actualMediaType = hasSuffix ? parts[parts.length - 3] : mediaType;
    const actualGenre = hasSuffix ? parts[parts.length - 4] : genre;
    
    // タイトル部分を抽出（genre/type/yearを除く）
    const suffixOffset = hasSuffix ? 1 : 0;
    const titleParts = parts.slice(0, -(3 + suffixOffset));
    const titleSlug = titleParts.join('-');
    
    return {
        titleSlug: titleSlug,
        year: actualYear,
        mediaType: actualMediaType,
        genre: actualGenre
    };
}

// URLパラメータから作品を読み込み（最適化版）
function initializeFromURL() {
    const params = new URLSearchParams(window.location.search);
    const workId = params.get('work');
    
    if (workId && allData && allData.length > 0) {
        console.log('URLから直接アクセス: 作品を検索中...');
        
        // workIdをパースして作品情報を抽出
        const parsed = parseWorkId(workId);
        
        if (parsed) {
            // タイトルスラッグを正規化（ハイフンをスペースに変換して正規化）
            const normalizedSearchTitle = normalizeTitle(parsed.titleSlug.replace(/-/g, ' '));
            
            // 該当する作品を検索（年、タイプ、ジャンルで絞り込み）
            const candidates = allData.filter(item => {
                const itemYear = item.year || 'unknown';
                const itemGenre = (item.type === 'series' || item.type === 'tv') ? 'tv' : 'movie';
                const itemMediaType = item.category?.includes('アニメ') ? 'anime' : 'live';
                
                return itemYear === parsed.year && 
                       itemGenre === parsed.genre && 
                       itemMediaType === parsed.mediaType;
            });
            
            console.log(`✓ ${candidates.length}件の候補作品が見つかりました`);
            
            // 候補作品のIDを生成して一致するものを探す
            // さらに、タイトルの正規化比較でも候補を絞り込む
            let foundItem = null;
            for (const item of candidates) {
                if (!item._workId) {
                    item._workId = generateWorkId(item, allData);
                }
                
                // 完全一致を優先
                if (item._workId === workId) {
                    foundItem = item;
                    break;
                }
                
                // タイトルの正規化比較でも確認（フォールバック）
                const normalizedItemTitle = normalizeTitle(item.title);
                if (normalizedItemTitle === normalizedSearchTitle) {
                    foundItem = item;
                    // 完全一致の可能性があるので継続
                }
            }
            
            if (foundItem) {
                console.log('✓ 作品が見つかりました:', foundItem.title);
                showModal(foundItem);
            } else {
                console.log('✗ 作品が見つかりませんでした');
                showNotFoundModal(workId);
            }
        } else {
            console.log('✗ workIdのパースに失敗しました');
            showNotFoundModal(workId);
        }
    }
}

// ページ読み込み時に保存済みデータを自動読み込み
window.addEventListener('DOMContentLoaded', async () => {
    // URLパラメータからフィルター状態を復元
    loadFiltersFromURL();
    
    // 検索機能の初期化
    initSearch();
    
    // データを読み込み
    await loadData();
    
    // URLパラメータから作品を読み込み
    initializeFromURL();
    
    // モーダルのクローズボタン
    const modal = document.getElementById('detailModal');
    const closeBtn = document.querySelector('.modal-close');
    
    closeBtn.addEventListener('click', closeModal);
    
    // モーダルの外側をクリックしたら閉じる
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
        
        // 作品が見つからないモーダルも閉じる
        const notFoundModal = document.getElementById('notFoundModal');
        if (event.target === notFoundModal) {
            closeNotFoundModal();
        }
    });
    
    // ESCキーでモーダルを閉じる
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeModal();
            closeNotFoundModal();
        }
    });
    
    // ページ読み込み時に保存済みデータの有無をチェック
    checkSavedData();
});

// ブラウザの戻る/進むボタン対応
window.addEventListener('popstate', (event) => {
    const params = new URLSearchParams(window.location.search);
    const workId = params.get('work');
    
    if (workId && allData && allData.length > 0) {
        // まずworkIdIndexから検索
        let item = workIdIndex.get(workId);
        
        // 見つからなければ、逆引き検索
        if (!item) {
            const parsed = parseWorkId(workId);
            if (parsed) {
                const normalizedSearchTitle = normalizeTitle(parsed.titleSlug.replace(/-/g, ' '));
                
                const candidates = allData.filter(i => {
                    const itemYear = i.year || 'unknown';
                    const itemGenre = (i.type === 'series' || i.type === 'tv') ? 'tv' : 'movie';
                    const itemMediaType = i.category?.includes('アニメ') ? 'anime' : 'live';
                    return itemYear === parsed.year && 
                           itemGenre === parsed.genre && 
                           itemMediaType === parsed.mediaType;
                });
                
                for (const candidate of candidates) {
                    if (!candidate._workId) {
                        candidate._workId = generateWorkId(candidate, allData);
                    }
                    
                    // 完全一致を優先
                    if (candidate._workId === workId) {
                        item = candidate;
                        workIdIndex.set(workId, item);
                        break;
                    }
                    
                    // タイトルの正規化比較でも確認（フォールバック）
                    const normalizedItemTitle = normalizeTitle(candidate.title);
                    if (normalizedItemTitle === normalizedSearchTitle) {
                        item = candidate;
                        workIdIndex.set(workId, item);
                    }
                }
            }
        }
        
        if (item) {
            showModal(item);
        } else {
            showNotFoundModal(workId);
        }
    } else {
        // workパラメータがない場合、両方のモーダルを閉じる
        closeModal();
        closeNotFoundModal();
    }
});

// 保存済みデータの有無をチェックして、ボタンの表示を制御
async function checkSavedData() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        
        if (data && Array.isArray(data) && data.length > 0) {
            // データが存在する場合、「HTMLから抽出」ボタンを非表示
            extractHtmlBtn.style.display = 'none';
            loadBtn.style.display = 'inline-block';
        } else {
            // データが存在しない場合、「HTMLから抽出」ボタンを表示
            extractHtmlBtn.style.display = 'inline-block';
            loadBtn.style.display = 'none';
        }
        
        // ページ読み込み時に更新日時を表示
        await updateDataTimestamp();
    } catch (error) {
        // エラーの場合は両方表示
        console.error('データチェックエラー:', error);
        extractHtmlBtn.style.display = 'inline-block';
        loadBtn.style.display = 'inline-block';
        await updateDataTimestamp();
    }
}

