// const token = 'BQDU3S1_jvgENfrMSBBE18hHNqIa0TJMBWIzGbmIS50l60vyf5u55cwModae4WgcCowTGo6HxQLAcV_GF3mjNmOcvKlYIdXfqGgpoCW_uAp5lw67nS7sojk8vvKzaBTxe2xSvsA5XFxqzSwo9qu8lI8swNuqGjCVdFFzhfvgtIyHyqgCq52yUf5Gv1CAu3Ea4E__-CiA61sGr8nyNIjy4ywoREIfUHZVNAbZPhYcOaZQYGBwkyUkyne_Vcm4ebVg5lBXJh5Ryat9ABORKeJR1dOgQIyHzorjms39ntYNOBIcjHlWDmw6s1l_2znBbXNvv9ln';

// async function fetchWebApi(endpoint, method, body) {
//     const res = await fetch(`https://api.spotify.com/${endpoint}`, {
//         headers: {
//             Authorization: `Bearer ${token}`,
//         },
//         method,
//         body: JSON.stringify(body)
//     });
//     return await res.json();
// }

// async function getTopTracks() {
//     return (await fetchWebApi(
//         'v1/me/top/tracks?time_range=long_term&limit=5', 'GET'
//     )).items;
// }

// (async() => {
//     const topTracks = await getTopTracks();

//     // ✅ Fixed: removed optional chaining
//     if (topTracks) {
//         console.log(
//             topTracks.map(
//                 ({ name, artists }) =>
//                 `${name} by ${artists.map(artist => artist.name).join(', ')}`
//             )
//         );
//     }
// })();

const token = 'BQDU3S1_jvgENfrMSBBE18hHNqIa0TJMBWIzGbmIS50l60vyf5u55cwModae4WgcCowTGo6HxQLAcV_GF3mjNmOcvKlYIdXfqGgpoCW_uAp5lw67nS7sojk8vvKzaBTxe2xSvsA5XFxqzSwo9qu8lI8swNuqGjCVdFFzhfvgtIyHyqgCq52yUf5Gv1CAu3Ea4E__-CiA61sGr8nyNIjy4ywoREIfUHZVNAbZPhYcOaZQYGBwkyUkyne_Vcm4ebVg5lBXJh5Ryat9ABORKeJR1dOgQIyHzorjms39ntYNOBIcjHlWDmw6s1l_2znBbXNvv9ln';

async function fetchWebApi(endpoint, method, body) {
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        method,
        body: body ? JSON.stringify(body) : undefined
    });
    return await res.json();
}

// Fetch user's top tracks from Spotify
async function getTopTracks() {
    try {
        const response = await fetchWebApi(
            'v1/me/top/tracks?time_range=long_term&limit=50',
            'GET'
        );
        return response.items;
    } catch (error) {
        console.error('Error fetching tracks:', error);
        return [];
    }
}

// Fetch user's playlists
async function getUserPlaylists() {
    try {
        const response = await fetchWebApi('v1/me/playlists?limit=50', 'GET');
        return response.items;
    } catch (error) {
        console.error('Error fetching playlists:', error);
        return [];
    }
}

// Fetch tracks from a specific playlist
async function getPlaylistTracks(playlistId) {
    try {
        const response = await fetchWebApi(
            `v1/playlists/${playlistId}/tracks`,
            'GET'
        );
        return response.items.map(item => item.track);
    } catch (error) {
        console.error('Error fetching playlist tracks:', error);
        return [];
    }
}

// Convert Spotify track to your song format
function convertSpotifyTrack(track, index) {
    const colors = ['#8B5CF6', '#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#059669', '#F97316', '#06B6D4'];

    return {
        id: track.id,
        title: track.name,
        artist: track.artists.map(artist => artist.name).join(', '),
        duration: Math.floor(track.duration_ms / 1000),
        album: track.album.name,
        genre: track.album.genres ? track.album.genres[0] : 'Unknown',
        color: colors[index % colors.length],
        albumImage: track.album.images[0] ? track.album.images[0].url : null,
        previewUrl: track.preview_url,
        spotifyUrl: track.external_urls.spotify
    };
}

