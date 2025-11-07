// Player state
let isPlaying = false;
let currentTime = 0;
let duration = 225;
let volume = 0.7;
let isShuffle = false;
let isRepeat = false;
let currentSongIndex = 0;
let currentView = 'library';

// Song database
const songs = [
    { id: 1, title: "Midnight Dreams", artist: "Luna Eclipse", duration: 225, album: "Nocturnal", genre: "Electronic", color: "#8B5CF6" },
    { id: 2, title: "Ocean Waves", artist: "Coastal Beats", duration: 198, album: "Blue Horizon", genre: "Ambient", color: "#3B82F6" },
    { id: 3, title: "Neon Nights", artist: "Synth Masters", duration: 245, album: "Retro Future", genre: "Synthwave", color: "#EC4899" },
    { id: 4, title: "Mountain High", artist: "Peak Performance", duration: 212, album: "Summit", genre: "Rock", color: "#10B981" },
    { id: 5, title: "Desert Storm", artist: "Sandy Rhythms", duration: 189, album: "Mirage", genre: "World", color: "#F59E0B" },
    { id: 6, title: "Urban Jungle", artist: "City Sounds", duration: 234, album: "Concrete Dreams", genre: "Hip Hop", color: "#EF4444" },
    { id: 7, title: "Starlight", artist: "Cosmic Voyage", duration: 267, album: "Galaxy", genre: "Space Rock", color: "#6366F1" },
    { id: 8, title: "Forest Whisper", artist: "Nature's Call", duration: 201, album: "Wilderness", genre: "Folk", color: "#059669" },
    { id: 9, title: "Electric Love", artist: "Voltage", duration: 178, album: "Charged Up", genre: "EDM", color: "#F97316" },
    { id: 10, title: "Rainy Day", artist: "Weather Beats", duration: 220, album: "Seasons", genre: "Lo-fi", color: "#06B6D4" }
];

let playlist = [...songs];
let recentlyPlayed = [];
let favorites = [1, 3, 5, 8];

// DOM elements
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

// Format time in MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Load and play song
function loadSong(index) {
    currentSongIndex = index;
    const song = playlist[index];

    songTitle.textContent = song.title;
    artistName.textContent = song.artist;
    duration = song.duration;
    currentTime = 0;

    albumArt.style.background = `linear-gradient(135deg, ${song.color} 0%, ${song.color}dd 100%)`;

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

// Update progress bar
function updateProgress() {
    if (isPlaying) {
        currentTime += 0.1;
        if (currentTime >= duration) {
            if (isRepeat) {
                currentTime = 0;
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

// Toggle play/pause
function togglePlay() {
    isPlaying = !isPlaying;

    if (isPlaying) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        vinylRecord.classList.add('spinning');
    } else {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        vinylRecord.classList.remove('spinning');
    }
}

// Seek in progress bar
function seek(e) {
    const rect = progressBar.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    currentTime = Math.max(0, Math.min(1, percentage)) * duration;

    const clampedPercentage = Math.max(0, Math.min(100, percentage * 100));
    progressFill.style.width = `${clampedPercentage}%`;
    progressHandle.style.left = `${clampedPercentage}%`;
    currentTimeEl.textContent = formatTime(currentTime);
}

// Change volume
function changeVolume(e) {
    const rect = volumeSlider.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    volume = Math.max(0, Math.min(1, percentage));

    const clampedPercentage = volume * 100;
    volumeFill.style.width = `${clampedPercentage}%`;
    volumeHandle.style.left = `${clampedPercentage}%`;
}

// Toggle shuffle
function toggleShuffle() {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active', isShuffle);
}

// Toggle repeat
function toggleRepeat() {
    isRepeat = !isRepeat;
    repeatBtn.classList.toggle('active', isRepeat);
}

// Previous track
function previousTrack() {
    if (currentTime > 3) {
        currentTime = 0;
        progressFill.style.width = '0%';
        progressHandle.style.left = '0%';
        currentTimeEl.textContent = formatTime(0);
    } else {
        currentSongIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
        loadSong(currentSongIndex);
        if (isPlaying) {
            togglePlay();
            setTimeout(togglePlay, 100);
        }
    }
}

// Next track
function nextTrack() {
    if (isShuffle) {
        currentSongIndex = Math.floor(Math.random() * playlist.length);
    } else {
        currentSongIndex = (currentSongIndex + 1) % playlist.length;
    }
    loadSong(currentSongIndex);
    if (isPlaying) {
        togglePlay();
        setTimeout(togglePlay, 100);
    }
}

// Toggle favorite
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

// Update favorite button
function updateFavoriteButton() {
    const song = playlist[currentSongIndex];
    if (favorites.includes(song.id)) {
        favoriteBtn.classList.add('favorited');
    } else {
        favoriteBtn.classList.remove('favorited');
    }
}

// Filter playlist by view
function filterPlaylist() {
    let filteredSongs = [...songs];

    if (currentView === 'favorites') {
        filteredSongs = songs.filter(song => favorites.includes(song.id));
    } else if (currentView === 'recent') {
        filteredSongs = recentlyPlayed.map(id => songs.find(s => s.id === id)).filter(Boolean);
    }

    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filteredSongs = filteredSongs.filter(song => 
            song.title.toLowerCase().includes(searchTerm) ||
            song.artist.toLowerCase().includes(searchTerm) ||
            song.genre.toLowerCase().includes(searchTerm)
        );
    }

    playlist = filteredSongs.length > 0 ? filteredSongs : songs;
    updatePlaylistUI();
}

// Update playlist UI
function updatePlaylistUI() {
    playlistContainer.innerHTML = '';

    playlist.forEach((song, index) => {
        const card = document.createElement('div');
        card.className = 'song-card';
        if (playlist[currentSongIndex]?.id === song.id) {
            card.classList.add('active');
        }

        const isFavorited = favorites.includes(song.id);

        card.innerHTML = `
            <div class="song-thumbnail" style="background: ${song.color}">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
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
                loadSong(index);
                if (!isPlaying) togglePlay();
            }
        });

        const favoriteButton = card.querySelector('.song-card-favorite');
        favoriteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const songId = parseInt(e.currentTarget.dataset.songId);
            const favIndex = favorites.indexOf(songId);

            if (favIndex > -1) {
                favorites.splice(favIndex, 1);
            } else {
                favorites.push(songId);
            }

            if (playlist[currentSongIndex]?.id === songId) {
                updateFavoriteButton();
            }

            filterPlaylist();
        });

        playlistContainer.appendChild(card);
    });
}

// Switch view
function switchView(view) {
    currentView = view;
    menuItems.forEach(item => {
        if (item.dataset.view === view) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    filterPlaylist();
}

// Event listeners
playPauseBtn.addEventListener('click', togglePlay);
progressBar.addEventListener('click', seek);
volumeSlider.addEventListener('click', changeVolume);
shuffleBtn.addEventListener('click', toggleShuffle);
repeatBtn.addEventListener('click', toggleRepeat);
prevBtn.addEventListener('click', previousTrack);
nextBtn.addEventListener('click', nextTrack);
favoriteBtn.addEventListener('click', toggleFavorite);
searchInput.addEventListener('input', filterPlaylist);

menuItems.forEach(item => {
    item.addEventListener('click', () => {
        switchView(item.dataset.view);
    });
});

// Keyboard shortcuts
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

// Update progress every 100ms
setInterval(updateProgress, 100);

// Initialize
loadSong(0);
updatePlaylistUI();
totalTimeEl.textContent = formatTime(duration);
currentTimeEl.textContent = formatTime(currentTime);
