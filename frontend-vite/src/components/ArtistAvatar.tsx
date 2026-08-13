import React, { useState, useEffect } from 'react';
import CoverImage from './CoverImage';
import { getArtistCoverUrl, setArtistCoverUrl, libraryService } from '../services/library';
import { useLibraryStore } from '../stores/libraryStore';

interface ArtistAvatarProps {
    artistName: string;
    className?: string;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function ArtistAvatar({ artistName, className = "w-20 h-20 sm:w-24 sm:h-24 rounded-full", onClick }: ArtistAvatarProps) {
    const savedAlbums = useLibraryStore(s => s.savedAlbums);
    const userPlaylists = useLibraryStore(s => s.userPlaylists);

    const getExistingPhoto = (): string | undefined => {
        const cached = getArtistCoverUrl(artistName);
        if (cached && !cached.includes('ui-avatars.com') && !cached.includes('placehold.co')) {
            return cached;
        }

        const albumMatch = savedAlbums.find(a => a.artist?.toLowerCase() === artistName.toLowerCase());
        if (albumMatch?.cover_url) return albumMatch.cover_url;

        const playlistMatch = userPlaylists.find(p => p.id === `playlist-${artistName.replace(/\s+/g, '-')}`);
        if (playlistMatch?.cover_url) return playlistMatch.cover_url;

        return undefined;
    };

    const initialPhoto = getExistingPhoto();
    const [photoUrl, setPhotoUrl] = useState<string | undefined>(
        initialPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&background=ff5500&color=fff&size=128&rounded=true&bold=true`
    );

    useEffect(() => {
        let isMounted = true;
        const existing = getExistingPhoto();
        if (existing) {
            setPhotoUrl(existing);
            setArtistCoverUrl(artistName, existing);
            return;
        }

        // Fetch official photo asynchronously if missing
        libraryService.getArtistInfo(artistName).then(info => {
            if (isMounted && info.photo && !info.isPlaceholder) {
                setPhotoUrl(info.photo);
                setArtistCoverUrl(artistName, info.photo);
            } else if (isMounted) {
                // Fallback to top track artwork
                libraryService.search(artistName).then(tracks => {
                    if (isMounted && tracks.length > 0 && tracks[0].cover_url) {
                        setPhotoUrl(tracks[0].cover_url);
                        setArtistCoverUrl(artistName, tracks[0].cover_url);
                    }
                }).catch(() => {});
            }
        }).catch(() => {
            if (isMounted) {
                libraryService.search(artistName).then(tracks => {
                    if (isMounted && tracks.length > 0 && tracks[0].cover_url) {
                        setPhotoUrl(tracks[0].cover_url);
                        setArtistCoverUrl(artistName, tracks[0].cover_url);
                    }
                }).catch(() => {});
            }
        });

        return () => { isMounted = false; };
    }, [artistName]);

    return (
        <CoverImage
            src={photoUrl}
            alt={artistName}
            className={`${className} object-cover border-2 border-white/10 group-hover:border-[#ff5500] transition shadow`}
            fallbackText={artistName?.substring(0, 2).toUpperCase()}
            onClick={onClick}
        />
    );
}
