import { type FormEvent, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import './App.css'

type User = {
  id: number
  username: string
  email: string
  avatar: string | null
  created_at: string
}

type Role = {
  id: number
  server: number
  name: string
  color: string
  icon: string
  position: number
  hoist: boolean
  mentionable: boolean
  is_default: boolean
  created_at: string
  member_count: number
  administrator: boolean
  create_instant_invite: boolean
  kick_members: boolean
  ban_members: boolean
  manage_channels: boolean
  manage_roles: boolean
  manage_webhooks: boolean
  view_audit_log: boolean
  view_channel: boolean
  send_messages: boolean
  send_tts_messages: boolean
  manage_messages: boolean
  embed_links: boolean
  attach_files: boolean
  read_message_history: boolean
  mention_everyone: boolean
  use_external_emojis: boolean
  add_reactions: boolean
  connect: boolean
  speak: boolean
  mute_members: boolean
  deafen_members: boolean
  move_members: boolean
  use_voice_activity: boolean
  priority_speaker: boolean
  request_to_speak: boolean
  change_nickname: boolean
  manage_nicknames: boolean
}

type Server = {
  id: number
  name: string
  owner: number
  owner_username?: string
  icon: string | null
  created_at: string
  roles: Role[]
  member_count: number
  channel_count: number
  is_owner: boolean
}

type Channel = {
  id: number
  server: number
  server_name?: string
  name: string
  channel_type: 'text' | 'voice'
  created_at: string
}

type Member = {
  id: number
  server: number
  user: number
  username: string
  user_username?: string
  avatar: string | null
  roles: Role[]
  joined_at: string
}

type Message = {
  id: number
  author: number
  author_username: string
  channel: number
  channel_name?: string
  content: string
  created_at: string
  edited_at: string | null
}

type DirectMessage = {
  id: number
  conversation: number
  author: number
  author_username: string
  content: string
  created_at: string
  edited_at: string | null
}

type DirectConversation = {
  id: number
  members: User[]
  last_message: DirectMessage | null
  created_at: string
  updated_at: string
}

type ProfileCardUser = {
  id: number
  username: string
  avatar: string | null
  email?: string | null
  created_at?: string
}

type PermissionForm = {
  name: string
  color: string
  icon: string
  hoist: boolean
  mentionable: boolean
  administrator: boolean
  create_instant_invite: boolean
  kick_members: boolean
  ban_members: boolean
  manage_channels: boolean
  manage_roles: boolean
  manage_webhooks: boolean
  view_audit_log: boolean
  view_channel: boolean
  send_messages: boolean
  send_tts_messages: boolean
  manage_messages: boolean
  embed_links: boolean
  attach_files: boolean
  read_message_history: boolean
  mention_everyone: boolean
  use_external_emojis: boolean
  add_reactions: boolean
  connect: boolean
  speak: boolean
  mute_members: boolean
  deafen_members: boolean
  move_members: boolean
  use_voice_activity: boolean
  priority_speaker: boolean
  request_to_speak: boolean
  change_nickname: boolean
  manage_nicknames: boolean
}

type ServerSettingsTab = 'general' | 'roles' | 'members'
type WorkspaceMode = 'server' | 'friends'

const ROLE_PERMISSION_OPTIONS = [
  ['administrator', 'Administrator'],
  ['create_instant_invite', 'Create invites'],
  ['kick_members', 'Kick members'],
  ['ban_members', 'Ban members'],
  ['manage_channels', 'Manage channels'],
  ['manage_roles', 'Manage roles'],
  ['manage_webhooks', 'Manage webhooks'],
  ['view_audit_log', 'View audit log'],
  ['view_channel', 'View channels'],
  ['send_messages', 'Send messages'],
  ['send_tts_messages', 'Send TTS'],
  ['manage_messages', 'Manage messages'],
  ['embed_links', 'Embed links'],
  ['attach_files', 'Attach files'],
  ['read_message_history', 'Read history'],
  ['mention_everyone', 'Mention everyone'],
  ['use_external_emojis', 'External emojis'],
  ['add_reactions', 'Add reactions'],
  ['connect', 'Connect'],
  ['speak', 'Speak'],
  ['mute_members', 'Mute members'],
  ['deafen_members', 'Deafen members'],
  ['move_members', 'Move members'],
  ['use_voice_activity', 'Use voice activity'],
  ['priority_speaker', 'Priority speaker'],
  ['request_to_speak', 'Request to speak'],
  ['change_nickname', 'Change nickname'],
  ['manage_nicknames', 'Manage nicknames'],
] as const

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'
const TOKEN_KEY = 'localspeaking_token'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
})

const timeFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function buildWebSocketUrl(kind: 'chat' | 'dm' | 'voice', id: number) {
  const url = new URL(API_BASE)

  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname =
    kind === 'chat'
      ? `/ws/chat/${id}/`
      : kind === 'dm'
        ? `/ws/dm/${id}/`
        : `/ws/voice/${id}/`
  url.search = ''

  return url.toString()
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function formatDate(value: string) {
  return timeFormatter.format(new Date(value))
}

function roleIdsFromMember(member: Member | null) {
  return member ? member.roles.map((role) => role.id) : []
}

function conversationPartner(conversation: DirectConversation, userId: number) {
  return conversation.members.find((member) => member.id !== userId) ?? null
}

function buildVoicePeerConnection(
  remoteUserId: number,
  remoteUsername: string,
  localStream: MediaStream | null,
  audioRefs: { current: Record<number, HTMLAudioElement | null> },
  videoRefs: { current: Record<number, HTMLVideoElement | null> },
  remoteStreams: { current: Record<number, MediaStream> },
  onParticipantUpdate: (participant: { id: number; username: string }) => void,
  onRemoveParticipant: (remoteUserId: number) => void,
  onSendSignal: (signal: Record<string, unknown>) => void,
) {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302'] },
    ],
  })

  if (localStream) {
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))
  }

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onSendSignal({
        action: 'candidate',
        to: remoteUserId,
        payload: {
          candidate: event.candidate,
        },
      })
    }
  }

  pc.ontrack = (event) => {
    let stream = event.streams[0]

    if (!stream) {
      stream = new MediaStream()
    }

    if (event.track && !stream.getTrackById(event.track.id)) {
      stream.addTrack(event.track)
    }

    if (remoteStreams.current[remoteUserId]) {
      const existingStream = remoteStreams.current[remoteUserId]
      if (!existingStream.getTrackById(event.track.id)) {
        existingStream.addTrack(event.track)
      }
      stream = existingStream
    }

    remoteStreams.current[remoteUserId] = stream
    onParticipantUpdate({ id: remoteUserId, username: remoteUsername })

    const audioElement = audioRefs.current[remoteUserId]
    if (audioElement) {
      audioElement.srcObject = stream
    }

    const videoElement = videoRefs.current[remoteUserId]
    if (videoElement) {
      videoElement.srcObject = stream
    }
  }

  pc.onconnectionstatechange = () => {
    if (
      pc.connectionState === 'failed' ||
      pc.connectionState === 'closed' ||
      pc.connectionState === 'disconnected'
    ) {
      pc.close()
      onRemoveParticipant(remoteUserId)
    }
  }

  return pc
}

function extractErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data

    if (typeof data === 'string') {
      return data
    }

    if (data && typeof data === 'object') {
      const firstValue = Object.values(data)[0]
      if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') {
        return firstValue[0]
      }

      if (typeof firstValue === 'string') {
        return firstValue
      }
    }

    if (error.response?.status === 500) {
      return 'Server error while creating the resource. Check backend logs and migrations.'
    }
  }

  return fallback
}

