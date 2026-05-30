import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ComposerToolbar from './ComposerToolbar';
import { dmApi } from '../services/dmApi';
import { conversationApi } from '../services/conversationApi';
import { callSignalingRealtime } from '../services/callSignalingRealtime';
import { userApi } from '../services/userApi';
import './DirectMessageConversation.css';

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

function DirectMessageConversation({ userId, otherUserId, onConversationUpdated }) {
  const navigate = useNavigate();
  const draftInputRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [directConversationId, setDirectConversationId] = useState('');
  const [draft, setDraft] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedGif, setSelectedGif] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isSignalingConnected, setIsSignalingConnected] = useState(false);
  const [isSignalingActionPending, setIsSignalingActionPending] = useState(false);
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [callStartedAt, setCallStartedAt] = useState(null);
  const [callElapsedSeconds, setCallElapsedSeconds] = useState(0);
  const [callState, setCallState] = useState({
    isActive: false,
    callType: '',
    startedByUserId: null,
  });
  const [callEvents, setCallEvents] = useState([]);
  const [error, setError] = useState(null);
  const activeConversationIdRef = useRef('');
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const formatElapsed = useCallback((seconds) => {
    const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const remainingSeconds = safeSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }, []);

  const stopVoiceCallResources = useCallback(() => {
    const peerConnection = peerConnectionRef.current;
    if (peerConnection) {
      try {
        peerConnection.onicecandidate = null;
        peerConnection.ontrack = null;
        peerConnection.close();
      } catch {
        // Ignore cleanup failures.
      }
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    setIsVoiceCallActive(false);
    setIsMicEnabled(true);
  }, []);

  const ensureLocalAudioStream = useCallback(async () => {
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
      const message = (mediaError?.message || '').toLowerCase();
      const isMicMissing = mediaError?.name === 'NotFoundError' || message.includes('requested device not found');
      if (isMicMissing) {
        setIsMicEnabled(false);
        return null;
      }

      throw mediaError;
    }

    localStreamRef.current = localStream;
    setIsVoiceCallActive(true);
    setIsMicEnabled(localStream.getAudioTracks().some((track) => track.enabled));
    return localStream;
  }, []);

  const getOrCreatePeerConnection = useCallback(() => {
    const existingPeerConnection = peerConnectionRef.current;
    if (existingPeerConnection) {
      return existingPeerConnection;
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current);
      });
    }

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate || !directConversationId || !otherUserId) {
        return;
      }

      callSignalingRealtime.sendIceCandidate(
        directConversationId,
        otherUserId,
        event.candidate.candidate,
        event.candidate.sdpMid,
        event.candidate.sdpMLineIndex
      ).catch((iceError) => {
        setError(iceError?.message || 'Could not send ICE candidate.');
      });
    };

    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (!remoteStream || !remoteAudioRef.current) {
        return;
      }

      remoteAudioRef.current.srcObject = remoteStream;
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = null;
        }
      }
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  }, [directConversationId, otherUserId]);

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

  const fetchConversation = useCallback(async () => {
    if (!userId || !otherUserId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [conversation, user, directConversation] = await Promise.all([
        dmApi.getConversation(otherUserId),
        userApi.getUserById(otherUserId),
        conversationApi.getOrCreateDirectConversation(otherUserId),
      ]);

      const sortedConversation = Array.isArray(conversation)
        ? [...conversation].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        : [];

      setMessages(sortedConversation);
      setOtherUser(user);
      setDirectConversationId(directConversation?.id || '');

      const unreadIncomingMessages = sortedConversation.filter((message) => (
        message.recipientId === userId && message.senderId === otherUserId && !message.isRead
      ));

      if (unreadIncomingMessages.length > 0) {
        await Promise.all(unreadIncomingMessages.map((message) => dmApi.markAsRead(message.id)));

        setMessages((previousMessages) => previousMessages.map((message) => (
          unreadIncomingMessages.some((item) => item.id === message.id)
            ? { ...message, isRead: true }
            : message
        )));

        onConversationUpdated?.();
      }
    } catch (err) {
      setError(err.message || 'Could not load the conversation.');
    } finally {
      setLoading(false);
    }
  }, [otherUserId, onConversationUpdated, userId]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = callSignalingRealtime.subscribe((event) => {
      if (!isMounted) {
        return;
      }

      const payloadConversationId = event?.payload?.conversationId;
      if (payloadConversationId && payloadConversationId !== directConversationId) {
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
          case 'reconnected':
            setIsSignalingConnected(true);
            return 'Call signaling reconnected';
          case 'call-started':
            {
              const startedAtValue = event?.payload?.startedAt ? new Date(event.payload.startedAt) : new Date();
              const hasValidStartedAt = !Number.isNaN(startedAtValue.getTime());
              const nextStartedAt = hasValidStartedAt ? startedAtValue : new Date();
              const elapsedFromStartedAt = Math.max(0, Math.floor((Date.now() - nextStartedAt.getTime()) / 1000));

              setCallStartedAt(nextStartedAt);
              setCallElapsedSeconds(elapsedFromStartedAt);
            }

            setCallState({
              isActive: true,
              callType: event?.payload?.callType || 'voice',
              startedByUserId: event?.payload?.startedByUserId || null,
            });
            return `Call started (${event?.payload?.callType || 'voice'})`;
          case 'call-ended':
            setCallState({
              isActive: false,
              callType: '',
              startedByUserId: null,
            });
            setCallStartedAt(null);
            setCallElapsedSeconds(0);
            stopVoiceCallResources();
            return 'Call ended';
          case 'offer-received':
            (async () => {
              try {
                const fromUserId = event?.payload?.fromUserId;
                const sdp = event?.payload?.sdp;

                if (!fromUserId || !sdp || fromUserId !== otherUserId || !directConversationId) {
                  return;
                }

                await ensureLocalAudioStream();
                const peerConnection = getOrCreatePeerConnection();

                if (peerConnection.signalingState !== 'stable') {
                  return;
                }

                await peerConnection.setRemoteDescription({ type: 'offer', sdp });
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);

                await callSignalingRealtime.sendAnswer(
                  directConversationId,
                  otherUserId,
                  answer.sdp || ''
                );
              } catch (offerError) {
                setError(offerError?.message || 'Could not process incoming voice offer.');
              }
            })();
            return 'Voice offer received';
          case 'answer-received':
            (async () => {
              try {
                const fromUserId = event?.payload?.fromUserId;
                const sdp = event?.payload?.sdp;
                const peerConnection = peerConnectionRef.current;

                if (!peerConnection || !fromUserId || !sdp || fromUserId !== otherUserId) {
                  return;
                }

                if (peerConnection.signalingState !== 'have-local-offer') {
                  return;
                }

                await peerConnection.setRemoteDescription({ type: 'answer', sdp });
              } catch (answerError) {
                setError(answerError?.message || 'Could not process incoming voice answer.');
              }
            })();
            return 'Voice answer received';
          case 'ice-candidate-received':
            (async () => {
              try {
                const fromUserId = event?.payload?.fromUserId;
                if (fromUserId !== otherUserId) {
                  return;
                }

                const peerConnection = peerConnectionRef.current;
                if (!peerConnection) {
                  return;
                }

                const candidatePayload = {
                  candidate: event?.payload?.candidate,
                  sdpMid: event?.payload?.sdpMid ?? null,
                  sdpMLineIndex: event?.payload?.sdpMLineIndex ?? null,
                };

                await peerConnection.addIceCandidate(new RTCIceCandidate(candidatePayload));
              } catch (iceError) {
                setError(iceError?.message || 'Could not apply incoming ICE candidate.');
              }
            })();
            return 'ICE candidate received';
          default:
            return null;
        }
      })();

      if (!nextEventLabel) {
        return;
      }

      setCallEvents((previousEvents) => [`${timestamp} - ${nextEventLabel}`, ...previousEvents].slice(0, 8));
    });

    callSignalingRealtime.connect()
      .then(() => {
        if (isMounted) {
          setIsSignalingConnected(true);
        }
      })
      .catch((connectError) => {
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
    directConversationId,
    ensureLocalAudioStream,
    getOrCreatePeerConnection,
    otherUserId,
    stopVoiceCallResources,
  ]);

  useEffect(() => {
    const joinConversation = async () => {
      try {
        const previousConversationId = activeConversationIdRef.current;
        if (previousConversationId && previousConversationId !== directConversationId) {
          await callSignalingRealtime.leaveConversation(previousConversationId);
        }

        if (directConversationId) {
          await callSignalingRealtime.joinConversation(directConversationId);
        }

        activeConversationIdRef.current = directConversationId;
        setCallState({
          isActive: false,
          callType: '',
          startedByUserId: null,
        });
        setCallStartedAt(null);
        setCallElapsedSeconds(0);
        setCallEvents([]);
        stopVoiceCallResources();
      } catch (joinError) {
        setError(joinError?.message || 'Could not join call signaling for this DM conversation.');
      }
    };

    joinConversation();
  }, [directConversationId, stopVoiceCallResources]);

  useEffect(() => {
    if (!callState.isActive || !callStartedAt) {
      return undefined;
    }

    const updateElapsed = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - callStartedAt.getTime()) / 1000));
      setCallElapsedSeconds(elapsed);
    };

    updateElapsed();
    const intervalId = setInterval(updateElapsed, 1000);

    return () => clearInterval(intervalId);
  }, [callState.isActive, callStartedAt]);

  useEffect(() => {
    return () => {
      const activeConversationId = activeConversationIdRef.current;
      if (activeConversationId) {
        callSignalingRealtime.leaveConversation(activeConversationId).catch(() => {
          // Ignore cleanup errors.
        });
      }

      callSignalingRealtime.disconnect().catch(() => {
        // Ignore cleanup errors.
      });

      stopVoiceCallResources();
      activeConversationIdRef.current = '';
      setIsSignalingConnected(false);
    };
  }, [stopVoiceCallResources]);

  const latestActivity = useMemo(() => {
    if (messages.length === 0) {
      return 'No messages yet';
    }

    return new Date(messages[messages.length - 1].createdAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [messages]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedDraft = draft.trim();
    if (!trimmedDraft && !selectedMedia && !selectedGif) {
      return;
    }

    try {
      setSending(true);
      setError(null);
      const createdMessage = await dmApi.sendDirectMessage(otherUserId, trimmedDraft, selectedMedia, selectedGif?.mediaUrl || null);
      setMessages((previousMessages) => [...previousMessages, createdMessage]);
      setDraft('');
      setSelectedMedia(null);
      setSelectedGif(null);
      onConversationUpdated?.();
    } catch (err) {
      setError(err.message || 'Could not send the message.');
    } finally {
      setSending(false);
    }
  };

  const formatBubbleDate = (value) => new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const conversationTitle = otherUser?.username || 'Conversation';

  const isVideoUrl = (url) => {
    if (!url) {
      return false;
    }

    try {
      const parsedUrl = new URL(url, window.location.origin);
      return /\.(mp4|webm|ogg)$/i.test(parsedUrl.pathname);
    } catch {
      return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
    }
  };

  const handleMediaChange = (event) => {
    handleSelectedMediaFile(event.target.files?.[0] || null);
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

    setError(null);
    setSelectedMedia(file);
  };

  const handleGifSelect = (gif) => {
    setSelectedGif(gif);
    setError(null);
  };

  const insertEmoji = (emoji) => {
    const textarea = draftInputRef.current;
    const start = textarea?.selectionStart ?? draft.length;
    const end = textarea?.selectionEnd ?? draft.length;
    const nextDraft = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;

    setDraft(nextDraft);
    setError(null);

    window.requestAnimationFrame(() => {
      if (textarea) {
        const caret = start + emoji.length;
        textarea.focus();
        textarea.setSelectionRange(caret, caret);
      }
    });
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
  };

  const handleRemoveGif = () => {
    setSelectedGif(null);
  };

  const handleStartCall = async () => {
    if (!directConversationId || !otherUserId) {
      return;
    }

    try {
      setError(null);
      setIsSignalingActionPending(true);

      const localStream = await ensureLocalAudioStream();
      if (!localStream) {
        setError('No microphone found. The call will start in listen-only mode.');
      }

      await callSignalingRealtime.startCall(directConversationId, 'voice');

      const peerConnection = getOrCreatePeerConnection();
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      await callSignalingRealtime.sendOffer(directConversationId, otherUserId, offer.sdp || '');

      setIsVoiceCallActive(true);
    } catch (signalingError) {
      setError(signalingError?.message || 'Could not start voice call.');
      stopVoiceCallResources();
    } finally {
      setIsSignalingActionPending(false);
    }
  };

  const handleEndCall = async () => {
    if (!directConversationId) {
      return;
    }

    try {
      setError(null);
      setIsSignalingActionPending(true);
      await callSignalingRealtime.endCall(directConversationId);
      stopVoiceCallResources();
    } catch (signalingError) {
      setError(signalingError?.message || 'Could not end voice call.');
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

  const getDownloadName = (message) => {
    const resolvedUrl = dmApi.resolveMediaUrl(message.mediaUrl);

    try {
      const parsedUrl = new URL(resolvedUrl);
      return parsedUrl.pathname.split('/').pop() || 'direct-message-file';
    } catch {
      return 'direct-message-file';
    }
  };

  return (
    <section className="dm-conversation-shell">
      <header className="dm-conversation-header">
        <div>
          <span className="dm-conversation-badge">Chat</span>
          <h2 className="dm-conversation-title">{conversationTitle}</h2>
          <p className="dm-conversation-subtitle">
            Reply directly in the thread instead of starting over from search.
          </p>
        </div>
        <div className="dm-conversation-actions">
          <div className="dm-conversation-meta">Latest activity {latestActivity}</div>
          <button
            type="button"
            className="dm-conversation-secondary"
            onClick={() => navigate('/messages')}
          >
            New message
          </button>
        </div>
      </header>

      {error && <div className="dm-conversation-error" role="alert">{error}</div>}

      <audio ref={remoteAudioRef} autoPlay />

      {loading ? (
        <div className="dm-conversation-loading">Loading conversation...</div>
      ) : (
        <>
          <div className="dm-conversation-stream">
            {messages.length === 0 ? (
              <div className="dm-conversation-empty">
                <strong>No messages in this chat yet.</strong>
                <span>Send the first reply and keep the whole exchange in one place.</span>
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.senderId === userId;
                const resolvedMediaUrl = dmApi.resolveMediaUrl(message.mediaUrl);
                const resolvedGifUrl = dmApi.resolveMediaUrl(message.gifUrl);

                return (
                  <article
                    key={message.id}
                    className={`dm-bubble ${isOwnMessage ? 'dm-bubble-own' : 'dm-bubble-incoming'}`}
                  >
                    {resolvedMediaUrl && (
                      <div className="dm-bubble-media-wrap">
                        {isVideoUrl(resolvedMediaUrl) ? (
                          <video src={resolvedMediaUrl} className="dm-bubble-media" controls preload="metadata" />
                        ) : (
                          <img src={resolvedMediaUrl} alt="Shared direct message media" className="dm-bubble-media" />
                        )}
                        <div className="dm-bubble-media-actions">
                          <a
                            href={resolvedMediaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="dm-bubble-media-link"
                          >
                            Open
                          </a>
                          <a
                            href={resolvedMediaUrl}
                            download={getDownloadName(message)}
                            className="dm-bubble-media-link"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    )}
                    {resolvedGifUrl && (
                      <div className="dm-bubble-media-wrap">
                        <img src={resolvedGifUrl} alt="Shared GIF" className="dm-bubble-media" />
                        <div className="dm-bubble-media-actions">
                          <a
                            href={resolvedGifUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="dm-bubble-media-link"
                          >
                            Open GIF
                          </a>
                        </div>
                      </div>
                    )}
                    {message.message && <div className="dm-bubble-body">{message.message}</div>}
                    <div className="dm-bubble-meta">
                      <span>{isOwnMessage ? 'You' : conversationTitle}</span>
                      <span>{formatBubbleDate(message.createdAt)}</span>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <form className="dm-conversation-form" onSubmit={handleSubmit}>
            <label className="dm-conversation-label" htmlFor="dm-reply-message">Reply</label>
            <textarea
              ref={draftInputRef}
              id="dm-reply-message"
              className="dm-conversation-input"
              placeholder={`Write back to ${conversationTitle}...`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows="4"
              maxLength="500"
              disabled={sending}
            />
            <ComposerToolbar
              className="dm-conversation-toolbar"
              disabled={sending}
              onEmojiSelect={insertEmoji}
              onGifSelect={handleGifSelect}
            >
              <button
                type="button"
                className="composer-toolbar-button dm-conversation-toolbar-button"
                disabled={sending || !directConversationId || isSignalingActionPending || callState.isActive || !isSignalingConnected || isVoiceCallActive}
                onClick={handleStartCall}
              >
                <span className="dm-conversation-btn-icon" aria-hidden="true">&#128222;</span>
                <span>Start voice call</span>
              </button>
              <button
                type="button"
                className="composer-toolbar-button dm-conversation-toolbar-button dm-conversation-toolbar-button-danger"
                disabled={sending || !directConversationId || isSignalingActionPending || !callState.isActive}
                onClick={handleEndCall}
              >
                <span className="dm-conversation-btn-icon" aria-hidden="true">&#128244;</span>
                <span>End voice call</span>
              </button>
              <button
                type="button"
                className="composer-toolbar-button dm-conversation-toolbar-button"
                disabled={sending || !isVoiceCallActive}
                onClick={handleToggleMic}
              >
                <span className="dm-conversation-btn-icon" aria-hidden="true">{isMicEnabled ? '\u{1F507}' : '\u{1F50A}'}</span>
                <span>{isMicEnabled ? 'Mute mic' : 'Unmute mic'}</span>
              </button>
            </ComposerToolbar>
            {(isVoiceCallActive || callState.isActive) && (
              <p className="dm-conversation-signaling-meta">
                Voice call state: {isVoiceCallActive ? 'connected' : 'waiting'} | Duration: {formatElapsed(callElapsedSeconds)}
              </p>
            )}
            {callEvents.length > 0 && (
              <ul className="dm-conversation-signaling-log">
                {callEvents.map((eventText, index) => (
                  <li key={`${eventText}-${index}`}>{eventText}</li>
                ))}
              </ul>
            )}
            {selectedGif && (
              <div className="dm-conversation-inline-preview">
                <img
                  src={selectedGif.previewUrl || selectedGif.mediaUrl}
                  alt={selectedGif.altText || 'Selected GIF preview'}
                  className="dm-conversation-inline-preview-media"
                />
                <div className="dm-conversation-inline-preview-meta">
                  <span>{selectedGif.title || 'Selected GIF'}</span>
                  <button type="button" className="dm-conversation-remove-media" onClick={handleRemoveGif} disabled={sending}>Remove GIF</button>
                </div>
              </div>
            )}
            <input
              id="dm-reply-media"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/ogg"
              onChange={handleMediaChange}
              className="dm-conversation-file-input"
              disabled={sending}
            />
            {selectedMedia && (
              <div className="dm-conversation-preview">
                {mediaPreviewUrl && (isVideoPreview ? (
                  <video src={mediaPreviewUrl} className="dm-conversation-preview-media" controls muted />
                ) : (
                  <img src={mediaPreviewUrl} alt="Selected conversation media preview" className="dm-conversation-preview-media" />
                ))}
                <div className="dm-conversation-preview-meta">
                  <span>{selectedMedia.name}</span>
                  <button type="button" className="dm-conversation-remove-media" onClick={handleRemoveMedia} disabled={sending}>Remove file</button>
                </div>
              </div>
            )}
            <div className="dm-conversation-form-footer">
              <span className="dm-conversation-counter">{draft.length} / 500</span>
              <button
                type="submit"
                className="dm-conversation-submit"
                disabled={sending || (!draft.trim() && !selectedMedia && !selectedGif)}
              >
                {sending ? 'Sending...' : 'Send reply'}
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}

export default DirectMessageConversation;