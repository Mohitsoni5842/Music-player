// ==========================================
// SPOTIFY CONFIGURATION
// ==========================================

const CLIENT_ID = '12a6123eb15d451c976d168ce0fce55d';
const REDIRECT_URI = 'https://music-player-mohitsoni5842s-projects.vercel.app/callback.html';

// ==========================================
// PKCE HELPER FUNCTIONS
// ==========================================

function generateRandomString(length) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
}

function base64encode(input) {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

// ==========================================
// TOKEN MANAGEMENT
// ==========================================

async function redirectToSpotifyLogin() {
    console.log('Starting Spotify login flow...');
    
    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    localStorage.setItem('code_verifier', codeVerifier);

    const scopes = 'user-top-read user-read-private user-read-email';
    const authUrl = new URL('https://accounts.spotify.com/authorize');

    const params = {
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: scopes,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        redirect_uri: REDIRECT_URI,
    };

    authUrl.search = new URLSearchParams(params).toString();
    
    setTimeout(() => {
        window.location.href = authUrl.toString();
    }, 100);
}

// ==========================================
// CHECK TOKEN AND START APP
// ==========================================

(async function() {
    const token = localStorage.getItem('spotify_token');
    const expiry = localStorage.getItem('spotify_token_expiry');
    
    if (!token || !expiry || Date.now() > parseInt(expiry)) {
        console.log('No valid token, redirecting to login...');
        await redirectToSpotifyLogin();
    } else {
        console.log('Token found, starting app...');
        startApp();
    }
})();

// ==========================================
// MAIN APPLICATION
// ==========================================

function startApp() {
    console.log('🎵 Starting music player...');

    // ==========================================
    // API FUNCTIONS
    // ==========================================

    async function fetchWebApi(endpoint, method, body) {
        const currentToken = localStorage.getItem('spotify_token');

        if (!currentToken) {
            redirectToSpotifyLogin();
            return null;
        }

        const res = await fetch(`https://api.spotify.com/${endpoint}`, {
            headers: {
                Authorization: `Bearer ${currentToken}`,
            },
            method,
            body: body ? JSON.stringify(body) : undefined
        });

        if (res.status === 401) {
            localStorage.clear();
            redirectToSpotifyLogin();
            return null;
        }

        return await res.json();
    }

    async function getTopTracks() {
        try {
            const response = await fetchWebApi('v1/me/top/tracks?time_range=long_term&limit=50', 'GET');
            return response ? response.items : [];
        } catch (error) {
            console.error('Error fetching tracks:', error);
            return [];
        }
    }

    async function searchTracks(query) {
        try {
            const response = await fetchWebApi(`v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`, 'GET');
            return response && response.tracks ? response.tracks.items : [];
        } catch (error) {
            console.error('Error searching tracks:', error);
            return [];
        }
    }

    function convertSpotifyTrack(track, index) {
        const colors = ['#8B5CF6', '#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#059669', '#F97316', '#06B6D4'];
        return {
            id: track.id,
            title: track.name,
            artist: track.artists.map(artist => artist.name).join(', '),
            duration: Math.floor(track.duration_ms / 1000),
            album: track.album.name,
            color: colors[index % colors.length],
            albumImage: track.album.images[0] ? track.album.images[0].url : null,
            previewUrl: track.preview_url,
            spotifyUrl: track.external_urls.spotify
        };
    }

    // ==========================================
    // PLAYER STATE
    // ==========================================

    let isPlaying = false;
    let currentTime = 0;
    let duration = 30;
    let volume = 0.7;
    let isShuffle = false;
    let isRepeat = false;
    let currentSongIndex = 0;
    let currentView = 'library';
    let audioElement = new Audio();
    let searchTimeout = null;
    let songs = [];
    let playlist = [];
    let recentlyPlayed = [];
    let favorites = [];

    // ==========================================
    // DOM ELEMENTS
    // ==========================================

    const playPauseBtn = document.getElementById('playPause');
    const playIcon = document.querySelector('.play-icon');
    const pauseIcon = document.querySelector('.pause-icon');
    const vinylRecord = document.querySelector('.vinyl-record');
    const progressBar = document.querySelector('.progress-bar');
    const progressFill = document.querySelector('.progress-fill');
    const progressHandle = document.querySelector('.progress-handle');
    const currentTimeEl = document.querySelector('.current-time');
    const totalTimeEl = document.querySelector('.total-time');
    const volumeSlider = document.querySelector('.volume-slider');
    const volumeFill = document.querySelector('.volume-fill');
    const volumeHandle = document.querySelector('.volume-handle');
    const shuffleBtn = document.getElementById('shuffle');
    const repeatBtn = document.getElementById('repeat');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    const searchInput = document.getElementById('searchInput');
    const playlistContainer = document.getElementById('playlistContainer');
    const songTitle = document.querySelector('.song-title');
    const artistName = document.querySelector('.artist-name');
    const albumArt = document.querySelector('.album-art');
    const menuItems = document.querySelectorAll('.menu-item');
    const favoriteBtn = document.getElementById('favoriteBtn');

    // ==========================================
    // FUNCTIONS
    // ==========================================

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function loadSong(index) {
        currentSongIndex = index;
        const song = playlist[index];
        if (!song) return;

        songTitle.textContent = song.title;
        artistName.textContent = song.artist;
        duration = song.duration;
        currentTime = 0;

        if (song.albumImage) {
            albumArt.style.backgroundImage = `url(${song.albumImage})`;
            albumArt.style.backgroundSize = 'cover';
            albumArt.style.backgroundPosition = 'center';
        } else {
            albumArt.style.background = `linear-gradient(135deg, ${song.color} 0%, ${song.color}dd 100%)`;
        }

        if (song.previewUrl) {
            audioElement.src = song.previewUrl;
            audioElement.volume = volume;
            audioElement.load();
            console.log('✅ Loaded:', song.title);
        } else {
            audioElement.src = '';
            console.warn('⚠️ No preview:', song.title);
        }

        progressFill.style.width = '0%';
        progressHandle.style.left = '0%';
        totalTimeEl.textContent = formatTime(duration);
        currentTimeEl.textContent = formatTime(0);

        updatePlaylistUI();
        updateFavoriteButton();

        if (!recentlyPlayed.includes(song.id)) {
            recentlyPlayed.unshift(song.id);
            if (recentlyPlayed.length > 5) recentlyPlayed.pop();
        }
    }

    function updateProgress() {
        if (isPlaying && audioElement.src) {
            currentTime = audioElement.currentTime;
            duration = audioElement.duration || duration;

            if (currentTime >= duration - 0.5) {
                if (isRepeat) {
                    audioElement.currentTime = 0;
                    audioElement.play();
                } else {
                    nextTrack();
                    return;
                }
            }

            const percentage = (currentTime / duration) * 100;
            progressFill.style.width = `${percentage}%`;
            progressHandle.style.left = `${percentage}%`;
            currentTimeEl.textContent = formatTime(currentTime);
        }
    }

    function togglePlay() {
        isPlaying = !isPlaying;

        if (isPlaying) {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
            if (vinylRecord) vinylRecord.classList.add('spinning');
            
            if (audioElement.src && audioElement.src !== window.location.href) {
                audioElement.play().catch(err => {
                    console.error('Playback error:', err);
                    isPlaying = false;
                    playIcon.classList.remove('hidden');
                    pauseIcon.classList.add('hidden');
                    if (vinylRecord) vinylRecord.classList.remove('spinning');
                    nextTrack();
                });
            } else {
                isPlaying = false;
                playIcon.classList.remove('hidden');
                pauseIcon.classList.add('hidden');
                if (vinylRecord) vinylRecord.classList.remove('spinning');
                nextTrack();
            }
        } else {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
            if (vinylRecord) vinylRecord.classList.remove('spinning');
            if (audioElement.src) {
                audioElement.pause();
            }
        }
    }

    function seek(e) {
        const rect = progressBar.getBoundingClientRect();
        const percentage = (e.clientX - rect.left) / rect.width;
        currentTime = Math.max(0, Math.min(1, percentage)) * duration;
        if (audioElement.src) {
            audioElement.currentTime = currentTime;
        }
        const clampedPercentage = Math.max(0, Math.min(100, percentage * 100));
        progressFill.style.width = `${clampedPercentage}%`;
        progressHandle.style.left = `${clampedPercentage}%`;
        currentTimeEl.textContent = formatTime(currentTime);
    }

    function changeVolume(e) {
        const rect = volumeSlider.getBoundingClientRect();
        const percentage = (e.clientX - rect.left) / rect.width;
        volume = Math.max(0, Math.min(1, percentage));
        audioElement.volume = volume;
        const clampedPercentage = volume * 100;
        volumeFill.style.width = `${clampedPercentage}%`;
        volumeHandle.style.left = `${clampedPercentage}%`;
    }

    function toggleShuffle() {
        isShuffle = !isShuffle;
        shuffleBtn.classList.toggle('active', isShuffle);
    }

    function toggleRepeat() {
        isRepeat = !isRepeat;
        repeatBtn.classList.toggle('active', isRepeat);
    }

    function previousTrack() {
        if (currentTime > 3) {
            currentTime = 0;
            audioElement.currentTime = 0;
            progressFill.style.width = '0%';
            progressHandle.style.left = '0%';
            currentTimeEl.textContent = formatTime(0);
        } else {
            currentSongIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
            loadSong(currentSongIndex);
            if (isPlaying) {
                setTimeout(() => audioElement.play(), 100);
            }
        }
    }

    function nextTrack() {
        // Find next song with preview
        let attempts = 0;
        let nextIndex = currentSongIndex;
        
        do {
            if (isShuffle) {
                nextIndex = Math.floor(Math.random() * playlist.length);
            } else {
                nextIndex = (nextIndex + 1) % playlist.length;
            }
            attempts++;
            
            if (playlist[nextIndex] && playlist[nextIndex].previewUrl) {
                currentSongIndex = nextIndex;
                loadSong(currentSongIndex);
                if (isPlaying) {
                    setTimeout(() => audioElement.play(), 100);
                }
                return;
            }
        } while (attempts < playlist.length);
        
        console.warn('No songs with preview available');
        isPlaying = false;
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        if (vinylRecord) vinylRecord.classList.remove('spinning');
    }

    function toggleFavorite() {
        const song = playlist[currentSongIndex];
        const index = favorites.indexOf(song.id);
        if (index > -1) {
            favorites.splice(index, 1);
        } else {
            favorites.push(song.id);
        }
        updateFavoriteButton();
        updatePlaylistUI();
    }

    function updateFavoriteButton() {
        const song = playlist[currentSongIndex];
        if (favorites.includes(song.id)) {
            favoriteBtn.classList.add('favorited');
        } else {
            favoriteBtn.classList.remove('favorited');
        }
    }

    async function handleSearch() {
        const searchTerm = searchInput.value.trim();
        if (searchTimeout) clearTimeout(searchTimeout);
        if (!searchTerm) {
            filterPlaylist();
            return;
        }
        playlistContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #888;">Searching...</div>';
        searchTimeout = setTimeout(async () => {
            const results = await searchTracks(searchTerm);
            if (results && results.length > 0) {
                playlist = results.map((track, index) => convertSpotifyTrack(track, index));
                updatePlaylistUI();
                
                const firstWithPreview = playlist.findIndex(s => s.previewUrl);
                if (firstWithPreview !== -1) {
                    loadSong(firstWithPreview);
                }
            } else {
                playlistContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #888;">No results</div>';
            }
        }, 500);
    }

    function filterPlaylist() {
        let filteredSongs = [...songs];
        if (currentView === 'favorites') {
            filteredSongs = songs.filter(song => favorites.includes(song.id));
        } else if (currentView === 'recent') {
            filteredSongs = recentlyPlayed.map(id => songs.find(s => s.id === id)).filter(Boolean);
        }
        playlist = filteredSongs.length > 0 ? filteredSongs : songs;
        updatePlaylistUI();
    }

    function updatePlaylistUI() {
        playlistContainer.innerHTML = '';
        
        if (playlist.length === 0) {
            playlistContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #888;">No songs available</div>';
            return;
        }

        playlist.forEach((song, index) => {
            const card = document.createElement('div');
            card.className = 'song-card';
            if (playlist[currentSongIndex] && playlist[currentSongIndex].id === song.id) {
                card.classList.add('active');
            }

            const isFavorited = favorites.includes(song.id);

            card.innerHTML = `
                <div class="song-thumbnail" style="${song.albumImage ? `background-image: url(${song.albumImage}); background-size: cover; position: relative;` : `background: ${song.color}; position: relative;`}">
                    ${!song.albumImage ? `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>` : ''}
                    ${!song.previewUrl ? `<div style="position: absolute; top: 5px; right: 5px; background: rgba(239, 68, 68, 0.9); color: white; padding: 3px 8px; border-radius: 4px; font-size: 9px; font-weight: bold;">NO PREVIEW</div>` : ''}
                </div>
                <div class="song-card-info">
                    <div class="song-card-title">${song.title}</div>
                    <div class="song-card-artist">${song.artist}</div>
                </div>
                <button class="song-card-favorite ${isFavorited ? 'favorited' : ''}" data-song-id="${song.id}">
                    <svg viewBox="0 0 24 24" fill="${isFavorited ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                </button>
                <div class="song-card-duration">${formatTime(song.duration)}</div>
            `;

            card.addEventListener('click', (e) => {
                if (!e.target.closest('.song-card-favorite')) {
                    if (song.previewUrl) {
                        loadSong(index);
                        if (!isPlaying) {
                            setTimeout(() => togglePlay(), 100);
                        }
                    } else {
                        alert('This song has no preview available. Try another song!');
                    }
                }
            });

            const favoriteButton = card.querySelector('.song-card-favorite');
            favoriteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const songId = e.currentTarget.dataset.songId;
                const favIndex = favorites.indexOf(songId);
                if (favIndex > -1) {
                    favorites.splice(favIndex, 1);
                } else {
                    favorites.push(songId);
                }
                if (playlist[currentSongIndex] && playlist[currentSongIndex].id === songId) {
                    updateFavoriteButton();
                }
                updatePlaylistUI();
            });

            playlistContainer.appendChild(card);
        });
    }

    function switchView(view) {
        currentView = view;
        searchInput.value = '';
        menuItems.forEach(item => {
            if (item.dataset.view === view) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        filterPlaylist();
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    playPauseBtn.addEventListener('click', togglePlay);
    progressBar.addEventListener('click', seek);
    if (volumeSlider) volumeSlider.addEventListener('click', changeVolume);
    shuffleBtn.addEventListener('click', toggleShuffle);
    repeatBtn.addEventListener('click', toggleRepeat);
    prevBtn.addEventListener('click', previousTrack);
    nextBtn.addEventListener('click', nextTrack);
    favoriteBtn.addEventListener('click', toggleFavorite);
    searchInput.addEventListener('input', handleSearch);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            filterPlaylist();
        }
    });

    menuItems.forEach(item => {
        item.addEventListener('click', () => switchView(item.dataset.view));
    });

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                togglePlay();
                break;
            case 'ArrowRight':
                e.preventDefault();
                nextTrack();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                previousTrack();
                break;
        }
    });

    setInterval(updateProgress, 100);

    // ==========================================
    // INITIALIZE WITH POPULAR TRACKS
    // ==========================================

    async function init() {
        playlistContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #888;"><div style="font-size: 40px; margin-bottom: 15px;">🎵</div>Loading music...</div>';
        
        // Try user's top tracks first
        const userTracks = await getTopTracks();
        const userSongs = userTracks ? userTracks.map((track, index) => convertSpotifyTrack(track, index)) : [];
        const userSongsWithPreviews = userSongs.filter(s => s.previewUrl);
        
        console.log(`User tracks: ${userSongs.length}, with previews: ${userSongsWithPreviews.length}`);
        
        if (userSongsWithPreviews.length >= 5) {
            // Enough user songs with previews
            songs = userSongs;
            playlist = [...songs];
            const firstIndex = playlist.findIndex(s => s.previewUrl);
            loadSong(firstIndex);
            updatePlaylistUI();
            console.log('✅ Loaded user tracks');
        } else {
            // Load popular tracks
            console.log('Loading popular tracks...');
            playlistContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #888;"><div style="font-size: 40px; margin-bottom: 15px;">🎵</div>Loading popular tracks with previews...</div>';
            
            const artists = ['Ed Sheeran', 'Taylor Swift', 'The Weeknd', 'Dua Lipa', 'Bruno Mars'];
            let allTracks = [];
            
            for (const artist of artists) {
                const results = await searchTracks(artist);
                const withPreviews = results.filter(t => t.preview_url);
                allTracks = allTracks.concat(withPreviews);
                if (allTracks.length >= 30) break;
            }
            
            if (allTracks.length > 0) {
                songs = allTracks.slice(0, 40).map((track, index) => convertSpotifyTrack(track, index));
                playlist = [...songs];
                loadSong(0);
                updatePlaylistUI();
                
                const msg = document.createElement('div');
                msg.style.cssText = 'background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; text-align: center;';
                msg.innerHTML = `<strong>🎵 Playing Popular Tracks</strong><br><small style="opacity:0.9">Your songs don't have previews. Search for your favorite artists!</small>`;
                playlistContainer.insertBefore(msg, playlistContainer.firstChild);
                
                console.log(`✅ Loaded ${songs.length} popular tracks`);
            } else {
                playlistContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #888;">Unable to load tracks. Try searching!</div>';
            }
        }
        
        totalTimeEl.textContent = formatTime(30);
        currentTimeEl.textContent = formatTime(0);
    }

    init();
}