function App() {
  const [servers, setServers] = useState<Server[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [directConversations, setDirectConversations] = useState<DirectConversation[]>([])
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [selectedServerId, setSelectedServerId] = useState<number | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null)
  const [selectedDirectConversationId, setSelectedDirectConversationId] = useState<number | null>(null)
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('server')
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false)
  const [serverSettingsTab, setServerSettingsTab] = useState<ServerSettingsTab>('general')
  const [serverCreateOpen, setServerCreateOpen] = useState(false)
  const [profileUser, setProfileUser] = useState<ProfileCardUser | null>(null)
  const [directForm, setDirectForm] = useState({ username: '' })
  const [memberRoleIds, setMemberRoleIds] = useState<number[]>([])
  const [authForm, setAuthForm] = useState({
    username: '',
    password: '',
  })
  const [serverForm, setServerForm] = useState({
    name: '',
  })
  const [serverEditForm, setServerEditForm] = useState({
    name: '',
    icon: '',
  })
  const [channelForm, setChannelForm] = useState({
    name: '',
    channel_type: 'text' as Channel['channel_type'],
  })
  const [roleForm, setRoleForm] = useState<PermissionForm>({
    name: '',
    color: '#5865f2',
    icon: '',
    hoist: false,
    mentionable: false,
    administrator: false,
    create_instant_invite: false,
    kick_members: false,
    ban_members: false,
    manage_channels: false,
    manage_roles: false,
    manage_webhooks: false,
    view_audit_log: false,
    view_channel: true,
    send_messages: true,
    send_tts_messages: false,
    manage_messages: false,
    embed_links: true,
    attach_files: true,
    read_message_history: true,
    mention_everyone: false,
    use_external_emojis: false,
    add_reactions: true,
    connect: true,
    speak: true,
    mute_members: false,
    deafen_members: false,
    move_members: false,
    use_voice_activity: true,
    priority_speaker: false,
    request_to_speak: false,
    change_nickname: true,
    manage_nicknames: false,
  })
  const [memberForm, setMemberForm] = useState({
    username: '',
  })
  const [composer, setComposer] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isLoadingServers, setIsLoadingServers] = useState(false)
  const [isLoadingChannels, setIsLoadingChannels] = useState(false)
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isManaging, setIsManaging] = useState(false)
  const [socketState, setSocketState] = useState<
    'idle' | 'connecting' | 'live' | 'closed'
  >('idle')
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  )

  const socketRef = useRef<WebSocket | null>(null)
  const voiceSocketRef = useRef<WebSocket | null>(null)
  const messageIdsRef = useRef<Set<number>>(new Set())
  const messageFeedRef = useRef<HTMLDivElement | null>(null)
  const voiceLocalStreamRef = useRef<MediaStream | null>(null)
  const voiceScreenStreamRef = useRef<MediaStream | null>(null)
  const voicePeersRef = useRef<Record<number, RTCPeerConnection>>({})
  const voiceAudioRefs = useRef<Record<number, HTMLAudioElement | null>>({})
  const voiceVideoRefs = useRef<Record<number, HTMLVideoElement | null>>({})
  const localScreenVideoRef = useRef<HTMLVideoElement | null>(null)
  const voiceRemoteStreamsRef = useRef<Record<number, MediaStream>>({})
  const voiceScreenSendersRef = useRef<Record<number, RTCRtpSender[]>>({})

  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'live' | 'closed'>('idle')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [voiceParticipants, setVoiceParticipants] = useState<{ id: number; username: string }[]>([])
  const [isVoiceMuted, setIsVoiceMuted] = useState(false)
  const [isVoiceDeafened, setIsVoiceDeafened] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [screenShareError, setScreenShareError] = useState<string | null>(null)
  const [voiceSharingIds, setVoiceSharingIds] = useState<number[]>([])

  const addVoiceParticipant = (participant: { id: number; username: string }) => {
    setVoiceParticipants((current) =>
      current.some((item) => item.id === participant.id)
        ? current
        : [...current, participant],
    )
  }

  const removeVoiceParticipant = (remoteUserId: number) => {
    setVoiceParticipants((current) =>
      current.filter((participant) => participant.id !== remoteUserId),
    )

    if (voicePeersRef.current[remoteUserId]) {
      voicePeersRef.current[remoteUserId].close()
      delete voicePeersRef.current[remoteUserId]
    }

    delete voiceRemoteStreamsRef.current[remoteUserId]
    delete voiceAudioRefs.current[remoteUserId]
    delete voiceVideoRefs.current[remoteUserId]
    delete voiceScreenSendersRef.current[remoteUserId]
    setVoiceSharingIds((current) => current.filter((id) => id !== remoteUserId))
  }

  const stopScreenShare = () => {
    if (voiceScreenStreamRef.current) {
      voiceScreenStreamRef.current.getTracks().forEach((track) => track.stop())
      voiceScreenStreamRef.current = null
    }

    if (localScreenVideoRef.current) {
      localScreenVideoRef.current.srcObject = null
    }

    Object.entries(voiceScreenSendersRef.current).forEach(([remoteId, senders]) => {
      const peer = voicePeersRef.current[Number(remoteId)]
      senders.forEach((sender) => {
        try {
          peer.removeTrack(sender)
        } catch {
          // ignore if sender has already been removed
        }
        sender.track?.stop()
      })
    })
    voiceScreenSendersRef.current = {}
    setIsScreenSharing(false)
    sendVoiceSignal({ action: 'screen-share-stop' })
    setVoiceSharingIds((current) => current.filter((id) => id !== currentUser?.id))
  }

  const cleanupVoiceCall = () => {
    try {
      if (voiceSocketRef.current && voiceSocketRef.current.readyState === WebSocket.OPEN) {
        voiceSocketRef.current.send(JSON.stringify({ action: 'leave', from: currentUser?.id }))
      }
    } catch (e) {
      // ignore send errors
    }

    voiceSocketRef.current?.close()
    voiceSocketRef.current = null

    Object.values(voicePeersRef.current).forEach((peer) => peer.close())
    voicePeersRef.current = {}
    voiceRemoteStreamsRef.current = {}
    voiceAudioRefs.current = {}
    voiceVideoRefs.current = {}

    voiceScreenStreamRef.current?.getTracks().forEach((track) => track.stop())
    voiceScreenStreamRef.current = null
    if (localScreenVideoRef.current) {
      localScreenVideoRef.current.srcObject = null
    }
    Object.entries(voiceScreenSendersRef.current).forEach(([remoteId, senders]) => {
      const peer = voicePeersRef.current[Number(remoteId)]
      senders.forEach((sender) => {
        try {
          peer.removeTrack(sender)
        } catch {
          // ignore
        }
        sender.track?.stop()
      })
    })
    voiceScreenSendersRef.current = {}

    voiceLocalStreamRef.current?.getTracks().forEach((track) => track.stop())
    voiceLocalStreamRef.current = null

    setVoiceParticipants([])
    setVoiceStatus('idle')
    setVoiceError(null)
    setIsVoiceMuted(false)
    setIsVoiceDeafened(false)
    setIsScreenSharing(false)
    setScreenShareError(null)
    setVoiceSharingIds([])
  }

  const sendVoiceSignal = (signal: Record<string, unknown>) => {
    if (!voiceSocketRef.current || voiceSocketRef.current.readyState !== WebSocket.OPEN) {
      return
    }

    const withFrom = {
      ...signal,
      from: currentUser?.id,
    }

    voiceSocketRef.current.send(JSON.stringify(withFrom))
  }

  const startScreenShare = async () => {
    if (!voiceSocketRef.current || voiceSocketRef.current.readyState !== WebSocket.OPEN) {
      setScreenShareError('Voice connection must be live to share screen.')
      return
    }

    try {
      let screenStream: MediaStream
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      } catch {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      }

      voiceScreenStreamRef.current = screenStream
      if (localScreenVideoRef.current) {
        localScreenVideoRef.current.srcObject = screenStream
      }
      setIsScreenSharing(true)
      setScreenShareError(null)
      sendVoiceSignal({ action: 'screen-share-start', username: currentUser?.username })
      setVoiceSharingIds((current) =>
        current.includes(currentUser?.id ?? 0)
          ? current
          : [...current, currentUser?.id ?? 0],
      )

      screenStream.getTracks().forEach((track) => {
        track.onended = () => {
          stopScreenShare()
        }
      })

      Object.entries(voicePeersRef.current).forEach(([remoteId, peer]) => {
        const senders: RTCRtpSender[] = []
        screenStream.getTracks().forEach((track) => {
          senders.push(peer.addTrack(track, screenStream))
        })
        voiceScreenSendersRef.current[Number(remoteId)] = senders
      })
    } catch (error) {
      setScreenShareError('Unable to start screen share. Please allow access to a display.')
    }
  }

  const getVoicePeer = (
    remoteUserId: number,
    remoteUsername: string,
  ): RTCPeerConnection => {
    const existing = voicePeersRef.current[remoteUserId]
    if (existing) {
      return existing
    }

    const peer = buildVoicePeerConnection(
      remoteUserId,
      remoteUsername,
      voiceLocalStreamRef.current,
      voiceAudioRefs,
      voiceVideoRefs,
      voiceRemoteStreamsRef,
      addVoiceParticipant,
      removeVoiceParticipant,
      (signal) => {
        sendVoiceSignal({ ...signal, to: remoteUserId })
      },
    )

    if (isScreenSharing && voiceScreenStreamRef.current) {
      const senders: RTCRtpSender[] = []
      voiceScreenStreamRef.current.getTracks().forEach((track) => {
        senders.push(peer.addTrack(track, voiceScreenStreamRef.current!))
      })
      voiceScreenSendersRef.current[remoteUserId] = senders
    }

    voicePeersRef.current[remoteUserId] = peer
    addVoiceParticipant({ id: remoteUserId, username: remoteUsername })
    return peer
  }

  useEffect(() => {
    const loadMe = async () => {
      if (!token) {
        return
      }

      try {
        const response = await api.get<User>('/api/users/me/', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        setCurrentUser(response.data)
        setAuthError(null)
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setCurrentUser(null)
        setStatusMessage(null)
        setAuthError('Session expired. Please sign in again.')
      }
    }

    void loadMe()
  }, [token])

  useEffect(() => {
    const loadServers = async () => {
      setIsLoadingServers(true)

      try {
        const response = await api.get<Server[]>('/api/servers/', {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        })

        const nextServers = response.data
        setServers(nextServers)

        setSelectedServerId((current) => {
          if (current && nextServers.some((server) => server.id === current)) {
            return current
          }

          return nextServers[0]?.id ?? null
        })
      } catch {
        setServers([])
      } finally {
        setIsLoadingServers(false)
      }
    }

    void loadServers()
  }, [token])

  useEffect(() => {
    if (!selectedServerId) {
      return
    }

    const loadServerData = async () => {
      setIsLoadingChannels(true)
      setIsLoadingRoles(true)
      setIsLoadingMembers(true)

      try {
        const [channelsResponse, rolesResponse, membersResponse] =
          await Promise.all([
            api.get<Channel[]>('/api/channels/', {
              params: { server: selectedServerId },
            }),
            api.get<Role[]>(`/api/servers/${selectedServerId}/roles/`),
            api.get<Member[]>(`/api/servers/${selectedServerId}/members/`),
          ])

        const nextChannels = channelsResponse.data
        const nextRoles = rolesResponse.data
        const nextMembers = membersResponse.data

        setChannels(nextChannels)
        setRoles(nextRoles)
        setMembers(nextMembers)

        setSelectedChannelId((current) => {
          if (current && nextChannels.some((channel) => channel.id === current)) {
            return current
          }

          return nextChannels[0]?.id ?? null
        })

        const currentMember = nextMembers.find(
          (member) => member.username === currentUser?.username,
        )
        const nextSelectedMemberId = currentMember?.id ?? nextMembers[0]?.id ?? null

        setSelectedMemberId(nextSelectedMemberId)
        setMemberRoleIds(
          roleIdsFromMember(
            nextMembers.find((member) => member.id === nextSelectedMemberId) ?? null,
          ),
        )
        setSocketState(nextChannels[0]?.id ? 'connecting' : 'idle')
      } catch {
        setChannels([])
        setRoles([])
        setMembers([])
      } finally {
        setIsLoadingChannels(false)
        setIsLoadingRoles(false)
        setIsLoadingMembers(false)
      }
    }

    void loadServerData()
  }, [selectedServerId, currentUser?.username])

  useEffect(() => {
    const loadDirectConversations = async () => {
      if (!token || !currentUser) {
        setDirectConversations([])
        return
      }

      try {
        const response = await api.get<DirectConversation[]>('/api/messages/direct-conversations/', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        setDirectConversations(response.data)
      } catch {
        setDirectConversations([])
      }
    }

    void loadDirectConversations()
  }, [token, currentUser])

  useEffect(() => {
    if (workspaceMode !== 'server' || !selectedChannelId || !token) {
      return
    }

    const activeChannel = channels.find((channel) => channel.id === selectedChannelId)
    if (activeChannel?.channel_type === 'voice') {
      setMessages([])
      setIsLoadingMessages(false)
      return
    }

    const loadMessages = async () => {
      setIsLoadingMessages(true)

      try {
        const response = await api.get<Message[]>('/api/messages/', {
          params: { channel: selectedChannelId },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        messageIdsRef.current = new Set(response.data.map((message) => message.id))
        setMessages(response.data)
      } catch {
        messageIdsRef.current = new Set()
        setMessages([])
      } finally {
        setIsLoadingMessages(false)
      }
    }

    void loadMessages()
  }, [selectedChannelId, token, workspaceMode])

  useEffect(() => {
    if (workspaceMode !== 'friends' || !selectedDirectConversationId || !token) {
      return
    }

    const loadDirectMessages = async () => {
      setIsLoadingMessages(true)

      try {
        const response = await api.get<DirectMessage[]>(
          `/api/messages/direct-conversations/${selectedDirectConversationId}/messages/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        messageIdsRef.current = new Set(response.data.map((message) => message.id))
        setDirectMessages(response.data)
      } catch {
        messageIdsRef.current = new Set()
        setDirectMessages([])
      } finally {
        setIsLoadingMessages(false)
      }
    }

    void loadDirectMessages()
  }, [selectedDirectConversationId, token, workspaceMode])

  useEffect(() => {
    const user = currentUser
    const channelId = selectedChannelId
    const conversationId = selectedDirectConversationId
    const activeChannel = channels.find((channel) => channel.id === channelId)

    if (workspaceMode === 'server' && (!channelId || !user)) {
      socketRef.current?.close()
      socketRef.current = null
      return
    }

    if (workspaceMode === 'server' && activeChannel?.channel_type === 'voice') {
      socketRef.current?.close()
      socketRef.current = null
      setSocketState('idle')
      return
    }

    if (workspaceMode === 'friends' && (!conversationId || !user)) {
      socketRef.current?.close()
      socketRef.current = null
      return
    }

    if (!user) {
      return
    }

    const socket = new WebSocket(
      workspaceMode === 'server'
        ? buildWebSocketUrl('chat', channelId!)
        : buildWebSocketUrl('dm', conversationId!),
    )
    socketRef.current = socket

    socket.addEventListener('open', () => {
      setSocketState('live')
      setStatusMessage(null)
    })

    socket.addEventListener('close', () => {
      setSocketState('closed')
    })

    socket.addEventListener('error', () => {
      setSocketState('closed')
      setStatusMessage('Realtime socket is unavailable right now.')
    })

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data) as Partial<Message> & Partial<DirectMessage> & {
          message?: string
        }

        if (workspaceMode === 'friends') {
          const nextMessage: DirectMessage = {
            id: payload.id ?? Date.now(),
            conversation: payload.conversation ?? conversationId ?? 0,
            author: payload.author ?? user.id,
            author_username: payload.author_username ?? user.username,
            content: payload.content ?? payload.message ?? '',
            created_at: payload.created_at ?? new Date().toISOString(),
            edited_at: payload.edited_at ?? null,
          }

          if (!messageIdsRef.current.has(nextMessage.id)) {
            messageIdsRef.current.add(nextMessage.id)
            setDirectMessages((current) => [...current, nextMessage])
          }
        } else {
          const nextMessage: Message = {
            id: payload.id ?? Date.now(),
            author: payload.author ?? user.id,
            author_username: payload.author_username ?? user.username,
            channel: payload.channel ?? channelId!,
            channel_name: payload.channel_name,
            content: payload.content ?? payload.message ?? '',
            created_at: payload.created_at ?? new Date().toISOString(),
            edited_at: payload.edited_at ?? null,
          }

          if (!messageIdsRef.current.has(nextMessage.id)) {
            messageIdsRef.current.add(nextMessage.id)
            setMessages((current) => [...current, nextMessage])
          }
        }
      } catch {
        setStatusMessage('Received an invalid realtime payload.')
      }
    })

    return () => {
      socket.close()
      if (socketRef.current === socket) {
        socketRef.current = null
      }
    }
  }, [selectedChannelId, selectedDirectConversationId, currentUser, workspaceMode])

  useEffect(() => {
    if (workspaceMode !== 'server' || !selectedChannelId || !currentUser) {
      cleanupVoiceCall()
      return
    }

    const activeChannel = channels.find((channel) => channel.id === selectedChannelId)
    if (activeChannel?.channel_type !== 'voice') {
      cleanupVoiceCall()
      return
    }

    let isMounted = true
    setVoiceStatus('connecting')

    const connectVoice = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        voiceLocalStreamRef.current = stream
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !isVoiceMuted
        })

        const socket = new WebSocket(buildWebSocketUrl('voice', selectedChannelId))
        voiceSocketRef.current = socket

        socket.addEventListener('open', () => {
          setVoiceStatus('live')
          setVoiceError(null)
          sendVoiceSignal({
            action: 'join',
            username: currentUser.username,
          })
        })

        socket.addEventListener('close', () => {
          setVoiceStatus('closed')
        })

        socket.addEventListener('error', () => {
          setVoiceStatus('closed')
          setVoiceError('Realtime voice signaling is unavailable.')
        })

        socket.addEventListener('message', async (event) => {
          const data = JSON.parse(event.data) as {
            action: string
            from?: number
            to?: number
            username?: string
            payload?: { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }
          }

          if (data.from === currentUser.id) {
            return
          }

          if (data.to && data.to !== currentUser.id) {
            return
          }

          const remoteId = data.from ?? 0
          const remoteUsername = data.username ?? 'Unknown'

          switch (data.action) {
            case 'join': {
              addVoiceParticipant({ id: remoteId, username: remoteUsername })
              const peer = getVoicePeer(remoteId, remoteUsername)
              try {
                const offer = await peer.createOffer()
                await peer.setLocalDescription(offer)
                sendVoiceSignal({
                  action: 'offer',
                  to: remoteId,
                  payload: { sdp: offer },
                })
              } catch (error) {
                console.warn('Voice offer creation failed', error)
              }
              break
            }
            case 'screen-share-start': {
              setVoiceSharingIds((current) =>
                current.includes(remoteId) ? current : [...current, remoteId],
              )
              addVoiceParticipant({ id: remoteId, username: remoteUsername })
              break
            }
            case 'screen-share-stop': {
              setVoiceSharingIds((current) => current.filter((id) => id !== remoteId))
              break
            }
            case 'offer': {
              const peer = getVoicePeer(remoteId, remoteUsername)
              try {
                await peer.setRemoteDescription(data.payload?.sdp!) 
                const answer = await peer.createAnswer()
                await peer.setLocalDescription(answer)
                sendVoiceSignal({
                  action: 'answer',
                  to: remoteId,
                  payload: { sdp: answer },
                })
              } catch (error) {
                console.warn('Voice offer handling failed', error)
              }
              break
            }
            case 'answer': {
              const peer = voicePeersRef.current[remoteId]
              if (!peer) {
                break
              }
              try {
                await peer.setRemoteDescription(data.payload?.sdp!)
              } catch (error) {
                console.warn('Voice answer handling failed', error)
              }
              break
            }
            case 'candidate': {
              const peer = voicePeersRef.current[remoteId]
              if (!peer || !data.payload?.candidate) {
                break
              }
              try {
                await peer.addIceCandidate(data.payload.candidate)
              } catch (error) {
                console.warn('Voice ICE candidate failed', error)
              }
              break
            }
            case 'leave': {
              removeVoiceParticipant(remoteId)
              break
            }
            default:
              break
          }
        })
      } catch (error) {
        setVoiceStatus('closed')
        setVoiceError('Unable to access microphone. Allow microphone access and reload.')
      }
    }

    void connectVoice()

    return () => {
      isMounted = false
      cleanupVoiceCall()
    }
  }, [channels, currentUser, selectedChannelId, workspaceMode])

  useEffect(() => {
    if (!voiceLocalStreamRef.current) {
      return
    }

    voiceLocalStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !isVoiceMuted
    })
  }, [isVoiceMuted])

  useEffect(() => {
    Object.values(voiceAudioRefs.current).forEach((element) => {
      if (element) {
        element.muted = isVoiceDeafened
      }
    })
  }, [isVoiceDeafened])

  useEffect(() => {
    if (localScreenVideoRef.current && voiceScreenStreamRef.current) {
      localScreenVideoRef.current.srcObject = voiceScreenStreamRef.current
    }
  }, [isScreenSharing])

  useEffect(() => {
    const feed = messageFeedRef.current

    if (feed) {
      feed.scrollTop = feed.scrollHeight
    }
  }, [messages, directMessages, workspaceMode])

  const activeServer =
    servers.find((server) => server.id === selectedServerId) ?? null
  const activeChannel =
    channels.find((channel) => channel.id === selectedChannelId) ?? null
  const activeDirectConversation =
    directConversations.find((conversation) => conversation.id === selectedDirectConversationId) ?? null
  const selectedMember =
    members.find((member) => member.id === selectedMemberId) ?? null
  const canManageServer = Boolean(currentUser && activeServer?.is_owner)
  const activeMessages = workspaceMode === 'friends' ? directMessages : messages
  const voiceParticipantRows = [
    ...(currentUser
      ? [{ id: currentUser.id, username: currentUser.username, isLocal: true }]
      : []),
    ...voiceParticipants.filter((participant) => participant.id !== currentUser?.id),
  ]
  const activeTitle =
    workspaceMode === 'friends'
      ? activeDirectConversation
        ? `@${conversationPartner(activeDirectConversation, currentUser?.id ?? 0)?.username ?? 'DM'}`
        : 'Friends'
      : activeChannel
        ? `#${activeChannel.name}`
        : 'No channel selected'

  const selectMember = (member: Member) => {
    setSelectedMemberId(member.id)
    setMemberRoleIds(roleIdsFromMember(member))
  }

  const toProfileUser = (user: User | Member): ProfileCardUser => {
    if ('email' in user) {
      return user
    }

    return {
      id: user.user,
      username: user.username,
      avatar: user.avatar,
    }
  }

  const openProfile = (user: ProfileCardUser) => {
    setProfileUser(user)
  }

  const closeProfile = () => {
    setProfileUser(null)
  }

  const openServerSettings = (tab: ServerSettingsTab = 'general') => {
    if (activeServer) {
      setServerEditForm({
        name: activeServer.name,
        icon: activeServer.icon ?? '',
      })
    }
    setServerSettingsTab(tab)
    setServerSettingsOpen(true)
  }

  const closeServerSettings = () => {
    setServerSettingsOpen(false)
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setIsAuthenticating(true)
    setAuthError(null)

    try {
      const response = await api.post<{ access: string; refresh: string }>(
        '/api/users/login/',
        {
          username: authForm.username.trim(),
          password: authForm.password,
        },
      )

      const nextToken = response.data.access
      localStorage.setItem(TOKEN_KEY, nextToken)
      setToken(nextToken)

      const me = await api.get<User>('/api/users/me/', {
        headers: {
          Authorization: `Bearer ${nextToken}`,
        },
      })

      setCurrentUser(me.data)
      setAuthForm((current) => ({
        ...current,
        password: '',
      }))
      setStatusMessage('Signed in successfully.')
    } catch {
      setAuthError('Login failed. Check your username and password.')
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setCurrentUser(null)
    setServers([])
    setChannels([])
    setRoles([])
    setMembers([])
    setMessages([])
    setDirectConversations([])
    setDirectMessages([])
    setSelectedServerId(null)
    setSelectedChannelId(null)
    setSelectedDirectConversationId(null)
    setWorkspaceMode('server')
    setSelectedMemberId(null)
    setMemberRoleIds([])
    setSocketState('idle')
    socketRef.current?.close()
    socketRef.current = null
    messageIdsRef.current = new Set()
    setStatusMessage('Signed out.')
  }

  const handleCreateServer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token || !serverForm.name.trim()) {
      return
    }

    setIsManaging(true)

    try {
      const response = await api.post<Server>(
        '/api/servers/',
        {
          name: serverForm.name.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const nextServer = response.data
      setServers((current) => [nextServer, ...current.filter((server) => server.id !== nextServer.id)])
      setServerForm({ name: '' })
      setServerCreateOpen(false)
      setSelectedServerId(nextServer.id)
      setWorkspaceMode('server')
      setSelectedChannelId(null)
      setSelectedDirectConversationId(null)
      setSocketState('idle')
      setMessages([])
      setDirectMessages([])
      setMessageIdsToEmpty()
      setStatusMessage(`Created server "${nextServer.name}".`)
    } catch (error: unknown) {
      setStatusMessage(
        extractErrorMessage(
          error,
          'Could not create the server. If you just updated the schema, run migrations.',
        ),
      )
    } finally {
      setIsManaging(false)
    }
  }

  const handleSaveServerSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token || !activeServer || !canManageServer) {
      return
    }

    setIsManaging(true)

    try {
      const response = await api.patch<Server>(
        `/api/servers/${activeServer.id}/`,
        {
          name: serverEditForm.name.trim(),
          icon: serverEditForm.icon.trim() || null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const nextServer = response.data
      setServers((current) =>
        current.map((server) => (server.id === nextServer.id ? nextServer : server)),
      )
      setStatusMessage(`Updated server "${nextServer.name}".`)
      setServerSettingsOpen(false)
    } catch {
      setStatusMessage('Could not update the server settings.')
    } finally {
      setIsManaging(false)
    }
  }

  const handleDeleteServer = async () => {
    if (!token || !activeServer || !canManageServer) {
      return
    }

    const confirmed = window.confirm(`Delete server "${activeServer.name}"? This cannot be undone.`)

    if (!confirmed) {
      return
    }

    setIsManaging(true)

    try {
      await api.delete(`/api/servers/${activeServer.id}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const removedServerId = activeServer.id
      setServers((current) => current.filter((server) => server.id !== removedServerId))
      setSelectedServerId(null)
      setSelectedChannelId(null)
      setSelectedMemberId(null)
      setMemberRoleIds([])
      setChannels([])
      setRoles([])
      setMembers([])
      setMessages([])
      setSocketState('idle')
      setServerSettingsOpen(false)
      setStatusMessage(`Deleted server "${activeServer.name}".`)
    } catch {
      setStatusMessage('Could not delete the server.')
    } finally {
      setIsManaging(false)
    }
  }

  const handleCreateChannel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token || !selectedServerId || !channelForm.name.trim()) {
      return
    }

    setIsManaging(true)

    try {
      const response = await api.post<Channel>(
        '/api/channels/',
        {
          server: selectedServerId,
          name: channelForm.name.trim(),
          channel_type: channelForm.channel_type,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const nextChannel = response.data
      setChannels((current) => [
        nextChannel,
        ...current.filter((channel) => channel.id !== nextChannel.id),
      ])
      setChannelForm({ name: '', channel_type: 'text' })
      setWorkspaceMode('server')
      setSelectedChannelId(nextChannel.id)
      setSelectedDirectConversationId(null)
      setSocketState('connecting')
      setMessages([])
      setMessageIdsToEmpty()
      setStatusMessage(`Created #${nextChannel.name}.`)
    } catch {
      setStatusMessage('Could not create the channel.')
    } finally {
      setIsManaging(false)
    }
  }

  const handleMoveRole = async (roleId: number, direction: -1 | 1) => {
    if (!token || !canManageServer) {
      return
    }

    const currentRole = roles.find((role) => role.id === roleId)

    if (!currentRole) {
      return
    }

    const nextPosition = Math.max(0, currentRole.position + direction)

    setIsManaging(true)

    try {
      const response = await api.patch<Role>(
        `/api/servers/roles/${roleId}/`,
        { position: nextPosition },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const updatedRole = response.data
      setRoles((current) =>
        current
          .map((role) => (role.id === updatedRole.id ? updatedRole : role))
          .sort((a, b) => b.position - a.position),
      )
      setStatusMessage(`Moved role "${updatedRole.name}".`)
    } catch {
      setStatusMessage('Could not update role order.')
    } finally {
      setIsManaging(false)
    }
  }

  const handleCreateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token || !selectedServerId || !roleForm.name.trim()) {
      return
    }

    setIsManaging(true)

    try {
      const response = await api.post<Role>(
        `/api/servers/${selectedServerId}/roles/`,
        {
          ...roleForm,
          name: roleForm.name.trim(),
          position: roles.length + 1,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const nextRole = response.data
      setRoles((current) => [nextRole, ...current.filter((role) => role.id !== nextRole.id)])
      setRoleForm({
        name: '',
        color: '#5865f2',
        icon: '',
        hoist: false,
        mentionable: false,
        administrator: false,
        create_instant_invite: false,
        kick_members: false,
        ban_members: false,
        manage_channels: false,
        manage_roles: false,
        manage_webhooks: false,
        view_audit_log: false,
        view_channel: true,
        send_messages: true,
        send_tts_messages: false,
        manage_messages: false,
        embed_links: true,
        attach_files: true,
        read_message_history: true,
        mention_everyone: false,
        use_external_emojis: false,
        add_reactions: true,
        connect: true,
        speak: true,
        mute_members: false,
        deafen_members: false,
        move_members: false,
        use_voice_activity: true,
        priority_speaker: false,
        request_to_speak: false,
        change_nickname: true,
        manage_nicknames: false,
      })
      setStatusMessage(`Created role "${nextRole.name}".`)
    } catch {
      setStatusMessage('Could not create the role.')
    } finally {
      setIsManaging(false)
    }
  }

  const handleInviteMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token || !selectedServerId || !memberForm.username.trim()) {
      return
    }

    setIsManaging(true)

    try {
      const response = await api.post<Member>(
        `/api/servers/${selectedServerId}/members/`,
        {
          server: selectedServerId,
          user_username: memberForm.username.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const nextMember = response.data
      setMembers((current) => [
        nextMember,
        ...current.filter((member) => member.id !== nextMember.id),
      ])
      setMemberForm({ username: '' })
      setSelectedMemberId(nextMember.id)
      setMemberRoleIds(roleIdsFromMember(nextMember))
      setStatusMessage(`Added ${nextMember.username} to the server.`)
    } catch {
      setStatusMessage('Could not invite that user.')
    } finally {
      setIsManaging(false)
    }
  }

  const handleSaveMemberRoles = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token || !selectedMemberId) {
      return
    }

    setIsManaging(true)

    try {
      const response = await api.patch<Member>(
        `/api/servers/members/${selectedMemberId}/`,
        {
          role_ids: memberRoleIds,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const nextMember = response.data
      setMembers((current) =>
        current.map((member) =>
          member.id === nextMember.id ? nextMember : member,
        ),
      )
      setMemberRoleIds(roleIdsFromMember(nextMember))
      setStatusMessage(`Updated roles for ${nextMember.username}.`)
    } catch {
      setStatusMessage('Could not update member roles.')
    } finally {
      setIsManaging(false)
    }
  }

  const handleRemoveMember = async (member: Member) => {
    if (!token || !activeServer || !canManageServer) {
      return
    }

    const confirmed = window.confirm(`Remove ${member.username} from "${activeServer.name}"?`)

    if (!confirmed) {
      return
    }

    setIsManaging(true)

    try {
      await api.delete(`/api/servers/members/${member.id}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      setMembers((current) => current.filter((item) => item.id !== member.id))
      if (selectedMemberId === member.id) {
        setSelectedMemberId(null)
        setMemberRoleIds([])
      }
      setStatusMessage(`Removed ${member.username} from the server.`)
    } catch (error: unknown) {
      setStatusMessage(
        extractErrorMessage(error, 'Could not remove that member.'),
      )
    } finally {
      setIsManaging(false)
    }
  }

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const content = composer.trim()

    const targetId =
      workspaceMode === 'friends' ? selectedDirectConversationId : selectedChannelId
    const targetSocket = socketRef.current

    if (!content || !currentUser || !targetId || !token) {
      return
    }

    if (!targetSocket || targetSocket.readyState !== WebSocket.OPEN) {
      setStatusMessage('Connect to the channel before sending a message.')
      return
    }

    targetSocket.send(JSON.stringify({ message: content, user_id: currentUser.id }))

    setComposer('')
  }

  const handleStartDirectMessage = async (user: Pick<ProfileCardUser, 'id' | 'username'>) => {
    if (!token || !currentUser || user.id === currentUser.id) {
      return
    }

    setIsManaging(true)

    try {
      const response = await api.post<DirectConversation>(
        '/api/messages/direct-conversations/',
        {
          user_id: user.id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const conversation = response.data
      setDirectConversations((current) => [
        conversation,
        ...current.filter((item) => item.id !== conversation.id),
      ])
      setWorkspaceMode('friends')
      setSelectedServerId(null)
      setSelectedChannelId(null)
      setSelectedDirectConversationId(conversation.id)
      setMessages([])
      setDirectMessages([])
      setMessageIdsToEmpty()
      setProfileUser(null)
    } catch {
      setStatusMessage('Could not start a direct message.')
    } finally {
      setIsManaging(false)
    }
  }

  const handleStartDirectMessageByUsername = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const username = directForm.username.trim()

    if (!username || !token || !currentUser) {
      return
    }

    setIsManaging(true)

    try {
      const response = await api.post<DirectConversation>(
        '/api/messages/direct-conversations/',
        {
          username,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const conversation = response.data
      setDirectConversations((current) => [
        conversation,
        ...current.filter((item) => item.id !== conversation.id),
      ])
      setWorkspaceMode('friends')
      setSelectedServerId(null)
      setSelectedChannelId(null)
      setSelectedDirectConversationId(conversation.id)
      setMessages([])
      setDirectMessages([])
      setMessageIdsToEmpty()
      setDirectForm({ username: '' })
    } catch {
      setStatusMessage('Could not start that direct message.')
    } finally {
      setIsManaging(false)
    }
  }

  const setMessageIdsToEmpty = () => {
    messageIdsRef.current = new Set()
  }

  const socketLabel =
    socketState === 'live'
      ? 'Live'
      : socketState === 'connecting'
        ? 'Connecting'
        : selectedChannelId || selectedDirectConversationId
          ? 'Offline'
          : 'Idle'

  const orderedRoles = [...roles].sort((a, b) => b.position - a.position)

  return (
    <div className="dashboard">
      <aside className="panel server-panel">
        <div className="brand-shell">
          <span className="eyebrow">Self-hosted chat</span>
          <h1>LocalSpeaking</h1>
          <p>
            A clearer Discord-style workspace with server roles, member
            controls, and live channels.
          </p>
        </div>

        <section className="card auth-card">
          <div className="card-head">
            <h2>Account</h2>
            <span className={`status-chip status-${socketState}`}>{currentUser ? 'Signed in' : 'Guest'}</span>
          </div>

          {currentUser ? (
            <div className="user-row">
              <div className="avatar">{initials(currentUser.username) || 'U'}</div>
              <div>
                <strong>{currentUser.username}</strong>
                <p>{currentUser.email || 'No email set'}</p>
              </div>
            </div>
          ) : (
            <form className="stack-form" onSubmit={handleLogin}>
              <label>
                Username
                <input
                  value={authForm.username}
                  onChange={(event) =>
                    setAuthForm((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                  placeholder="luna"
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="••••••••"
                />
              </label>

              <button className="primary-button" type="submit" disabled={isAuthenticating}>
                {isAuthenticating ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}

          {authError ? <p className="notice error">{authError}</p> : null}

          {currentUser ? (
            <button className="ghost-button" type="button" onClick={handleLogout}>
              Sign out
            </button>
          ) : null}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Servers</h2>
            <div className="card-head-actions">
              <span className="muted">{servers.length} total</span>
              <button
                className="icon-button"
                type="button"
                aria-label={serverCreateOpen ? 'Close server creator' : 'Create server'}
                onClick={() => setServerCreateOpen((current) => !current)}
                disabled={!currentUser}
              >
                +
              </button>
            </div>
          </div>

          {serverCreateOpen ? (
            <form className="inline-form" onSubmit={handleCreateServer}>
              <input
                value={serverForm.name}
                onChange={(event) =>
                  setServerForm({
                    name: event.target.value,
                  })
                }
                placeholder="New server name"
                disabled={!currentUser}
              />
              <button className="secondary-button" type="submit" disabled={!currentUser || isManaging}>
                Create
              </button>
            </form>
          ) : null}

          {isLoadingServers ? <p className="placeholder">Loading servers...</p> : null}

          <div className="list">
            {servers.map((server) => (
              <button
                key={server.id}
                type="button"
                className={`list-item ${server.id === selectedServerId ? 'active' : ''}`}
                onClick={() => {
                  socketRef.current?.close()
                  socketRef.current = null
                  setSocketState('idle')
                  setWorkspaceMode('server')
                  setSelectedServerId(server.id)
                  setSelectedChannelId(null)
                  setSelectedDirectConversationId(null)
                  setSelectedMemberId(null)
                  setMemberRoleIds([])
                  setChannels([])
                  setRoles([])
                  setMembers([])
                  setMessages([])
                  setMessageIdsToEmpty()
                }}
              >
                <span className="list-icon">{initials(server.name) || '#'}</span>
                <span className="list-copy">
                  <strong>{server.name}</strong>
                  <small>
                    {server.channel_count} channels • {server.member_count} members
                  </small>
                </span>
                {server.is_owner ? <span className="badge">Owner</span> : null}
              </button>
            ))}
          </div>

          {!isLoadingServers && servers.length === 0 ? (
            <p className="placeholder">Create your first server to start building.</p>
          ) : null}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Friends</h2>
            <div className="card-head-actions">
              <span className="muted">{directConversations.length} chats</span>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  socketRef.current?.close()
                  socketRef.current = null
                  setWorkspaceMode('friends')
                  setSocketState(selectedDirectConversationId ? 'connecting' : 'idle')
                  setSelectedServerId(null)
                  setSelectedChannelId(null)
                  setMessages([])
                  if (!selectedDirectConversationId) {
                    setDirectMessages([])
                    setMessageIdsToEmpty()
                  }
                }}
                disabled={!currentUser}
              >
                Open
              </button>
            </div>
          </div>

          <form className="stack-form" onSubmit={handleStartDirectMessageByUsername}>
            <input
              value={directForm.username}
              onChange={(event) =>
                setDirectForm({ username: event.target.value })
              }
              placeholder="Start DM by username"
              disabled={!currentUser}
            />

            <button className="secondary-button" type="submit" disabled={!currentUser || isManaging}>
              Message
            </button>
          </form>

          <div className="list">
            {directConversations.map((conversation) => {
              const partner = conversationPartner(conversation, currentUser?.id ?? 0)

              return (
                <button
                  key={conversation.id}
                  type="button"
                  className={`list-item ${
                    conversation.id === selectedDirectConversationId && workspaceMode === 'friends'
                      ? 'active'
                      : ''
                  }`}
                  onClick={() => {
                    socketRef.current?.close()
                    socketRef.current = null
                    setWorkspaceMode('friends')
                    setSocketState('connecting')
                    setSelectedServerId(null)
                    setSelectedChannelId(null)
                    setSelectedDirectConversationId(conversation.id)
                    setMessages([])
                    setDirectMessages([])
                    setMessageIdsToEmpty()
                  }}
                >
                  <span className="list-icon channel-mark">
                    {initials(partner?.username || 'DM') || '@'}
                  </span>
                  <span className="list-copy">
                    <strong>{partner?.username ?? 'Unknown'}</strong>
                    <small>
                      {conversation.last_message?.content || 'No messages yet'}
                    </small>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      </aside>

      <main className="workspace">
        <header className="workspace-head card">
          <div>
            <span className="eyebrow">Workspace</span>
            <h2>
              {workspaceMode === 'friends'
                ? 'Friends'
                : activeServer
                  ? activeServer.name
                  : 'Choose a server'}{' '}
              <span className="muted">/ {activeTitle}</span>
            </h2>
            <p>
              {workspaceMode === 'friends'
                ? 'This hub keeps direct conversations separate from servers, like Discord friends and DMs.'
                : currentUser
                  ? 'REST keeps the directory in sync, and WebSocket handles live chat.'
                  : 'Sign in to create servers, channels, roles, and messages.'}
            </p>
          </div>

          <div className="workspace-actions">
            <div className="workspace-meta">
              <span className={`status-chip status-${socketState}`}>{socketLabel}</span>
              <span className="status-chip">{activeMessages.length} messages</span>
            </div>

            {workspaceMode === 'server' && canManageServer ? (
              <button className="secondary-button" type="button" onClick={() => openServerSettings('general')}>
                Server settings
              </button>
            ) : null}
          </div>
        </header>

        {statusMessage ? <div className="notice">{statusMessage}</div> : null}

        <section className="workspace-grid">
          {workspaceMode === 'server' ? (
            <>
              <div className="card channels-card">
                <div className="card-head">
                  <h2>Channels</h2>
                  <span className="muted">{channels.length} total</span>
                </div>

                <form className="stack-form" onSubmit={handleCreateChannel}>
                  <input
                    value={channelForm.name}
                    onChange={(event) =>
                      setChannelForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="New channel name"
                    disabled={!canManageServer}
                  />

                  <div className="inline-form compact">
                    <select
                      value={channelForm.channel_type}
                      onChange={(event) =>
                        setChannelForm((current) => ({
                          ...current,
                          channel_type: event.target.value as Channel['channel_type'],
                        }))
                      }
                      disabled={!canManageServer}
                    >
                      <option value="text">Text</option>
                      <option value="voice">Voice</option>
                    </select>

                    <button className="secondary-button" type="submit" disabled={!canManageServer || isManaging}>
                      Add chat
                    </button>
                  </div>

                  {!canManageServer ? (
                    <p className="helper">
                      Only the server owner can create and manage channels here.
                    </p>
                  ) : null}
                </form>

                {isLoadingChannels ? <p className="placeholder">Loading channels...</p> : null}

                <div className="list">
                  {channels.map((channel) => (
                    <button
                      key={channel.id}
                      type="button"
                      className={`list-item channel-item ${
                        channel.id === selectedChannelId ? 'active' : ''
                      }`}
                      onClick={() => {
                        setWorkspaceMode('server')
                        socketRef.current?.close()
                        socketRef.current = null
                        setSocketState('idle')
                        setSelectedChannelId(channel.id)
                        setSelectedDirectConversationId(null)
                        setMessages([])
                        setDirectMessages([])
                        setMessageIdsToEmpty()
                      }}
                    >
                      <span className="list-icon channel-mark">
                        {channel.channel_type === 'voice' ? '◉' : '#'}
                      </span>
                      <span className="list-copy">
                        <strong>{channel.name}</strong>
                        <small>{channel.channel_type} channel</small>
                      </span>
                    </button>
                  ))}
                </div>

                {!isLoadingChannels && channels.length === 0 ? (
                  <p className="placeholder">No chats yet. Add the first one above.</p>
                ) : null}
              </div>

              <div className="card chat-card">
                <div className="chat-topline">
                  <div>
                    <span className="eyebrow">
                      {activeChannel?.channel_type === 'voice' ? 'Voice chat' : 'Text chat'}
                    </span>
                    <h2>
                      {activeChannel
                        ? activeChannel.channel_type === 'voice'
                          ? `🔊 ${activeChannel.name}`
                          : `#${activeChannel.name}`
                        : 'No channel selected'}
                    </h2>
                  </div>
                  <span className="muted">
                    {activeServer?.owner_username ? `Owner: ${activeServer.owner_username}` : ''}
                  </span>
                </div>

                {activeChannel?.channel_type === 'voice' ? (
                  <div className="voice-panel">
                    <div className="voice-status-panel">
                      <div>
                        <p>
                          Voice channels let server members connect with audio in real time.
                          Allow microphone access when prompted.
                        </p>
                      </div>

                      <div className="voice-controls">
                        <span className={`status-chip status-${voiceStatus}`}>
                          {voiceStatus === 'live'
                            ? 'Live'
                            : voiceStatus === 'connecting'
                              ? 'Connecting'
                              : voiceStatus === 'closed'
                                ? 'Disconnected'
                                : 'Idle'}
                        </span>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setIsVoiceMuted((current) => !current)}
                          disabled={voiceStatus !== 'live'}
                        >
                          {isVoiceMuted ? 'Unmute' : 'Mute'}
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setIsVoiceDeafened((current) => !current)}
                          disabled={voiceStatus !== 'live'}
                        >
                          {isVoiceDeafened ? 'Undeafen' : 'Deafen'}
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => (isScreenSharing ? stopScreenShare() : startScreenShare())}
                          disabled={voiceStatus !== 'live'}
                        >
                          {isScreenSharing ? 'Stop sharing' : 'Share screen'}
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => cleanupVoiceCall()}
                          disabled={voiceStatus === 'idle'}
                        >
                          Leave
                        </button>
                      </div>
                    </div>

                    {voiceError ? <div className="notice">{voiceError}</div> : null}
                    {screenShareError ? <div className="notice">{screenShareError}</div> : null}

                    {voiceStatus === 'live' ? (
                      <div className="voice-overview-grid">
                        <div className="voice-members">
                          <div className="voice-section-head">
                            <h3>Voice participants ({voiceParticipantRows.length})</h3>
                            <span className="muted">Connected to {activeChannel?.name || 'this room'}</span>
                          </div>
                          <ul className="voice-member-list">
                            {voiceParticipantRows.map((participant) => {
                            const isLocal = participant.id === currentUser?.id
                            const isSharing = voiceSharingIds.includes(participant.id)
                            return (
                              <li className="voice-member-item" key={participant.id}>
                                <span className={`voice-member-avatar ${isLocal ? 'voice-member-avatar-self' : ''}`}>
                                  {initials(participant.username)}
                                </span>
                                <div className="voice-member-info">
                                  <span className="voice-member-name">
                                    {participant.username}{isLocal ? ' (You)' : ''}
                                  </span>
                                  <span className="voice-member-label">
                                    {isLocal
                                      ? isVoiceMuted
                                        ? 'Muted locally'
                                        : isVoiceDeafened
                                          ? 'Deafened'
                                          : 'Connected'
                                      : 'Connected'}
                                  </span>
                                </div>
                                <span className="voice-member-badges">
                                  {isSharing ? (
                                    <span className="voice-badge voice-badge-sharing">Sharing</span>
                                  ) : (
                                    <span className="voice-badge voice-badge-audio">Voice</span>
                                  )}
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                      </div>

                      <div className="voice-screens">
                        <div className="voice-section-head">
                          <h3>Screen sharing</h3>
                          <span className="muted">Live previews for active presenters</span>
                        </div>
                        {voiceParticipantRows.filter((participant) => voiceSharingIds.includes(participant.id)).length > 0 ? (
                          <div className="voice-screen-grid">
                            {voiceParticipantRows
                              .filter((participant) => voiceSharingIds.includes(participant.id))
                              .map((participant) => {
                                const isLocal = participant.id === currentUser?.id
                                const previewStream = isLocal
                                  ? voiceScreenStreamRef.current
                                  : voiceRemoteStreamsRef.current[participant.id]
                                const hasVideo = previewStream
                                  ? previewStream.getVideoTracks().length > 0
                                  : false

                                return (
                                  <div className="voice-screen-card" key={participant.id}>
                                    <div className="voice-screen-header">
                                      <strong>{participant.username}{isLocal ? ' (You)' : ''}</strong>
                                      <span>{isLocal ? 'Your screen' : 'Sharing screen'}</span>
                                    </div>
                                    {hasVideo ? (
                                      <video
                                        ref={(element) => {
                                          if (isLocal) {
                                            localScreenVideoRef.current = element
                                            if (element && previewStream) {
                                              element.srcObject = previewStream
                                            }
                                          } else {
                                            voiceVideoRefs.current[participant.id] = element
                                            if (element && voiceRemoteStreamsRef.current[participant.id]) {
                                              element.srcObject = voiceRemoteStreamsRef.current[participant.id]
                                            }
                                          }
                                        }}
                                        autoPlay
                                        playsInline
                                        muted
                                      />
                                    ) : (
                                      <div className="voice-screen-placeholder">
                                        <span>Preview unavailable</span>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                          </div>
                        ) : (
                          <div className="voice-screen-card voice-screen-empty">
                            <div className="voice-screen-header">
                              <strong>No one is sharing right now</strong>
                            </div>
                            <p>Use Share screen to broadcast your display to everyone in the voice channel.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'none' }}>
                      {voiceParticipantRows
                        .filter((participant) => participant.id !== currentUser?.id)
                        .map((participant) => (
                          <audio
                            key={participant.id}
                            ref={(element) => {
                              voiceAudioRefs.current[participant.id] = element
                              if (element && voiceRemoteStreamsRef.current[participant.id]) {
                                element.srcObject = voiceRemoteStreamsRef.current[participant.id]
                              }
                            }}
                            autoPlay
                            playsInline
                            muted={isVoiceDeafened}
                          />
                        ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="chat-feed" ref={messageFeedRef}>
                      {isLoadingMessages ? <p className="placeholder">Loading messages...</p> : null}

                      {!currentUser ? (
                        <div className="empty-state">
                          <h3>Authentication required</h3>
                          <p>Sign in to read history and post messages into the live room.</p>
                        </div>
                      ) : null}

                      {currentUser && !activeChannel ? (
                        <div className="empty-state">
                          <h3>Select a channel</h3>
                          <p>Pick a chat from the channel column to see and send messages.</p>
                        </div>
                      ) : null}

                      {currentUser && activeChannel && activeMessages.length === 0 && !isLoadingMessages ? (
                        <div className="empty-state">
                          <h3>No messages yet</h3>
                          <p>Be the first to send something here.</p>
                        </div>
                      ) : null}

                      {activeMessages.map((message, index) => {
                        const previous = activeMessages[index - 1]
                        const showAvatar = index === 0 || previous.author !== message.author
                        const authorUser =
                          members.find((member) => member.user === message.author)
                            ? toProfileUser(members.find((member) => member.user === message.author)!)
                            : currentUser?.id === message.author
                              ? currentUser
                              : null

                        return (
                          <article className={`message-row ${showAvatar ? '' : 'message-row-grouped'}`} key={message.id}>
                            {showAvatar ? (
                              <div className="avatar small">
                                {initials(message.author_username) || 'U'}
                              </div>
                            ) : (
                              <div className="message-spacer" />
                            )}
                            <div className="message-body">
                              <div className="message-head">
                                <button
                                  type="button"
                                  className="message-author-button"
                                  onClick={() => authorUser && openProfile(authorUser)}
                                  disabled={!authorUser}
                                >
                                  <strong>{message.author_username}</strong>
                                </button>
                                <span>{formatDate(message.created_at)}</span>
                                {message.edited_at ? <span>edited</span> : null}
                              </div>
                              <p>{message.content}</p>
                            </div>
                          </article>
                        )
                      })}
                    </div>

                    <form className="composer" onSubmit={handleSendMessage}>
                      <textarea
                        value={composer}
                        onChange={(event) => setComposer(event.target.value)}
                        placeholder={
                          currentUser && activeChannel
                            ? `Message #${activeChannel.name}`
                            : 'Sign in and pick a channel'
                        }
                        disabled={!currentUser || !activeChannel || socketState !== 'live'}
                        rows={4}
                      />

                      <div className="composer-footer">
                        <span className="helper">Enter to send. Shift + Enter for a new line.</span>
                        <button
                          className="primary-button"
                          type="submit"
                          disabled={
                            !composer.trim() ||
                            !currentUser ||
                            !activeChannel ||
                            socketState !== 'live'
                          }
                        >
                          Send
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="card friends-card">
                <div className="card-head">
                  <h2>Friends</h2>
                  <span className="muted">{directConversations.length} active chats</span>
                </div>

                <form className="stack-form friends-launcher" onSubmit={handleStartDirectMessageByUsername}>
                  <input
                    value={directForm.username}
                    onChange={(event) =>
                      setDirectForm({ username: event.target.value })
                    }
                    placeholder="Add or message by username"
                    disabled={!currentUser}
                  />

                  <button className="secondary-button" type="submit" disabled={!currentUser || isManaging}>
                    Start chat
                  </button>
                </form>

                <div className="list friends-list">
                  {directConversations.map((conversation) => {
                    const partner = conversationPartner(conversation, currentUser?.id ?? 0)

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        className={`list-item ${conversation.id === selectedDirectConversationId ? 'active' : ''}`}
                        onClick={() => {
                          socketRef.current?.close()
                          socketRef.current = null
                          setWorkspaceMode('friends')
                          setSocketState('connecting')
                          setSelectedServerId(null)
                          setSelectedChannelId(null)
                          setSelectedDirectConversationId(conversation.id)
                          setMessages([])
                          setDirectMessages([])
                          setMessageIdsToEmpty()
                        }}
                      >
                        <span className="list-icon channel-mark">
                          {initials(partner?.username || 'DM') || '@'}
                        </span>
                        <span className="list-copy">
                          <strong>{partner?.username ?? 'Unknown'}</strong>
                          <small>{conversation.last_message?.content || 'No messages yet'}</small>
                        </span>
                      </button>
                    )
                  })}
                </div>

                {!currentUser ? <p className="placeholder">Sign in to manage your friend chats.</p> : null}
                {currentUser && directConversations.length === 0 ? (
                  <p className="placeholder">Start a conversation by username or from a user profile.</p>
                ) : null}
              </div>

              <div className="card chat-card friends-chat-card">
                <div className="chat-topline">
                  <div>
                    <span className="eyebrow">Direct message</span>
                    <h2>{activeDirectConversation ? activeTitle : 'Choose a conversation'}</h2>
                  </div>
                  <span className="muted">Private</span>
                </div>

                <div className="chat-feed" ref={messageFeedRef}>
                  {isLoadingMessages ? <p className="placeholder">Loading messages...</p> : null}

                  {!currentUser ? (
                    <div className="empty-state">
                      <h3>Authentication required</h3>
                      <p>Sign in to use direct messages.</p>
                    </div>
                  ) : null}

                  {currentUser && !activeDirectConversation ? (
                    <div className="empty-state">
                      <h3>Select a DM</h3>
                      <p>Pick a person from the friends list or open a profile to start talking.</p>
                    </div>
                  ) : null}

                  {currentUser && activeDirectConversation && activeMessages.length === 0 && !isLoadingMessages ? (
                    <div className="empty-state">
                      <h3>No messages yet</h3>
                      <p>Send the first private message.</p>
                    </div>
                  ) : null}

                  {activeMessages.map((message, index) => {
                    const previous = activeMessages[index - 1]
                    const showAvatar = index === 0 || previous.author !== message.author
                    const authorUser =
                      activeDirectConversation?.members.find((member) => member.id === message.author) ??
                      (currentUser?.id === message.author ? currentUser : null)

                    return (
                      <article className={`message-row ${showAvatar ? '' : 'message-row-grouped'}`} key={message.id}>
                        {showAvatar ? (
                          <div className="avatar small">
                            {initials(message.author_username) || 'U'}
                          </div>
                        ) : (
                          <div className="message-spacer" />
                        )}
                        <div className="message-body">
                          <div className="message-head">
                            <button
                              type="button"
                              className="message-author-button"
                              onClick={() => authorUser && openProfile(authorUser)}
                              disabled={!authorUser}
                            >
                              <strong>{message.author_username}</strong>
                            </button>
                            <span>{formatDate(message.created_at)}</span>
                            {message.edited_at ? <span>edited</span> : null}
                          </div>
                          <p>{message.content}</p>
                        </div>
                      </article>
                    )
                  })}
                </div>

                <form className="composer" onSubmit={handleSendMessage}>
                  <textarea
                    value={composer}
                    onChange={(event) => setComposer(event.target.value)}
                    placeholder={
                      currentUser && activeDirectConversation
                        ? `Message ${activeTitle}`
                        : 'Select a direct message'
                    }
                    disabled={!currentUser || !activeDirectConversation || socketState !== 'live'}
                    rows={4}
                  />

                  <div className="composer-footer">
                    <span className="helper">Enter to send. Shift + Enter for a new line.</span>
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={
                        !composer.trim() ||
                        !currentUser ||
                        !activeDirectConversation ||
                        socketState !== 'live'
                      }
                    >
                      Send
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </section>
      </main>

      {serverSettingsOpen && activeServer ? (
        <div className="modal-backdrop" role="presentation" onClick={closeServerSettings}>
          <div
            className="modal card server-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Server settings"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">Server settings</span>
                <h2>{activeServer.name}</h2>
              </div>
              <button className="secondary-button" type="button" onClick={closeServerSettings}>
                Close
              </button>
            </div>

            <div className="settings-tabs">
              {(['general', 'roles', 'members'] as ServerSettingsTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`tab-button ${serverSettingsTab === tab ? 'active' : ''}`}
                  onClick={() => setServerSettingsTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {isLoadingRoles || isLoadingMembers ? (
              <p className="placeholder">Loading settings...</p>
            ) : null}

            {serverSettingsTab === 'general' ? (
              <form className="stack-form settings-section" onSubmit={handleSaveServerSettings}>
                <label>
                  Server name
                  <input
                    value={serverEditForm.name}
                    onChange={(event) =>
                      setServerEditForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    disabled={!canManageServer}
                  />
                </label>

                <label>
                  Server icon URL
                  <input
                    value={serverEditForm.icon}
                    onChange={(event) =>
                      setServerEditForm((current) => ({
                        ...current,
                        icon: event.target.value,
                      }))
                    }
                    placeholder="https://..."
                    disabled={!canManageServer}
                  />
                </label>

                <div className="modal-footer">
                  <span className="muted">
                    {activeServer.channel_count} channels • {activeServer.member_count} members
                  </span>
                  <button className="primary-button" type="submit" disabled={!canManageServer || isManaging}>
                    Save changes
                  </button>
                </div>

                {canManageServer ? (
                  <div className="danger-zone">
                    <div>
                      <strong>Delete server</strong>
                      <p className="muted">This removes every channel, role, and message in this server.</p>
                    </div>
                    <button className="danger-button" type="button" onClick={handleDeleteServer} disabled={isManaging}>
                      Delete server
                    </button>
                  </div>
                ) : null}
              </form>
            ) : null}

            {serverSettingsTab === 'roles' ? (
              <div className="settings-section settings-split">
                <form className="stack-form" onSubmit={handleCreateRole}>
                  <input
                    value={roleForm.name}
                    onChange={(event) =>
                      setRoleForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="New role name"
                    disabled={!canManageServer}
                  />

                  <div className="inline-form compact">
                    <input
                      type="color"
                      value={roleForm.color}
                      onChange={(event) =>
                        setRoleForm((current) => ({
                          ...current,
                          color: event.target.value,
                        }))
                      }
                      disabled={!canManageServer}
                    />
                    <button className="secondary-button" type="submit" disabled={!canManageServer || isManaging}>
                      Add role
                    </button>
                  </div>

                  <div className="inline-form compact">
                    <input
                      value={roleForm.icon}
                      onChange={(event) =>
                        setRoleForm((current) => ({
                          ...current,
                          icon: event.target.value,
                        }))
                      }
                      placeholder="Icon/emoji"
                      disabled={!canManageServer}
                    />
                    <label className="permission-pill">
                      <input
                        type="checkbox"
                        checked={roleForm.hoist}
                        onChange={(event) =>
                          setRoleForm((current) => ({
                            ...current,
                            hoist: event.target.checked,
                          }))
                        }
                        disabled={!canManageServer}
                      />
                      <span>Hoist</span>
                    </label>
                  </div>

                  <label className="permission-pill">
                    <input
                      type="checkbox"
                      checked={roleForm.mentionable}
                      onChange={(event) =>
                        setRoleForm((current) => ({
                          ...current,
                          mentionable: event.target.checked,
                        }))
                      }
                      disabled={!canManageServer}
                    />
                    <span>Mentionable</span>
                  </label>

                  <div className="permissions-grid">
                    {ROLE_PERMISSION_OPTIONS.map(([key, label]) => (
                      <label key={key} className="permission-pill">
                        <input
                          type="checkbox"
                          checked={roleForm[key as keyof PermissionForm] as boolean}
                          onChange={(event) =>
                            setRoleForm((current) => ({
                              ...current,
                              [key]: event.target.checked,
                            }))
                          }
                          disabled={!canManageServer}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </form>

                <div className="roles-list">
                  {orderedRoles.map((role) => (
                    <div key={role.id} className="role-row">
                      <button
                        type="button"
                        className={`role-chip ${memberRoleIds.includes(role.id) ? 'active' : ''}`}
                        onClick={() => {
                          if (!selectedMember) {
                            return
                          }

                          const hasRole = memberRoleIds.includes(role.id)
                          const nextIds = hasRole
                            ? memberRoleIds.filter((id) => id !== role.id)
                            : [...memberRoleIds, role.id]
                          setMemberRoleIds(nextIds)
                        }}
                        style={{ borderColor: role.color }}
                      >
                        <span className="dot" style={{ background: role.color }} />
                        <span className="role-name">
                          {role.icon ? `${role.icon} ` : ''}
                          {role.name}
                        </span>
                        <small>{role.member_count}</small>
                      </button>

                      {canManageServer ? (
                        <div className="role-controls">
                          <button
                            type="button"
                            className="mini-button"
                            onClick={() => handleMoveRole(role.id, 1)}
                            disabled={isManaging || role.position === 0}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="mini-button"
                            onClick={() => handleMoveRole(role.id, -1)}
                            disabled={isManaging}
                          >
                            ▼
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {serverSettingsTab === 'members' ? (
              <div className="settings-section settings-split">
                <form className="stack-form" onSubmit={handleInviteMember}>
                  <input
                    value={memberForm.username}
                    onChange={(event) =>
                      setMemberForm({
                        username: event.target.value,
                      })
                    }
                    placeholder="Invite by username"
                    disabled={!canManageServer}
                  />

                  <button className="secondary-button" type="submit" disabled={!canManageServer || isManaging}>
                    Invite member
                  </button>
                </form>

                <div className="members-list">
                  {members.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className={`member-row ${member.id === selectedMemberId ? 'active' : ''}`}
                      onClick={() => selectMember(member)}
                    >
                      <div className="avatar small">
                        {initials(member.username) || 'M'}
                      </div>
                      <span className="member-copy">
                        <strong>{member.username}</strong>
                        <small>{member.roles.length} roles</small>
                      </span>
                    </button>
                  ))}
                </div>

                {selectedMember ? (
                  <form className="stack-form member-editor" onSubmit={handleSaveMemberRoles}>
                    <div className="selected-member-card">
                      <div className="selected-member-top">
                        <div className="avatar small">
                          {initials(selectedMember.username) || 'M'}
                        </div>
                        <div className="selected-member-copy">
                          <h3>{selectedMember.username}</h3>
                          <span className="muted">
                            {selectedMember.roles.length} roles assigned
                          </span>
                        </div>
                      </div>

                      <div className="selected-member-roles">
                        {selectedMember.roles.length > 0 ? (
                          selectedMember.roles.map((role) => (
                            <span
                              key={role.id}
                              className="member-role-badge"
                              style={{ borderColor: role.color }}
                            >
                              <span className="dot" style={{ background: role.color }} />
                              {role.icon ? `${role.icon} ` : ''}
                              {role.name}
                            </span>
                          ))
                        ) : (
                          <span className="muted">No roles yet</span>
                        )}
                      </div>

                      {canManageServer && selectedMember.user !== activeServer.owner ? (
                        <div className="danger-zone compact">
                          <div>
                            <strong>Remove member</strong>
                            <p className="muted">This kicks the member from the server immediately.</p>
                          </div>
                          <button
                            className="danger-button"
                            type="button"
                            onClick={() => void handleRemoveMember(selectedMember)}
                            disabled={isManaging}
                          >
                            Remove member
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="permissions-grid">
                      {orderedRoles.map((role) => (
                        <label key={role.id} className="permission-pill">
                          <input
                            type="checkbox"
                            checked={memberRoleIds.includes(role.id)}
                            onChange={(event) => {
                              setMemberRoleIds((current) =>
                                event.target.checked
                                  ? [...current, role.id]
                                  : current.filter((id) => id !== role.id),
                              )
                            }}
                            disabled={!canManageServer}
                          />
                          <span>{role.name}</span>
                        </label>
                      ))}
                    </div>

                    <button className="primary-button" type="submit" disabled={!canManageServer || isManaging}>
                      Save member roles
                    </button>
                  </form>
                ) : (
                  <p className="placeholder">Select a member to edit their roles.</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {profileUser ? (
        <div className="modal-backdrop" role="presentation" onClick={closeProfile}>
          <div
            className="modal card profile-modal"
            role="dialog"
            aria-modal="true"
            aria-label="User profile"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div className="user-row">
                <div className="avatar">{initials(profileUser.username) || 'U'}</div>
                <div>
                  <span className="eyebrow">Profile</span>
                  <h2>{profileUser.username}</h2>
                </div>
              </div>
              <button className="secondary-button" type="button" onClick={closeProfile}>
                Close
              </button>
            </div>

            <div className="profile-grid">
              <div className="profile-card">
                <span className="muted">Email</span>
                <strong>{profileUser.email || 'No email set'}</strong>
              </div>
              <div className="profile-card">
                <span className="muted">Joined</span>
                <strong>{profileUser.created_at ? formatDate(profileUser.created_at) : 'Unknown'}</strong>
              </div>
            </div>

            <div className="modal-footer">
              <button className="primary-button" type="button" onClick={() => void handleStartDirectMessage(profileUser)}>
                Message
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
