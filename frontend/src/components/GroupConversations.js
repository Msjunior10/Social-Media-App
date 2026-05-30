import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ComposerToolbar from './ComposerToolbar';
import { dmApi } from '../services/dmApi';
import { conversationApi } from '../services/conversationApi';
import { callSignalingRealtime } from '../services/callSignalingRealtime';
import { userApi } from '../services/userApi';
import './GroupConversations.css';

const MAX_MESSAGE_LENGTH = 500;
const MAX_MEDIA_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/ogg',
];

function GroupConversations({ currentUserId, initialConversationId = '' }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [messages, setMessages] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [newConversationTitle, setNewConversationTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedGif, setSelectedGif] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSignalingActionPending, setIsSignalingActionPending] = useState(false);
  const [isSignalingConnected, setIsSignalingConnected] = useState(false);
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [remoteParticipantIds, setRemoteParticipantIds] = useState([]);
  const [callState, setCallState] = useState({
    isActive: false,
    callType: '',
    startedByUserId: null,
  });
  const [error, setError] = useState('');
  const activeConversationIdRef = useRef('');
  const selectedConversationIdRef = useRef('');
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const remoteStreamsRef = useRef(new Map());
  const pendingIceCandidatesRef = useRef(new Map());
  const ringtoneContextRef = useRef(null);
  const ringtoneIntervalRef = useRef(null);
  const messageInputRef = useRef(null);

  useEffect(() => {
    if (!selectedMedia) {
      setMediaPreviewUrl('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(selectedMedia);
    setMediaPreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedMedia]);

  const isVideoPreview = Boolean(selectedMedia?.type?.startsWith('video/'));

  const isMicrophoneMissingError = (mediaError) => {
    const message = (mediaError?.message || '').toLowerCase();
    return mediaError?.name === 'NotFoundError' || message.includes('requested device not found');
  };

  const queueIceCandidate = useCallback((fromUserId, candidatePayload) => {
    const existingCandidates = pendingIceCandidatesRef.current.get(fromUserId) || [];
    pendingIceCandidatesRef.current.set(fromUserId, [...existingCandidates, candidatePayload]);
  }, []);

  const flushPendingIceCandidates = useCallback(async (fromUserId, peerConnection) => {
    const pendingCandidates = pendingIceCandidatesRef.current.get(fromUserId) || [];
    if (pendingCandidates.length === 0) {
      return;
    }

    for (const candidatePayload of pendingCandidates) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidatePayload));
    }

    pendingIceCandidatesRef.current.delete(fromUserId);
  }, []);

  const getParticipantIdsExceptCurrentUser = () => {
    if (!selectedConversation?.members) {
      return [];
    }

    return selectedConversation.members
      .map((member) => member.userId)
      .filter((userId) => userId && userId !== currentUserId);
  };

  const refreshRemoteParticipantIds = useCallback(() => {
    setRemoteParticipantIds(Array.from(remoteStreamsRef.current.keys()));
  }, []);

  const stopIncomingRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  }, []);

  const playIncomingRingtonePulse = useCallback(async () => {
    try {
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextConstructor) {
        return;
      }

      if (!ringtoneContextRef.current) {
        ringtoneContextRef.current = new AudioContextConstructor();
      }

      const audioContext = ringtoneContextRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const startAt = audioContext.currentTime;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(940, startAt);
      gainNode.gain.setValueAtTime(0.0001, startAt);
      gainNode.gain.exponentialRampToValueAtTime(0.08, startAt + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.32);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.34);
    } catch {
      // Ignore ringtone playback issues (browser policies/devices can block audio playback).
    }
  }, []);

  const startIncomingRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      return;
    }

    void playIncomingRingtonePulse();
    ringtoneIntervalRef.current = setInterval(() => {
      void playIncomingRingtonePulse();
    }, 1200);
  }, [playIncomingRingtonePulse]);

  const stopVoiceCallResources = useCallback(() => {
    peerConnectionsRef.current.forEach((peerConnection) => {
      try {
        peerConnection.onicecandidate = null;
        peerConnection.ontrack = null;
        peerConnection.close();
      } catch {
        // Best-effort cleanup
      }
    });

    peerConnectionsRef.current.clear();

    remoteStreamsRef.current.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });

    remoteStreamsRef.current.clear();
    pendingIceCandidatesRef.current.clear();
    refreshRemoteParticipantIds();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setIsVoiceCallActive(false);
    setIsMicEnabled(true);
  }, [refreshRemoteParticipantIds]);

  const ensureLocalAudioStream = useCallback(async ({ allowWithoutMicrophone = false } = {}) => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    let localStream;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    } catch (mediaError) {
      if (allowWithoutMicrophone && isMicrophoneMissingError(mediaError)) {
        setIsMicEnabled(false);
        return null;
      }

      if (isMicrophoneMissingError(mediaError)) {
        throw new Error('No microphone was found. Connect a microphone or headset and try again.');
      }

      throw mediaError;
    }

    localStreamRef.current = localStream;
    setIsVoiceCallActive(true);
    setIsMicEnabled(localStream.getAudioTracks().some((track) => track.enabled));

    return localStream;
  }, []);

  const getOrCreatePeerConnection = useCallback((targetUserId) => {
    const existingConnection = peerConnectionsRef.current.get(targetUserId);
    if (existingConnection) {
      return existingConnection;
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    });

    const localStream = localStreamRef.current;
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
    }

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      const candidatePayload = event.candidate;
      callSignalingRealtime.sendIceCandidate(
        selectedConversationIdRef.current,
        targetUserId,
        candidatePayload.candidate,
        candidatePayload.sdpMid,
        candidatePayload.sdpMLineIndex
      ).catch((iceError) => {
        setError(iceError?.message || 'Could not send ICE candidate.');
      });
    };

    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (!remoteStream) {
        return;
      }

      remoteStreamsRef.current.set(targetUserId, remoteStream);
      refreshRemoteParticipantIds();
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        remoteStreamsRef.current.delete(targetUserId);
        refreshRemoteParticipantIds();
      }
    };

    peerConnectionsRef.current.set(targetUserId, peerConnection);
    return peerConnection;
  }, [refreshRemoteParticipantIds]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const groupConversations = useMemo(
    () => conversations.filter((conversation) => conversation.isGroup),
    [conversations]
  );

  const refreshMessagesForConversation = useCallback(async (conversationId) => {
    if (!conversationId) {
      return;
    }

    try {
      const fetchedMessages = await conversationApi.getMessages(conversationId);
      setMessages(Array.isArray(fetchedMessages) ? fetchedMessages : []);
    } catch {
      // Ignore refresh errors triggered by signaling events.
    }
  }, []);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        setError('');
        setLoadingConversations(true);

        const [fetchedConversations, fetchedUsers] = await Promise.all([
          conversationApi.getMyConversations(),
          userApi.getAllUsers(),
        ]);

        if (!isMounted) {
          return;
        }

        const normalizedConversations = Array.isArray(fetchedConversations) ? fetchedConversations : [];
        setConversations(normalizedConversations);

        const normalizedGroupConversations = normalizedConversations.filter((c) => c.isGroup);
        if (normalizedGroupConversations.length > 0) {
          const requestedConversation = normalizedGroupConversations.find(
            (conversation) => conversation.id === initialConversationId
          );

          setSelectedConversationId((previousSelectedId) => {
            if (requestedConversation) {
              return requestedConversation.id;
            }

            return previousSelectedId || normalizedGroupConversations[0].id;
          });
        }

        const normalizedUsers = Array.isArray(fetchedUsers) ? fetchedUsers : [];
        setAvailableUsers(normalizedUsers.filter((user) => user.id !== currentUserId));
      } catch (loadError) {
        if (isMounted) {
          setError(loadError?.message || 'Could not load group conversations.');
        }
      } finally {
        if (isMounted) {
          setLoadingConversations(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [currentUserId, initialConversationId]);

  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      if (!selectedConversationId) {
        setMessages([]);
        return;
      }

      try {
        setError('');
        setLoadingMessages(true);
        const fetchedMessages = await conversationApi.getMessages(selectedConversationId);

        if (isMounted) {
          setMessages(Array.isArray(fetchedMessages) ? fetchedMessages : []);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError?.message || 'Could not load conversation messages.');
        }
      } finally {
        if (isMounted) {
          setLoadingMessages(false);
        }
      }
    };

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [selectedConversationId]);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = callSignalingRealtime.subscribe((event) => {
      if (!isMounted) {
        return;
      }

      const payloadConversationId = event?.payload?.conversationId;
      if (payloadConversationId && payloadConversationId !== selectedConversationIdRef.current) {
        return;
      }

      const timestamp = new Date().toLocaleTimeString();
      const nextEventLabel = (() => {
        switch (event.type) {
          case 'connected':
            setIsSignalingConnected(true);
            return 'Call signaling connected';
          case 'disconnected':
            setIsSignalingConnected(false);
            return 'Call signaling disconnected';
          case 'call-started':
            setCallState({
              isActive: true,
              callType: event?.payload?.callType || 'voice',
              startedByUserId: event?.payload?.startedByUserId || null,
            });

            if (event?.payload?.startedByUserId && event.payload.startedByUserId !== currentUserId) {
              startIncomingRingtone();
            } else {
              stopIncomingRingtone();
            }

            void refreshMessagesForConversation(payloadConversationId || selectedConversationIdRef.current);
            return `Call started (${event?.payload?.callType || 'voice'})`;
          case 'call-ended':
            setCallState({
              isActive: false,
              callType: '',
              startedByUserId: null,
            });
            stopIncomingRingtone();
            stopVoiceCallResources();
            void refreshMessagesForConversation(payloadConversationId || selectedConversationIdRef.current);
            return 'Call ended';
          case 'participant-joined':
            return `Participant joined: ${event?.payload?.userId || 'unknown'}`;
          case 'participant-left':
            return `Participant left: ${event?.payload?.userId || 'unknown'}`;
          case 'offer-received':
            (async () => {
              try {
                const fromUserId = event?.payload?.fromUserId;
                const sdp = event?.payload?.sdp;

                if (!fromUserId || !sdp || fromUserId === currentUserId) {
                  return;
                }

                stopIncomingRingtone();

                await ensureLocalAudioStream({ allowWithoutMicrophone: true });
                const peerConnection = getOrCreatePeerConnection(fromUserId);

                // Ignore duplicate offers while a previous negotiation is still unresolved.
                if (peerConnection.signalingState !== 'stable') {
                  return;
                }

                await peerConnection.setRemoteDescription({ type: 'offer', sdp });
                await flushPendingIceCandidates(fromUserId, peerConnection);
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);

                await callSignalingRealtime.sendAnswer(
                  selectedConversationIdRef.current,
                  fromUserId,
                  answer.sdp || ''
                );
              } catch (offerError) {
                setError(offerError?.message || 'Could not process incoming voice offer.');
              }
            })();
            return `Offer received from ${event?.payload?.fromUserId || 'unknown'}`;
          case 'answer-received':
            (async () => {
              try {
                const fromUserId = event?.payload?.fromUserId;
                const sdp = event?.payload?.sdp;

                if (!fromUserId || !sdp) {
                  return;
                }

                const peerConnection = peerConnectionsRef.current.get(fromUserId);
                if (!peerConnection) {
                  return;
                }

                // Ignore stale/duplicate answers when we are not waiting for one.
                if (peerConnection.signalingState !== 'have-local-offer') {
                  return;
                }

                await peerConnection.setRemoteDescription({ type: 'answer', sdp });
                await flushPendingIceCandidates(fromUserId, peerConnection);
              } catch (answerError) {
                setError(answerError?.message || 'Could not process incoming voice answer.');
              }
            })();
            return `Answer received from ${event?.payload?.fromUserId || 'unknown'}`;
          case 'ice-candidate-received':
            (async () => {
              try {
                const fromUserId = event?.payload?.fromUserId;
                if (!fromUserId) {
                  return;
                }

                const peerConnection = peerConnectionsRef.current.get(fromUserId);
                if (!peerConnection) {
                  return;
                }

                const candidatePayload = {
                  candidate: event?.payload?.candidate,
                  sdpMid: event?.payload?.sdpMid ?? null,
                  sdpMLineIndex: event?.payload?.sdpMLineIndex ?? null,
                };

                if (!peerConnection.remoteDescription) {
                  queueIceCandidate(fromUserId, candidatePayload);
                  return;
                }

                await peerConnection.addIceCandidate(new RTCIceCandidate(candidatePayload));
              } catch (iceError) {
                setError(iceError?.message || 'Could not apply incoming ICE candidate.');
              }
            })();
            return `ICE candidate received from ${event?.payload?.fromUserId || 'unknown'}`;
          case 'reconnected':
            setIsSignalingConnected(true);
            return 'Call signaling reconnected';
          default:
            return null;
        }
      })();

      if (!nextEventLabel) {
        return;
      }

    });

    callSignalingRealtime.connect().catch((connectError) => {
      if (!isMounted) {
        return;
      }

      setIsSignalingConnected(false);
      setError(connectError?.message || 'Could not connect to call signaling hub.');
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [
    currentUserId,
    ensureLocalAudioStream,
    refreshMessagesForConversation,
    flushPendingIceCandidates,
    getOrCreatePeerConnection,
    queueIceCandidate,
    startIncomingRingtone,
    stopIncomingRingtone,
    stopVoiceCallResources,
  ]);

  useEffect(() => {
    const joinConversation = async () => {
      try {
        setError('');
        const previousConversationId = activeConversationIdRef.current;

        if (previousConversationId && previousConversationId !== selectedConversationId) {
          await callSignalingRealtime.leaveConversation(previousConversationId);
        }

        if (selectedConversationId) {
          await callSignalingRealtime.joinConversation(selectedConversationId);
        }

        activeConversationIdRef.current = selectedConversationId;
        setCallState({
          isActive: false,
          callType: '',
          startedByUserId: null,
        });
        stopIncomingRingtone();
        stopVoiceCallResources();
      } catch (joinError) {
        setError(joinError?.message || 'Could not join call signaling for this conversation.');
      }
    };

    joinConversation();
  }, [selectedConversationId, stopIncomingRingtone, stopVoiceCallResources]);

  useEffect(() => {
    return () => {
      const activeConversationId = activeConversationIdRef.current;
      if (activeConversationId) {
        callSignalingRealtime.leaveConversation(activeConversationId).catch(() => {
          // Ignore cleanup errors to avoid noisy unmount warnings.
        });
      }

      callSignalingRealtime.disconnect().catch(() => {
        // Ignore cleanup errors to avoid noisy unmount warnings.
      });
      stopIncomingRingtone();
      stopVoiceCallResources();

      const ringtoneContext = ringtoneContextRef.current;
      ringtoneContextRef.current = null;
      if (ringtoneContext) {
        ringtoneContext.close().catch(() => {
          // Ignore cleanup errors to avoid noisy unmount warnings.
        });
      }

      activeConversationIdRef.current = '';
      selectedConversationIdRef.current = '';
      setIsSignalingConnected(false);
    };
  }, [stopIncomingRingtone, stopVoiceCallResources]);

  const toggleMember = (memberId) => {
    setSelectedMemberIds((previousIds) => {
      if (previousIds.includes(memberId)) {
        return previousIds.filter((id) => id !== memberId);
      }

      return [...previousIds, memberId];
    });
  };

  const handleCreateConversation = async (event) => {
    event.preventDefault();

    try {
      setError('');
      setIsCreating(true);

      const createdConversation = await conversationApi.createConversation(newConversationTitle, selectedMemberIds);
      const nextConversations = [createdConversation, ...conversations.filter((item) => item.id !== createdConversation.id)];
      setConversations(nextConversations);
      setSelectedConversationId(createdConversation.id);
      setNewConversationTitle('');
      setSelectedMemberIds([]);
    } catch (createError) {
      setError(createError?.message || 'Could not create group conversation.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!selectedConversationId || (!newMessage.trim() && !selectedMedia && !selectedGif)) {
      return;
    }

    try {
      setError('');
      setIsSending(true);

      const createdMessage = await conversationApi.sendMessage(
        selectedConversationId,
        newMessage.trim(),
        selectedMedia,
        selectedGif?.mediaUrl || null
      );
      setMessages((previousMessages) => [...previousMessages, createdMessage]);
      setNewMessage('');
      setSelectedMedia(null);
      setSelectedGif(null);
    } catch (sendError) {
      setError(sendError?.message || 'Could not send message to the group conversation.');
    } finally {
      setIsSending(false);
    }
  };

  const handleMessageChange = (event) => {
    const nextMessage = event.target.value;
    if (nextMessage.length <= MAX_MESSAGE_LENGTH) {
      setNewMessage(nextMessage);
    }
  };

  const insertEmoji = (emoji) => {
    const textarea = messageInputRef.current;
    const start = textarea?.selectionStart ?? newMessage.length;
    const end = textarea?.selectionEnd ?? newMessage.length;
    const nextMessage = `${newMessage.slice(0, start)}${emoji}${newMessage.slice(end)}`;

    setNewMessage(nextMessage.slice(0, MAX_MESSAGE_LENGTH));

    window.requestAnimationFrame(() => {
      if (textarea) {
        const caret = Math.min(start + emoji.length, MAX_MESSAGE_LENGTH);
        textarea.focus();
        textarea.setSelectionRange(caret, caret);
      }
    });
  };

  const handleGifSelect = (gif) => {
    setSelectedGif(gif);
  };

  const handleSelectedMediaFile = (file) => {
    if (!file) {
      setSelectedMedia(null);
      return;
    }

    if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, GIF, WEBP, MP4, WEBM, and OGG files are allowed.');
      setSelectedMedia(null);
      return;
    }

    if (file.size > MAX_MEDIA_SIZE_BYTES) {
      setError('The media file cannot be larger than 25 MB.');
      setSelectedMedia(null);
      return;
    }

    setError('');
    setSelectedMedia(file);
  };

  const handleMediaChange = (event) => {
    handleSelectedMediaFile(event.target.files?.[0] || null);
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
  };

  const handleRemoveGif = () => {
    setSelectedGif(null);
  };

  const isVideoMessageUrl = (url) => /\.(mp4|webm|ogg)(\?.*)?$/i.test(url || '');

  const handleStartCall = async (callType) => {
    if (!selectedConversationId) {
      return;
    }

    try {
      setError('');
      setIsSignalingActionPending(true);
      stopIncomingRingtone();
      if (callType !== 'voice') {
        throw new Error('Only voice calls are enabled in day 5 MVP.');
      }

      const localStream = await ensureLocalAudioStream({ allowWithoutMicrophone: true });
      if (!localStream) {
        setError('No microphone found. The call will start in listen-only mode.');
      }
      await callSignalingRealtime.startCall(selectedConversationId, callType);

      const participantIds = getParticipantIdsExceptCurrentUser();
      for (const participantId of participantIds) {
        const peerConnection = getOrCreatePeerConnection(participantId);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        await callSignalingRealtime.sendOffer(selectedConversationId, participantId, offer.sdp || '');
      }

      setIsVoiceCallActive(true);
    } catch (signalingError) {
      setError(signalingError?.message || 'Could not start call signaling.');
      stopVoiceCallResources();
    } finally {
      setIsSignalingActionPending(false);
    }
  };

  const handleEndCall = async () => {
    if (!selectedConversationId) {
      return;
    }

    try {
      setError('');
      setIsSignalingActionPending(true);
      stopIncomingRingtone();
      await callSignalingRealtime.endCall(selectedConversationId);
      stopVoiceCallResources();
    } catch (signalingError) {
      setError(signalingError?.message || 'Could not end call signaling.');
    } finally {
      setIsSignalingActionPending(false);
    }
  };

  const handleToggleMic = () => {
    const localStream = localStreamRef.current;
    if (!localStream) {
      return;
    }

    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      return;
    }

    const nextEnabledState = !audioTracks[0].enabled;
    audioTracks.forEach((track) => {
      track.enabled = nextEnabledState;
    });

    setIsMicEnabled(nextEnabledState);
  };

  return (
    <div className="group-conversations-layout">
      <section className="group-conversations-column">
        <div className="group-conversations-card">
          <h3 className="group-conversations-title">Group conversations</h3>
          <p className="group-conversations-subtitle">Create a group and start messaging in this MVP version.</p>

          {loadingConversations ? (
            <p className="group-conversations-empty">Loading conversations...</p>
          ) : groupConversations.length === 0 ? (
            <p className="group-conversations-empty">No group conversations yet.</p>
          ) : (
            <ul className="group-conversations-list">
              {groupConversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    className={`group-conversation-item ${selectedConversationId === conversation.id ? 'active' : ''}`}
                    onClick={() => setSelectedConversationId(conversation.id)}
                  >
                    <span className="group-conversation-item-title">{conversation.title}</span>
                    <span className="group-conversation-item-meta">{conversation.members?.length || 0} members</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form className="group-conversations-card" onSubmit={handleCreateConversation}>
          <h4 className="group-conversations-create-title">Create group</h4>

          <label className="group-conversations-label" htmlFor="group-conversation-title">
            Title
          </label>
          <input
            id="group-conversation-title"
            type="text"
            value={newConversationTitle}
            onChange={(event) => setNewConversationTitle(event.target.value)}
            placeholder="Example: Team Alpha"
            className="group-conversations-input"
            maxLength={120}
            required
          />

          <p className="group-conversations-helper">Pick at least one person for the group conversation.</p>
          <div className="group-conversations-members">
            {availableUsers.map((user) => (
              <label key={user.id} className="group-conversations-member-option">
                <input
                  type="checkbox"
                  checked={selectedMemberIds.includes(user.id)}
                  onChange={() => toggleMember(user.id)}
                />
                <span>{user.username}</span>
              </label>
            ))}
          </div>

          <button
            type="submit"
            className="group-conversations-primary-btn"
            disabled={isCreating || selectedMemberIds.length === 0 || !newConversationTitle.trim()}
          >
            {isCreating ? 'Creating...' : 'Create group'}
          </button>
        </form>
      </section>

      <section className="group-conversations-card group-conversations-chat">
        <h3 className="group-conversations-title">{selectedConversation?.title || 'Select a conversation'}</h3>
        {selectedConversation && (
          <p className="group-conversations-subtitle">
            Members: {(selectedConversation.members || []).map((member) => member.username).join(', ')}
          </p>
        )}

        {error && <p className="group-conversations-error">{error}</p>}

        {remoteParticipantIds.length > 0 && (
          <div className="group-conversations-audio-nodes" aria-hidden="true">
            {remoteParticipantIds.map((participantId) => (
              <audio
                key={participantId}
                autoPlay
                ref={(audioElement) => {
                  if (!audioElement) {
                    return;
                  }

                  const remoteStream = remoteStreamsRef.current.get(participantId);
                  if (remoteStream && audioElement.srcObject !== remoteStream) {
                    audioElement.srcObject = remoteStream;
                  }
                }}
              />
            ))}
          </div>
        )}

        <div className="group-conversations-messages">
          {!selectedConversation ? (
            <p className="group-conversations-empty">Select or create a group conversation to start messaging.</p>
          ) : loadingMessages ? (
            <p className="group-conversations-empty">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="group-conversations-empty">No messages yet. Start the conversation.</p>
          ) : (
            <ul className="group-conversations-message-list">
              {messages.map((message) => (
                <li key={message.id} className={`group-conversations-message-item ${message.senderId === currentUserId ? 'own' : ''}`}>
                  <div className="group-conversations-message-meta">
                    <span>{message.senderUsername || 'Unknown user'}</span>
                    <span>{new Date(message.createdAt).toLocaleString()}</span>
                  </div>
                  {(message.mediaUrl || message.gifUrl) && (
                    <div className="group-conversations-message-media-wrap">
                      {isVideoMessageUrl(message.mediaUrl) ? (
                        <video
                          src={dmApi.resolveMediaUrl(message.mediaUrl)}
                          className="group-conversations-message-media"
                          controls
                          muted
                        />
                      ) : (
                        <img
                          src={dmApi.resolveMediaUrl(message.mediaUrl || message.gifUrl)}
                          alt={message.message || 'Conversation media'}
                          className="group-conversations-message-media"
                        />
                      )}
                    </div>
                  )}
                  {message.message && <p className="group-conversations-message-text">{message.message}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

          <form className="group-conversations-send-form" onSubmit={handleSendMessage}>
            <label className="group-conversations-label" htmlFor="group-conversation-message">
              Message
            </label>
            <textarea
              ref={messageInputRef}
              id="group-conversation-message"
              value={newMessage}
              onChange={handleMessageChange}
              placeholder="Write a group message..."
              className="group-conversations-message-input"
              rows={4}
              maxLength={MAX_MESSAGE_LENGTH}
              disabled={!selectedConversationId || isSending}
            />
            <div className="group-conversations-composer-row">
              <ComposerToolbar
                className="group-conversations-toolbar"
                disabled={!selectedConversationId || isSending}
                onEmojiSelect={insertEmoji}
                onGifSelect={handleGifSelect}
              />
              <div className="group-conversations-composer-actions">
                <button
                  type="button"
                  className="group-conversations-secondary-btn"
                  disabled={!selectedConversationId || isSignalingActionPending || callState.isActive || !isSignalingConnected || isVoiceCallActive}
                  onClick={() => handleStartCall('voice')}
                >
                  <span className="group-conversations-btn-icon" aria-hidden="true">&#128222;</span>
                  <span>Start voice call</span>
                </button>
                <button
                  type="button"
                  className="group-conversations-secondary-btn danger"
                  disabled={!selectedConversationId || isSignalingActionPending || !callState.isActive}
                  onClick={handleEndCall}
                >
                  <span className="group-conversations-btn-icon" aria-hidden="true">&#128244;</span>
                  <span>End voice call</span>
                </button>
                <button
                  type="button"
                  className="group-conversations-secondary-btn"
                  disabled={!isVoiceCallActive}
                  onClick={handleToggleMic}
                >
                  <span className="group-conversations-btn-icon" aria-hidden="true">{isMicEnabled ? '\u{1F507}' : '\u{1F50A}'}</span>
                  <span>{isMicEnabled ? 'Mute mic' : 'Unmute mic'}</span>
                </button>
              </div>
            </div>
            <input
              id="group-conversation-media"
              name="group-conversation-media"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/ogg"
              onChange={handleMediaChange}
              className="group-conversations-file-input"
              disabled={!selectedConversationId || isSending}
            />

            <div className="group-conversations-counter">
              {newMessage.length} / {MAX_MESSAGE_LENGTH}
            </div>

            {selectedMedia && (
              <div className="group-conversations-inline-preview">
                {mediaPreviewUrl && (isVideoPreview ? (
                  <video src={mediaPreviewUrl} className="group-conversations-inline-preview-media" controls muted />
                ) : (
                  <img src={mediaPreviewUrl} alt="Selected group media preview" className="group-conversations-inline-preview-media" />
                ))}
                <div className="group-conversations-inline-preview-meta">
                  <span>{selectedMedia.name}</span>
                  <button type="button" className="group-conversations-remove-media" onClick={handleRemoveMedia} disabled={isSending}>
                    Remove file
                  </button>
                </div>
              </div>
            )}
            {selectedGif && (
              <div className="group-conversations-inline-preview">
                <img
                  src={selectedGif.previewUrl || selectedGif.mediaUrl}
                  alt={selectedGif.altText || 'Selected GIF preview'}
                  className="group-conversations-inline-preview-media"
                />
                <div className="group-conversations-inline-preview-meta">
                  <span>{selectedGif.title || 'Selected GIF'}</span>
                  <button type="button" className="group-conversations-remove-media" onClick={handleRemoveGif} disabled={isSending}>
                    Remove GIF
                  </button>
                </div>
              </div>
            )}
          <button
            type="submit"
              className="group-conversations-primary-btn group-conversations-send-btn"
            disabled={!selectedConversationId || (!newMessage.trim() && !selectedMedia && !selectedGif) || isSending}
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default GroupConversations;
