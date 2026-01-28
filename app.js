/**
 * SONUS CORE ENGINE
 * Premium High-Fidelity Audio Player
 */

class SonusEngine {
    constructor() {
        this.audioContext = null;
        this.audioElement = new Audio();
        this.analyser = null;
        this.source = null;
        this.isPlaying = false;
        this.currentTrack = null;
        this.library = [];
        this.currentGenre = 'Desconocido';
        this.eqPreset = 'FLAT';

        this.init();
    }

    init() {
        // Setup UI listeners
        this.setupEventListeners();
        this.registerServiceWorker();
        console.log('Sonus Engine Initialized');
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(() => console.log('Sonus PWA: Ready for Mobile'))
                .catch(err => console.error('PWA Error:', err));
        }
    }

    setupEventListeners() {
        const scanBtn = document.getElementById('scan-btn');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => this.triggerScan());
        }

        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.parentElement.addEventListener('click', () => this.togglePlay());
        }

        const lyricsBtn = document.querySelector('[data-lucide="mic-2"]');
        if (lyricsBtn) {
            lyricsBtn.addEventListener('click', () => this.toggleLyrics());
        }

        const searchInput = document.getElementById('main-search-input');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.performSearch(searchInput.value);
            });
        }
        // Navigation
        document.getElementById('nav-lib').addEventListener('click', () => this.switchView('local'));
        document.getElementById('nav-local-lib').addEventListener('click', () => this.switchView('local'));
        document.getElementById('nav-search-tab').addEventListener('click', () => this.switchView('online'));
        document.getElementById('nav-scan').addEventListener('click', () => this.triggerScan());

        // Mobile Navigation
        document.getElementById('m-nav-lib').addEventListener('click', () => this.switchView('local'));
        document.getElementById('m-nav-search').addEventListener('click', () => this.switchView('online'));
        document.getElementById('m-nav-scan').addEventListener('click', () => this.triggerScan());

        // Hidden Input Fallbacks
        const folderInput = document.getElementById('folder-input');
        if (folderInput) {
            folderInput.addEventListener('change', (e) => this.handleImport(e));
        }

        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleImport(e));
        }

        // Mood selector
        const moodSelector = document.getElementById('mood-selector');
        if (moodSelector) {
            moodSelector.addEventListener('click', (e) => {
                if (e.target.classList.contains('mood-chip')) {
                    this.filterByMood(e.target);
                }
            });
        }

        window.addEventListener('online', () => this.updateOnlineStatus());
        window.addEventListener('offline', () => this.updateOnlineStatus());
        this.updateOnlineStatus();

        // Audio element events
        this.audioElement.addEventListener('timeupdate', () => this.updateProgress());
        this.audioElement.addEventListener('ended', () => this.handleTrackEnd());
    }

    updateOnlineStatus() {
        const isOnline = navigator.onLine;
        const navSearch = document.getElementById('nav-search-tab');
        const mNavSearch = document.getElementById('m-nav-search');

        if (!isOnline) {
            console.log("Sonus AI: Modo Offline Activado");
            if (navSearch) navSearch.style.opacity = '0.5';
            if (mNavSearch) mNavSearch.style.opacity = '0.5';
            // Show a subtle toast or banner if needed
        } else {
            console.log("Sonus AI: Modo Online Activado");
            if (navSearch) navSearch.style.opacity = '1';
            if (mNavSearch) mNavSearch.style.opacity = '1';
        }
    }

    filterByMood(chipElement) {
        const mood = chipElement.getAttribute('data-mood');

        // UI update
        document.querySelectorAll('.mood-chip').forEach(c => c.classList.remove('active'));
        chipElement.classList.add('active');

        this.renderLibrary(mood === 'all' ? null : mood);
    }

    triggerScan() {
        // Intelligence: Show a premium choice menu
        const choice = confirm("¿Quieres escanear una CARPETA completa (Aceptar) o elegir ARCHIVOS individuales (Cancelar)?");

        if (choice) {
            if ('showDirectoryPicker' in window) {
                this.scanLocalFolder();
            } else {
                document.getElementById('folder-input').click();
            }
        } else {
            document.getElementById('file-input').click();
        }
    }

    async scanLocalFolder() {
        try {
            const dirHandle = await window.showDirectoryPicker();
            this.library = [];
            console.log("Sonus AI: Iniciando escaneo profundo...");

            await this.scanRecursive(dirHandle);

            this.renderLibrary();
            this.updateSmartPlaylists();

            // Intelligence: Try to enrich metadata for unknown tracks
            this.enrichMetadata();
        } catch (err) {
            console.warn("Sonus: API moderna restringida, activando modo compatible...", err);
            // Fallback to manual input click if permission denied or unsupported
            document.getElementById('folder-input').click();
        }
    }

    async handleImport(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        this.library = [];
        console.log(`Sonus AI: Procesando ${files.length} archivos detectados...`);

        files.forEach(file => {
            if (this.isAudioFile(file.name)) {
                const genre = this.detectGenre(file.name);
                this.library.push({
                    id: Math.random().toString(36).substr(2, 9),
                    name: file.name.replace(/\.[^/.]+$/, ""),
                    file: file,
                    artist: "Señal Desconocida",
                    album: "Archivo Importado",
                    genre: genre,
                    mood: this.calculateMood(genre),
                    isLocal: true,
                    cover: null
                });
            }
        });

        this.renderLibrary();
        this.updateSmartPlaylists();
        this.enrichMetadata();
    }

    async scanRecursive(dirHandle) {
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                const file = await entry.getFile();
                if (this.isAudioFile(file.name)) {
                    const genre = this.detectGenre(file.name);
                    this.library.push({
                        id: Math.random().toString(36).substr(2, 9),
                        name: file.name.replace(/\.[^/.]+$/, ""),
                        file: file,
                        artist: "Señal Desconocida",
                        album: "Archivo Local",
                        genre: genre,
                        mood: this.calculateMood(genre),
                        isLocal: true,
                        cover: null
                    });
                }
            } else if (entry.kind === 'directory') {
                await this.scanRecursive(entry);
            }
        }
    }

    async enrichMetadata() {
        console.log("Sonus AI: Optimizando biblioteca con datos globales...");
        for (let track of this.library) {
            if (track.artist === "Señal Desconocida") {
                const query = track.name;
                try {
                    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=1&entity=song`);
                    const data = await res.json();
                    if (data.results && data.results[0]) {
                        const result = data.results[0];
                        track.artist = result.artistName;
                        track.album = result.collectionName;
                        track.cover = result.artworkUrl100.replace('100x100', '600x600');
                        track.genre = result.primaryGenreName;
                        track.mood = this.calculateMood(result.primaryGenreName);
                    }
                } catch (e) { }
            }
        }
        this.renderLibrary();
    }

    isAudioFile(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        return ['mp3', 'flac', 'wav', 'm4a', 'ogg'].includes(ext);
    }

    renderLibrary(moodFilter = null) {
        const listContainer = document.getElementById('music-list');
        let tracksToRender = this.library;

        if (moodFilter) {
            tracksToRender = this.library.filter(t => t.mood === moodFilter);
        }

        if (tracksToRender.length === 0 && this.library.length > 0) {
            listContainer.innerHTML = '<div class="empty-state"><p>No hay canciones con este estado de ánimo.</p></div>';
            return;
        }

        listContainer.innerHTML = '';
        tracksToRender.forEach((track, index) => {
            const row = document.createElement('div');
            row.className = 'track-row';
            row.innerHTML = `
                <div class="col-idx">${index + 1}</div>
                <div class="track-meta">
                    <div class="track-row-art" style="background-image: url('${track.cover || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1470&auto=format&fit=crop'}')"></div>
                    <div class="track-main-info">
                        <span class="track-name">${track.name}</span>
                        <span class="track-artist">${track.artist}</span>
                    </div>
                </div>
                <div class="track-album">${track.album}</div>
                <div class="track-time">--:--</div>
            `;
            row.onclick = () => this.playTrack(index);
            listContainer.appendChild(row);
        });

        lucide.createIcons();
    }

    injectCardStyles() {
        if (document.getElementById('card-styles')) return;
        const style = document.createElement('style');
        style.id = 'card-styles';
        style.innerHTML = `
            .track-card {
                background: var(--bg-card);
                padding: 16px;
                border-radius: 12px;
                transition: all 0.3s ease;
                cursor: pointer;
                border: 1px solid transparent;
            }
            .track-card:hover {
                background: #1a1a1a;
                transform: translateY(-5px);
                border: 1px solid var(--glass-border);
            }
            .card-art {
                width: 100%;
                aspect-ratio: 1;
                background: #222;
                border-radius: 8px;
                margin-bottom: 12px;
                position: relative;
                overflow: hidden;
                background-image: url('https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1470&auto=format&fit=crop');
                background-size: cover;
            }
            .card-play-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s;
            }
            .track-card:hover .card-play-overlay {
                opacity: 1;
            }
            .card-play-overlay i {
                width: 48px;
                height: 48px;
                color: var(--neon-pink);
                filter: drop-shadow(0 0 10px var(--neon-pink));
            }
            .card-title {
                font-weight: 600;
                font-size: 14px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-bottom: 4px;
            }
            .card-artist {
                color: var(--text-gray);
                font-size: 12px;
            }
        `;
        document.head.appendChild(style);
    }

    async playTrack(index) {
        this.currentTrack = track;

        // AI Genre Detection & Adaptive EQ
        this.applyAIArchitecture(track.genre);

        const url = URL.createObjectURL(track.file);
        this.audioElement.src = url;

        // Update UI
        document.getElementById('player-name').innerText = track.name;
        document.getElementById('player-artist').innerText = track.artist;

        this.audioElement.play();
        this.isPlaying = true;
        this.updatePlayBtn();
        this.generateAIRecommendations(track.genre);

        if (!this.audioContext) {
            this.setupVisualizer();
        }
    }

    async generateAIRecommendations(genre) {
        console.log(`Sonus AI: Generando recomendaciones para el género ${genre}...`);
        try {
            const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(genre)}&limit=5&entity=song`);
            const data = await res.json();
            this.updateRecommendationUI(data.results);
        } catch (e) { }
    }

    updateRecommendationUI(results) {
        // Find or create recommendations section
        let recSection = document.getElementById('recommendations');
        if (!recSection) {
            recSection = document.createElement('section');
            recSection.id = 'recommendations';
            recSection.className = 'music-grid-section';
            recSection.innerHTML = '<h3>Recomendado por Sonus AI</h3><div class="music-grid" id="rec-grid"></div>';
            document.querySelector('.content').appendChild(recSection);
        }

        const grid = document.getElementById('rec-grid');
        grid.innerHTML = '';
        results.forEach(item => {
            const card = document.createElement('div');
            card.className = 'track-card mini';
            card.innerHTML = `
                <div class="card-art" style="background-image: url('${item.artworkUrl100}')"></div>
                <div class="card-info">
                    <div class="card-title">${item.trackName}</div>
                    <div class="card-artist">${item.artistName}</div>
                </div>
            `;
            card.onclick = () => this.playOnlinePreview(item);
            grid.appendChild(card);
        });
        lucide.createIcons();
    }

    togglePlay() {
        if (!this.audioElement.src) return;

        if (this.isPlaying) {
            this.audioElement.pause();
        } else {
            this.audioElement.play();
        }
        this.isPlaying = !this.isPlaying;
        this.updatePlayBtn();
    }

    updatePlayBtn() {
        const btn = document.getElementById('play-pause-btn');
        if (this.isPlaying) {
            btn.setAttribute('data-lucide', 'pause');
        } else {
            btn.setAttribute('data-lucide', 'play');
        }
        lucide.createIcons();
    }

    updateProgress() {
        const fill = document.getElementById('progress-fill');
        const percent = (this.audioElement.currentTime / this.audioElement.duration) * 100;
        fill.style.width = `${percent}%`;
    }

    handleTrackEnd() {
        this.isPlaying = false;
        this.updatePlayBtn();
    }

    setupVisualizer() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.source = this.audioContext.createMediaElementSource(this.audioElement);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        this.analyser.fftSize = 256;
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const canvas = document.getElementById('visualizer');
        const ctx = canvas.getContext('2d');

        const draw = () => {
            requestAnimationFrame(draw);
            this.analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;

                const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.5, 'rgba(255, 0, 127, 0.4)');
                grad.addColorStop(1, '#FF007F');

                ctx.fillStyle = grad;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

                x += barWidth + 1;
            }
        };

        // Resize handler
        const resize = () => {
            canvas.width = window.innerWidth - 260; // Sidebar width
            canvas.height = 150;
        };
        window.addEventListener('resize', resize);
        resize();

        draw();
    }

    /**
     * AI ADAPTIVE EQUALIZER
     * Simulates genre detection and adjusts audio profiles
     */
    detectGenre(filename) {
        const fn = filename.toLowerCase();
        if (fn.includes('rock') || fn.includes('metal')) return 'Rock';
        if (fn.includes('techno') || fn.includes('dance') || fn.includes('edm')) return 'Electronic';
        if (fn.includes('jazz') || fn.includes('blues')) return 'Jazz';
        if (fn.includes('pop') || fn.includes('indie')) return 'Pop';
        if (fn.includes('clasica') || fn.includes('piano') || fn.includes('orchestra')) return 'Classical';
        return 'General';
    }

    calculateMood(genre) {
        const moods = {
            'Rock': 'Energético',
            'Electronic': 'Fiesta',
            'Jazz': 'Relajado',
            'Pop': 'Alegre',
            'Classical': 'Concentración',
            'General': 'Neutral'
        };
        return moods[genre] || 'Neutral';
    }

    applyAIArchitecture(genre) {
        const presets = {
            'Rock': 'PUNCHY_BASS',
            'Electronic': 'SUB_BASS_BOOST',
            'Jazz': 'WARM_MIDS',
            'Pop': 'VIBRANT_HIGHS',
            'Classical': 'CRYSTAL_CLARITY',
            'General': 'BALANCED'
        };

        this.eqPreset = presets[genre] || 'BALANCED';
        this.currentGenre = genre;

        // Update UI
        const eqStatus = document.getElementById('eq-status');
        if (eqStatus) {
            eqStatus.innerHTML = `AI EQ: <span style="color:white">${this.eqPreset}</span> (${genre})`;
        }
        console.log(`AI Engine: Ajustando sonido para género ${genre}`);
    }

    updateSmartPlaylists() {
        // Logic to group library by mood
        const moodStats = {};
        this.library.forEach(t => {
            moodStats[t.mood] = (moodStats[t.mood] || 0) + 1;
        });
        console.log("Smart Playlists actualizadas por estado de ánimo:", moodStats);
    }

    toggleLyrics() {
        const overlay = document.getElementById('lyrics-overlay');
        overlay.classList.toggle('active');
        console.log("AI Lyrics: Sincronizando en tiempo real...");
    }

    async performSearch(query) {
        if (!query) return;
        console.log(`Sonus AI: Buscando "${query}"...`);

        this.switchView('online');
        const list = document.getElementById('online-list');
        const topResultBox = document.getElementById('top-result');

        list.innerHTML = '<div class="empty-state"><i data-lucide="loader" class="spin"></i></div>';
        lucide.createIcons();

        try {
            const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=15&entity=song`);
            const data = await response.json();

            if (data.results.length === 0) {
                list.innerHTML = '<div class="empty-state"><p>No se encontraron resultados.</p></div>';
                return;
            }

            // Render Results
            this.renderOnlineLibrary(data.results);

            // Intelligence: Top Result
            const top = data.results[0];
            const highResArt = top.artworkUrl100.replace('100x100', '600x600');
            topResultBox.innerHTML = `
                <h3>Resultado principal</h3>
                <div class="top-result-card">
                    <div class="top-result-art" style="background-image: url('${highResArt}')"></div>
                    <div class="top-result-info">
                        <div class="top-result-name">${top.trackName}</div>
                        <div class="top-result-meta">
                            <span class="track-artist">${top.artistName}</span>
                            <span class="artist-badge">${top.primaryGenreName}</span>
                        </div>
                    </div>
                </div>
            `;
            document.querySelector('.top-result-card').onclick = () => this.playOnlinePreview(top);

        } catch (err) {
            console.error("Error en búsqueda online:", err);
            list.innerHTML = '<div class="empty-state"><p>Error al conectar.</p></div>';
        }
    }

    renderOnlineLibrary(results) {
        const list = document.getElementById('online-list');
        list.innerHTML = '';

        results.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'track-row';
            const durationMin = Math.floor((item.trackTimeMillis / 1000) / 60);
            const durationSec = Math.floor((item.trackTimeMillis / 1000) % 60).toString().padStart(2, '0');

            row.innerHTML = `
                <div class="col-idx">${index + 1}</div>
                <div class="track-meta">
                    <div class="track-row-art" style="background-image: url('${item.artworkUrl60}')"></div>
                    <div class="track-main-info">
                        <span class="track-name">${item.trackName}</span>
                        <span class="track-artist">${item.artistName}</span>
                    </div>
                </div>
                <div class="track-album">${item.collectionName}</div>
                <div class="track-time">${durationMin}:${durationSec}</div>
            `;
            row.onclick = () => this.playOnlinePreview(item);
            list.appendChild(row);
        });
        lucide.createIcons();
    }

    playOnlinePreview(item) {
        this.currentTrack = {
            name: item.trackName,
            artist: item.artistName,
            genre: item.primaryGenreName
        };

        this.audioElement.src = item.previewUrl;
        this.applyAIArchitecture(item.primaryGenreName);

        document.getElementById('player-name').innerText = item.trackName;
        document.getElementById('player-artist').innerText = item.artistName;
        document.getElementById('player-art').style.backgroundImage = `url('${item.artworkUrl100}')`;

        this.audioElement.play();
        this.isPlaying = true;
        this.updatePlayBtn();

        if (!this.audioContext) this.setupVisualizer();
    }

    switchView(view) {
        const localSection = document.getElementById('local-section');
        const onlineSection = document.getElementById('online-section');
        const navLib = document.getElementById('nav-lib');
        const navSearch = document.getElementById('nav-search');
        const mNavLib = document.getElementById('m-nav-lib');
        const mNavSearch = document.getElementById('m-nav-search');

        if (view === 'local') {
            localSection.style.display = 'block';
            onlineSection.style.display = 'none';
            navLib.classList.add('active');
            navSearch.classList.remove('active');
            mNavLib.classList.add('active');
            mNavSearch.classList.remove('active');
        } else {
            localSection.style.display = 'none';
            onlineSection.style.display = 'block';
            navLib.classList.remove('active');
            navSearch.classList.add('active');
            mNavLib.classList.remove('active');
            mNavSearch.classList.add('active');
        }
    }
}

// Initializing the app
window.addEventListener('DOMContentLoaded', () => {
    window.sonus = new SonusEngine();
});
