"use client"
import ChatRoom from '@/app/_components/chat/page'
import React, { use } from 'react'

const Page = ({params}) => {
    const { roomId } = use(params)
    
  return (
    <ChatRoom roomId={roomId} />
  )
}

export default Page