// Player state
let isPlaying = false;
let currentTime = 0;
let duration = 225;
let volume = 0.7;
let isShuffle = false;
let isRepeat = false;
let currentSongIndex = 0;
let currentView = 'library';
let audioElement = new Audio();

// Song database - will be populated from Spotify
let songs = [];
let playlist = [];
let recentlyPlayed = [];
let favorites = [];

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

// Load and play song with actual audio
function loadSong(index) {
    currentSongIndex = index;
    const song = playlist[index];

    songTitle.textContent = song.title;
    artistName.textContent = song.artist;
    duration = song.duration;
    currentTime = 0;

    // Update album art with actual Spotify image
    if (song.albumImage) {
        albumArt.style.backgroundImage = `url(${song.albumImage})`;
        albumArt.style.backgroundSize = 'cover';
        albumArt.style.backgroundPosition = 'center';
    } else {
        albumArt.style.background = `linear-gradient(135deg, ${song.color} 0%, ${song.color}dd 100%)`;
    }

    // Load actual audio preview if available
    if (song.previewUrl) {
        audioElement.src = song.previewUrl;
        audioElement.volume = volume;
        audioElement.load();
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

// Update progress bar with real audio
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

// Toggle play/pause with real audio
function togglePlay() {
    isPlaying = !isPlaying;

    if (isPlaying) {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        vinylRecord.classList.add('spinning');

        if (audioElement.src) {
            audioElement.play().catch(err => {
                console.error('Playback error:', err);
                isPlaying = false;
                playIcon.classList.remove('hidden');
                pauseIcon.classList.add('hidden');
            });
        }
    } else {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        vinylRecord.classList.remove('spinning');

        if (audioElement.src) {
            audioElement.pause();
        }
    }
}

// Seek in progress bar
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

// Change volume
function changeVolume(e) {
    const rect = volumeSlider.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    volume = Math.max(0, Math.min(1, percentage));

    audioElement.volume = volume;

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
        audioElement.currentTime = 0;
        progressFill.style.width = '0%';
        progressHandle.style.left = '0%';
        currentTimeEl.textContent = formatTime(0);
    } else {
        currentSongIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
        loadSong(currentSongIndex);
        if (isPlaying) {
            audioElement.pause();
            setTimeout(() => audioElement.play(), 100);
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
        audioElement.pause();
        setTimeout(() => audioElement.play(), 100);
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
            (song.genre && song.genre.toLowerCase().includes(searchTerm))
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
                if (playlist[currentSongIndex] && playlist[currentSongIndex].id === song.id) {
                    card.classList.add('active');
                }

                const isFavorited = favorites.includes(song.id);

                card.innerHTML = `
            <div class="song-thumbnail" style="${song.albumImage ? `background-image: url(${song.albumImage}); background-size: cover;` : `background: ${song.color}`}">
                ${!song.albumImage ? `<svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>` : ''}
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

// Initialize with Spotify data
async function initializePlayer() {
    try {
        // Show loading state
        playlistContainer.innerHTML = '<div style="text-align: center; padding: 40px;">Loading your music...</div>';
        
        // Fetch tracks from Spotify
        const spotifyTracks = await getTopTracks();
        
        if (spotifyTracks && spotifyTracks.length > 0) {
            songs = spotifyTracks.map((track, index) => convertSpotifyTrack(track, index));
            playlist = [...songs];
            
            loadSong(0);
            updatePlaylistUI();
            totalTimeEl.textContent = formatTime(duration);
            currentTimeEl.textContent = formatTime(currentTime);
        } else {
            playlistContainer.innerHTML = '<div style="text-align: center; padding: 40px;">No tracks found. Please check your Spotify token.</div>';
        }
    } catch (error) {
        console.error('Failed to initialize player:', error);
        playlistContainer.innerHTML = '<div style="text-align: center; padding: 40px;">Error loading music. Please refresh the page.</div>';
    }
}

// Start the app
initializePlayer();