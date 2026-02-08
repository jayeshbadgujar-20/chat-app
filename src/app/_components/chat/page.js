"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "../toast/Toast";

// Common emojis for quick access
const EMOJIS = ['😊', '❤️', '😂', '🥰', '😍', '🎵', '🎶', '💕', '💖', '✨', '🔥', '💯', '👍', '🙌', '😘', '🤗', '💋', '🌹', '💝', '🎉', '😎', '🥺', '💗', '🦋'];

const ChatRoom = ({ roomId }) => {
  const router = useRouter();
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [userId, setUserId] = useState("");
  const [roomUsers, setRoomUsers] = useState([]);
  const [videoId, setVideoId] = useState("");
  const [videoThumbnail, setVideoThumbnail] = useState("");
  const [player, setPlayer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [videoTitle, setVideoTitle] = useState("Unknown video");
  const [isSearching, setIsSearching] = useState(false);
  const [modal, setModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [partnerJoined, setPartnerJoined] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const scroll = useRef(null);
  const notificationTone = useRef(null);
  const playerRef = useRef(null);
  const prevUserCount = useRef(0);
  const timeUpdateInterval = useRef(null);
  const lastSeekTime = useRef(0);

  const { showSuccess, showError, showWarning, showInfo, ToastContainer } = useToast();

  // Initialize on mount
  useEffect(() => {
    setMounted(true);
    const id = uuidv4();
    setUserId(id);
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (!mounted) return;

    const newSocket = io("https://lovetunes-2.onrender.com", {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [mounted]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !roomId || !mounted) return;

    const handleConnect = () => {
      console.log("Connected to server");
      setIsConnected(true);
      socket.emit("create-room", roomId);
      socket.emit("join-room", roomId);
      showSuccess("Connected to room! 🎵");
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      showWarning("Disconnected from server");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    if (socket.connected) {
      handleConnect();
    }

    socket.on("receive-message", (data) => {
      if (data.senderId !== userId) {
        setChat((prev) => [...prev, data]);
        if (notificationTone.current) {
          notificationTone.current.play().catch(() => { });
        }
      }
    });

    socket.on("room-users", (users) => {
      const newCount = users.length;
      const oldCount = prevUserCount.current;

      if (oldCount > 0 && newCount > oldCount) {
        showInfo(`Someone joined! 👋 (${newCount} users now)`);
        setPartnerJoined(true);
      } else if (oldCount > 1 && newCount < oldCount) {
        showWarning(`Someone left (${newCount} users now)`);
        if (newCount === 1) setPartnerJoined(false);
      }

      prevUserCount.current = newCount;
      setRoomUsers(users);
      if (newCount > 1) setPartnerJoined(true);
    });

    socket.on("play-video", (newVideoId, newVideoTitle) => {
      setVideoId(newVideoId);
      setVideoTitle(newVideoTitle);
      setVideoThumbnail(`https://img.youtube.com/vi/${newVideoId}/mqdefault.jpg`);
      setIsPlaying(true);
    });

    socket.on("pause-video", () => {
      if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo();
      }
      setIsPlaying(false);
    });

    socket.on("video-state", (playing) => {
      setIsPlaying(playing);
      if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
        playing ? playerRef.current.playVideo() : playerRef.current.pauseVideo();
      }
    });

    socket.on("seek-video", (time) => {
      if (typeof time !== 'number' || time < 0) return;

      // Update last seek time to prevent interval from overriding
      lastSeekTime.current = Date.now();

      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        try {
          playerRef.current.seekTo(time, true);
          setCurrentTime(time);
          console.log("Seeked to:", time);
        } catch (e) {
          console.error("Error seeking:", e);
        }
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("receive-message");
      socket.off("room-users");
      socket.off("play-video");
      socket.off("pause-video");
      socket.off("video-state");
      socket.off("seek-video");
    };
  }, [socket, roomId, mounted, userId]);

  // Load YouTube API
  useEffect(() => {
    if (!mounted) return;

    if (typeof window !== "undefined" && !window.YT) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [mounted]);

  // Initialize YouTube player (hidden - audio only)
  useEffect(() => {
    if (!mounted || !videoId) return;

    const initPlayer = () => {
      if (typeof window !== "undefined" && window.YT && window.YT.Player) {
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          try {
            playerRef.current.destroy();
          } catch (e) {
            console.log("Player destroy error:", e);
          }
          playerRef.current = null;
        }

        const container = document.getElementById("youtube-player");
        if (!container) return;

        try {
          playerRef.current = new window.YT.Player("youtube-player", {
            height: "1",
            width: "1",
            videoId: videoId,
            playerVars: {
              autoplay: 1,
              controls: 0,
              modestbranding: 1,
              showinfo: 0,
              fs: 0,
              rel: 0,
              playsinline: 1,
            },
            events: {
              onReady: (event) => {
                setPlayer(event.target);
                playerRef.current = event.target;
                setDuration(event.target.getDuration() || 0);
                if (isPlaying) {
                  event.target.playVideo();
                }
                // Start time update interval
                if (timeUpdateInterval.current) {
                  clearInterval(timeUpdateInterval.current);
                }
                timeUpdateInterval.current = setInterval(() => {
                  // Don't update if we just seeked (within last 500ms)
                  if (Date.now() - lastSeekTime.current < 500) {
                    return;
                  }

                  if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                    try {
                      const current = playerRef.current.getCurrentTime() || 0;
                      const dur = playerRef.current.getDuration() || 0;
                      setCurrentTime(current);
                      setDuration(dur);
                    } catch (e) {
                      console.error("Error updating time:", e);
                    }
                  }
                }, 1000);
              },
              onStateChange: (event) => {
                if (event.data === window.YT.PlayerState.PLAYING) {
                  setIsPlaying(true);
                }
                if (event.data === window.YT.PlayerState.PAUSED) {
                  setIsPlaying(false);
                }
              },
            },
          });
        } catch (e) {
          console.error("Failed to create YouTube player:", e);
        }
      }
    };

    const timer = setTimeout(() => {
      if (window.YT && window.YT.Player) {
        initPlayer();
      } else {
        window.onYouTubeIframeAPIReady = initPlayer;
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    };
  }, [mounted, videoId]);

  const searchYouTube = async (query) => {
    if (!query.trim()) return;

    const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API;

    // Check if API Key is missing
    if (!API_KEY) {
      console.error("YouTube API Key is missing. Please add NEXT_PUBLIC_YOUTUBE_API to your .env.local file.");
      showError("YouTube API Key is missing! Check .env.local");
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(query)}&key=${API_KEY}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("YouTube API Error:", response.status, errorData);

        if (response.status === 403) {
          throw new Error("YouTube API Quota Exceeded or Invalid Key (403)");
        }
        throw new Error(`YouTube API Error: ${response.status}`);
      }

      const data = await response.json();
      setSearchResults(data.items || []);
    } catch (error) {
      console.error("Search failed:", error);
      showError(error.message || "Failed to search. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      if (socket) socket.emit("pause-video", roomId);
      setIsPlaying(false);
      if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo();
      }
    } else {
      if (socket) socket.emit("play-video", roomId, videoId, videoTitle);
      setIsPlaying(true);
      if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
        playerRef.current.playVideo();
      }
    }
  }, [socket, isPlaying, roomId, videoId, videoTitle]);

  const handleSeek = useCallback((seconds) => {
    if (!playerRef.current) return;

    try {
      const getCurrentTime = playerRef.current.getCurrentTime;
      const getDuration = playerRef.current.getDuration;
      const seekTo = playerRef.current.seekTo;

      if (typeof getCurrentTime === 'function' && typeof seekTo === 'function') {
        const current = getCurrentTime() || 0;
        const dur = (typeof getDuration === 'function' ? getDuration() : duration) || 0;
        const newTime = Math.max(0, Math.min(dur, current + seconds));

        // Update last seek time to prevent interval from overriding
        lastSeekTime.current = Date.now();

        seekTo(newTime, true);
        setCurrentTime(newTime);

        // Emit to sync with other users
        if (socket) {
          socket.emit("seek-video", roomId, newTime);
        }
      }
    } catch (e) {
      console.error("Error seeking:", e);
    }
  }, [socket, roomId, duration]);

  const handleVideoSelect = useCallback((newVideoId, newVideoTitle, thumbnail) => {
    setVideoId(newVideoId);
    setVideoTitle(newVideoTitle);
    setVideoThumbnail(thumbnail);
    if (socket) {
      socket.emit("play-video", roomId, newVideoId, newVideoTitle);
    }
    setIsPlaying(true);
    setModal(false);
    showSuccess("Now playing: " + (newVideoTitle.length > 30 ? newVideoTitle.slice(0, 30) + "..." : newVideoTitle));
  }, [socket, roomId, showSuccess]);

  const sendMessage = useCallback((customMessage = null) => {
    const msgToSend = customMessage || message;
    if (!msgToSend.trim()) return;

    const data = { roomId, type: "text", message: msgToSend, senderId: userId };
    if (socket) {
      socket.emit("send-message", data);
    }
    setChat((prev) => [...prev, { type: "text", message: msgToSend, senderId: userId }]);
    if (!customMessage) setMessage("");
  }, [socket, message, roomId, userId]);

  const addEmoji = (emoji) => {
    setMessage(prev => prev + emoji);
    // Keep emoji picker open for multiple selections
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    showSuccess("Room code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (scroll.current) {
      scroll.current.scrollTop = scroll.current.scrollHeight;
    }
  }, [chat]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cyan-100 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      <div className="flex flex-col h-screen w-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 text-white relative overflow-hidden">
        {/* Background effects */}
        <div className="h-[700px] w-[700px] bg-cyan-500 rounded-full blur-[250px] opacity-15 absolute -bottom-48 -left-48"></div>
        <div className="h-[500px] w-[500px] bg-violet-500 rounded-full blur-[200px] opacity-10 absolute -top-24 -right-24"></div>

        <audio ref={notificationTone} src="/tone.mp3" preload="auto" />

        {/* Hidden YouTube Player (audio only) */}
        <div id="youtube-player" className="hidden"></div>

        {/* Header */}
        <div className="py-3 border-b border-cyan-500/20 backdrop-blur-xl bg-slate-900/60 relative z-10">
          <div className="flex items-center justify-between max-w-screen-lg mx-auto px-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <span className="text-base">🎵</span>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent hidden sm:inline">LoveTunes</span>
            </div>

            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${isConnected ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-amber-500/20 border-amber-500/40'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></div>
                <span className={`text-xs font-medium ${isConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isConnected ? 'Online' : 'Connecting'}
                </span>
              </div>

              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${roomUsers.length > 1 ? 'bg-pink-500/20 border-pink-500/40' : 'bg-slate-700/50 border-slate-600/50'}`}>
                <span className={`font-bold ${roomUsers.length > 1 ? 'text-pink-400' : 'text-slate-400'}`}>
                  {roomUsers.length || 1}
                </span>
                <span className="text-xs">{roomUsers.length > 1 ? '❤️' : '👤'}</span>
              </div>
            </div>

            <button
              onClick={copyRoomCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-cyan-500/20 hover:border-cyan-500/40"
            >
              <span className="text-cyan-400 font-mono text-xs">{roomId}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-cyan-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied && <span className="text-emerald-400 text-xs">✓</span>}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col max-w-screen-lg w-full mx-auto relative z-10 px-4 py-3 overflow-hidden">

          {/* Music Player Bar */}
          {videoId ? (
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 mb-3">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <img
                    src={videoThumbnail}
                    alt="Now playing"
                    className="w-16 h-16 rounded-xl object-cover ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-500/30"
                  />
                  {isPlaying && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50">
                      <div className="flex items-center gap-0.5">
                        <div className="w-0.5 h-2 bg-white rounded-full animate-music-bar-1"></div>
                        <div className="w-0.5 h-3 bg-white rounded-full animate-music-bar-2"></div>
                        <div className="w-0.5 h-1.5 bg-white rounded-full animate-music-bar-3"></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-cyan-400 uppercase tracking-widest font-semibold">Now Playing</p>
                  <p className="text-white font-semibold truncate text-base mt-0.5">{videoTitle}</p>
                  <p className="text-slate-400 text-xs mt-1">{formatTime(currentTime)} / {formatTime(duration)}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleSeek(-5)}
                  className="w-10 h-10 rounded-full bg-slate-700/50 hover:bg-slate-600/50 flex items-center justify-center transition-all hover:scale-105"
                  title="Rewind 5s"
                >
                  <span className="text-white text-xs font-bold">-5</span>
                </button>

                <button
                  onClick={handlePlayPause}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl hover:scale-105 ${isPlaying ? "bg-white text-slate-900 shadow-white/30" : "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-cyan-500/40"
                    }`}
                >
                  {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={() => handleSeek(5)}
                  className="w-10 h-10 rounded-full bg-slate-700/50 hover:bg-slate-600/50 flex items-center justify-center transition-all hover:scale-105"
                  title="Forward 5s"
                >
                  <span className="text-white text-xs font-bold">+5</span>
                </button>

                <button
                  onClick={() => setModal(true)}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 flex items-center justify-center transition-all hover:scale-105 ml-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setModal(true)}
              className="flex items-center justify-center p-6 bg-slate-800/50 rounded-2xl border border-dashed border-slate-600/50 mb-3 cursor-pointer hover:bg-slate-800/70 transition-all"
            >
              <div className="text-center">
                <span className="text-4xl mb-2 block">🎵</span>
                <p className="text-slate-400">Click to search and play music</p>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 py-2 px-1 custom-scrollbar" ref={scroll}>
            {chat.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <span className="text-4xl mb-2 block">💬</span>
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs text-slate-600 mt-1">Start chatting with your partner!</p>
                </div>
              </div>
            )}
            {chat.map((msg, index) => (
              <div
                key={index}
                className={`flex items-end gap-2 animate-fade-in ${msg.senderId === userId ? "justify-end" : "justify-start"}`}
              >
                {msg.senderId !== userId && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-sm">❤️</div>
                )}
                <div className={`py-2.5 px-4 max-w-[70%] rounded-2xl ${msg.senderId === userId
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-br-sm"
                  : "bg-slate-800/90 border border-pink-500/20 text-white rounded-bl-sm"
                  }`}>
                  <p className="text-sm leading-relaxed">{msg.message}</p>
                </div>
                {msg.senderId === userId && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-sm">😊</div>
                )}
              </div>
            ))}
          </div>

          {/* Emoji Picker */}
          {showEmoji && (
            <div className="mb-2 p-3 bg-slate-800/90 rounded-2xl border border-cyan-500/20 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700/50">
                <span className="text-xs text-cyan-400 font-medium">Click emojis to add (multiple allowed)</span>
                <button
                  onClick={() => setShowEmoji(false)}
                  className="px-3 py-1 text-xs bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all"
                >
                  Done ✓
                </button>
              </div>
              <div className="grid grid-cols-8 gap-1.5">
                {EMOJIS.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => addEmoji(emoji)}
                    className="w-10 h-10 rounded-lg hover:bg-cyan-500/20 flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className={`flex-shrink-0 w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${showEmoji ? 'bg-cyan-500/20 border-cyan-500/40' : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-600/50'
                }`}
            >
              <span className="text-xl">😊</span>
            </button>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 p-3.5 bg-slate-800/80 border border-cyan-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!message.trim()}
              className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-500/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Music Search Modal */}
      {modal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm z-50 p-4 animate-fade-in">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 w-full max-w-2xl rounded-3xl border border-cyan-500/20 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-700/50 bg-slate-800/50">
              <div>
                <h2 className="text-xl font-bold text-white">🎵 Search Music</h2>
                <p className="text-slate-400 text-sm mt-0.5">All users can search and play</p>
              </div>
              <button
                className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 flex items-center justify-center transition-all hover:scale-105"
                onClick={() => setModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 border-b border-slate-700/50">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchYouTube(searchQuery)}
                  placeholder="Search for a song..."
                  className="flex-1 p-4 bg-slate-800/80 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                />
                <button
                  onClick={() => searchYouTube(searchQuery)}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 font-semibold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-500/30"
                >
                  {isSearching ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                  Search
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {searchResults?.filter((v) => v.id?.videoId).length === 0 && !isSearching && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <span className="text-5xl mb-3">🎶</span>
                  <p className="text-lg">Search for your favorite songs</p>
                </div>
              )}
              {searchResults?.filter((v) => v.id?.videoId).map((video) => (
                <div
                  key={video.id.videoId}
                  className="flex items-center gap-4 p-4 hover:bg-cyan-500/10 cursor-pointer group border-b border-slate-800/50 transition-all"
                  onClick={() => handleVideoSelect(video.id.videoId, video.snippet.title, video.snippet.thumbnails?.medium?.url)}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url}
                      alt={video.snippet.title}
                      className="w-28 h-20 rounded-xl object-cover ring-1 ring-slate-700/50 group-hover:ring-cyan-400/50 transition-all"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium line-clamp-2 group-hover:text-cyan-400 transition-colors">{video.snippet.title}</p>
                    <p className="text-slate-500 text-sm mt-1">{video.snippet.channelTitle}</p>
                  </div>
                  <button className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-105 shadow-lg shadow-cyan-500/30">
                    Play
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatRoom;
