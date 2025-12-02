"use client"
import Image from 'next/image'
import { useRouter } from 'next/navigation';
import React, { useState, useCallback } from 'react'

const Page = () => {
  const router = useRouter()
  const [roomId, setRoomId] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  const handleCreateRoom = useCallback(() => {
    setIsCreating(true)
    const newRoom = `room-${Math.random().toString(36).substring(2, 9)}`;
    
    // Navigate directly to the room - room page will handle connection
    setTimeout(() => {
      router.push(`/room/${newRoom}`);
    }, 300)
  }, [router]);

  const handleJoinRoom = useCallback(() => {
    if (!roomId.trim()) return;
    
    setIsJoining(true)
    const trimmedRoomId = roomId.trim()
    
    // Navigate directly - room page will validate
    setTimeout(() => {
      router.push(`/room/${trimmedRoomId}`);
    }, 300)
  }, [roomId, router]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && roomId.trim()) {
      handleJoinRoom()
    }
  }, [handleJoinRoom, roomId])

  return (
    <div className='w-full min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-950 overflow-hidden relative'>
      {/* Animated Background Elements */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-purple-600 rounded-full blur-[200px] opacity-30 animate-pulse'></div>
        <div className='absolute -top-40 -right-40 w-[500px] h-[500px] bg-pink-600 rounded-full blur-[180px] opacity-25'></div>
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600 rounded-full blur-[250px] opacity-10'></div>
        
        {/* Floating particles */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-purple-400 rounded-full animate-float opacity-60"></div>
        <div className="absolute top-40 right-32 w-3 h-3 bg-pink-400 rounded-full animate-float-delayed opacity-50"></div>
        <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-violet-400 rounded-full animate-float opacity-40"></div>
        <div className="absolute bottom-48 right-1/4 w-4 h-4 bg-purple-300 rounded-full animate-float-delayed opacity-30"></div>
      </div>

      {/* Main Content */}
      <div className='flex items-center justify-center min-h-screen px-4'>
        <div className='max-w-lg w-full mx-auto flex items-center flex-col space-y-10 relative z-20'>
          
          {/* Logo Section */}
          <div className='text-center relative'>
            <div className='relative inline-block'>
              <Image 
                src="/heart.png" 
                alt="heart" 
                width={80} 
                height={80} 
                className='absolute -top-4 -right-12 animate-bounce-slow drop-shadow-2xl'
                priority
              />
              <h1 className='text-6xl md:text-8xl lg:text-[120px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 font-serif tracking-tight animate-gradient-x'>
                LoveTunes
              </h1>
            </div>
            <p className='text-lg md:text-2xl font-medium text-white/80 mt-4 tracking-wide'>
              Where Love and Music Sync
            </p>
            <p className='text-sm text-white/50 mt-2'>
              Listen together, no matter the distance
            </p>
          </div>

          {/* Action Cards */}
          <div className='w-full space-y-4'>
            {/* Create Room Card */}
            <div className='bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl hover:bg-white/10 transition-all duration-500 group'>
              <div className='flex items-center gap-4 mb-4'>
                <div className='w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30'>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h2 className='text-white font-semibold text-lg'>Create a Room</h2>
                  <p className='text-white/50 text-sm'>Start a new music session</p>
                </div>
              </div>
              <button 
                className='w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-2xl hover:opacity-90 transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed'
                onClick={handleCreateRoom}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating Room...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Room
                  </>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className='flex items-center gap-4'>
              <div className='flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent'></div>
              <span className='text-white/40 text-sm font-medium'>or</span>
              <div className='flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent'></div>
            </div>

            {/* Join Room Card */}
            <div className='bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl'>
              <div className='flex items-center gap-4 mb-4'>
                <div className='w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center'>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className='text-white font-semibold text-lg'>Join a Room</h2>
                  <p className='text-white/50 text-sm'>Enter a room code to join your partner</p>
                </div>
              </div>
              <div className='space-y-3'>
                <input 
                  type="text" 
                  onChange={(e) => setRoomId(e.target.value)} 
                  value={roomId} 
                  placeholder='Enter room code (e.g., room-abc123)' 
                  className='w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 font-mono'
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                  spellCheck="false"
                />
                <button 
                  className='w-full py-4 bg-white/10 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all duration-300 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 flex items-center justify-center gap-2'
                  disabled={!roomId.trim() || isJoining} 
                  onClick={handleJoinRoom}
                >
                  {isJoining ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Joining Room...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Join Room
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* How it works */}
            <div className='bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10'>
              <h3 className='text-white font-semibold mb-4 flex items-center gap-2'>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How it works
              </h3>
              <div className='space-y-3 text-sm'>
                <div className='flex items-start gap-3'>
                  <div className='w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0'>1</div>
                  <p className='text-white/60'>Create a room or join with a code</p>
                </div>
                <div className='flex items-start gap-3'>
                  <div className='w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0'>2</div>
                  <p className='text-white/60'>Share the room code with your partner</p>
                </div>
                <div className='flex items-start gap-3'>
                  <div className='w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0'>3</div>
                  <p className='text-white/60'>Search & play music together in sync!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className='text-center text-white/30 text-sm'>
            <p>Made with ❤️ for couples who love music</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Page
