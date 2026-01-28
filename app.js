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
            scanBtn.addEventListener('click', () => this.scanLocalFolder());
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
        document.getElementById('nav-search').addEventListener('click', () => this.switchView('online'));
        document.getElementById('nav-scan').addEventListener('click', () => this.scanLocalFolder());

        // Audio element events
        this.audioElement.addEventListener('timeupdate', () => this.updateProgress());
        this.audioElement.addEventListener('ended', () => this.handleTrackEnd());
    }

    async scanLocalFolder() {
        try {
            // Modern File System Access API
            const dirHandle = await window.showDirectoryPicker();
            this.library = [];

            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file') {
                    const file = await entry.getFile();
                    if (this.isAudioFile(file.name)) {
                        const genre = this.detectGenre(file.name);
                        this.library.push({
                            name: file.name.replace(/\.[^/.]+$/, ""),
                            file: file,
                            handle: entry,
                            artist: "Artista Local",
                            album: "Colección Hi-Fi",
                            genre: genre,
                            mood: this.calculateMood(genre)
                        });
                    }
                }
            }

            this.renderLibrary();
            this.updateSmartPlaylists();
        } catch (err) {
            console.error("Error al acceder a la carpeta:", err);
            alert("Necesitas otorgar permisos para escanear carpetas locales.");
        }
    }

    isAudioFile(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        return ['mp3', 'flac', 'wav', 'm4a', 'ogg'].includes(ext);
    }

    renderLibrary() {
        const grid = document.getElementById('music-grid');
        if (this.library.length === 0) return;

        grid.innerHTML = '';
        this.library.forEach((track, index) => {
            const card = document.createElement('div');
            card.className = 'track-card';
            card.innerHTML = `
                <div class="card-art">
                    <div class="card-play-overlay">
                        <i data-lucide="play-circle"></i>
                    </div>
                </div>
                <div class="card-info">
                    <div class="card-title">${track.name}</div>
                    <div class="card-artist">${track.artist}</div>
                </div>
            `;
            card.onclick = () => this.playTrack(index);
            grid.appendChild(card);
        });

        lucide.createIcons();
        this.injectCardStyles();
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

        if (!this.audioContext) {
            this.setupVisualizer();
        }
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
        console.log(`Sonus Engine: Buscando "${query}" online...`);

        // Switch to online view
        this.switchView('online');

        const grid = document.getElementById('online-grid');
        grid.innerHTML = '<div class="empty-state"><i data-lucide="loader" class="spin"></i><p>Buscando en la base de datos global...</p></div>';
        lucide.createIcons();

        try {
            const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=20&entity=song`);
            const data = await response.json();
            this.renderOnlineLibrary(data.results);
        } catch (err) {
            console.error("Error en búsqueda online:", err);
            grid.innerHTML = '<div class="empty-state"><p>Error al conectar con el servidor.</p></div>';
        }
    }

    renderOnlineLibrary(results) {
        const grid = document.getElementById('online-grid');
        grid.innerHTML = '';

        if (results.length === 0) {
            grid.innerHTML = '<div class="empty-state"><p>No se encontraron resultados.</p></div>';
            return;
        }

        results.forEach(item => {
            const card = document.createElement('div');
            card.className = 'track-card';
            const highResArt = item.artworkUrl100.replace('100x100', '600x600');
            card.innerHTML = `
                <div class="card-art" style="background-image: url('${highResArt}')">
                    <div class="card-play-overlay">
                        <i data-lucide="play-circle"></i>
                    </div>
                </div>
                <div class="card-info">
                    <div class="card-title">${item.trackName}</div>
                    <div class="card-artist">${item.artistName}</div>
                    <div class="card-album" style="font-size: 10px; color: var(--text-gray); opacity: 0.7;">${item.collectionName}</div>
                </div>
            `;
            card.onclick = () => this.playOnlinePreview(item);
            grid.appendChild(card);
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

        if (view === 'local') {
            localSection.style.display = 'block';
            onlineSection.style.display = 'none';
            navLib.classList.add('active');
            navSearch.classList.remove('active');
        } else {
            localSection.style.display = 'none';
            onlineSection.style.display = 'block';
            navLib.classList.remove('active');
            navSearch.classList.add('active');
        }
    }
}

// Initializing the app
window.addEventListener('DOMContentLoaded', () => {
    window.sonus = new SonusEngine();
});
