import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { callSignalingRealtime } from '../services/callSignalingRealtime';
import { conversationApi } from '../services/conversationApi';
import { userApi } from '../services/userApi';
import './IncomingCallOverlay.css';

const PENDING_CALL_STORAGE_KEY = 'postra.pendingIncomingCall';

function IncomingCallOverlay() {
  const { isAuthenticated, userId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [incomingCall, setIncomingCall] = useState(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const ringtoneContextRef = useRef(null);
  const ringtoneIntervalRef = useRef(null);

  const callTypeLabel = useMemo(() => {
    if (!incomingCall) {
      return '';
    }

    return incomingCall.callType === 'video' ? 'videosamtal' : 'röstsamtal';
  }, [incomingCall]);

  const stopRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  }, []);

  const playRingtonePulse = useCallback(async () => {
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

      const startAt = audioContext.currentTime;
      const frequencies = [880, 660, 990];

      frequencies.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const toneStart = startAt + index * 0.16;

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, toneStart);

        gainNode.gain.setValueAtTime(0.0001, toneStart);
        gainNode.gain.exponentialRampToValueAtTime(0.1, toneStart + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, toneStart + 0.12);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start(toneStart);
        oscillator.stop(toneStart + 0.13);
      });
    } catch {
      // Ignore audio playback failures.
    }
  }, []);

  const startRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      return;
    }

    void playRingtonePulse();
    ringtoneIntervalRef.current = setInterval(() => {
      void playRingtonePulse();
    }, 1200);
  }, [playRingtonePulse]);

  useEffect(() => {
    if (!incomingCall) {
      stopRingtone();
      return;
    }

    startRingtone();
  }, [incomingCall, startRingtone, stopRingtone]);

  useEffect(() => {
    if (!isAuthenticated) {
      setIncomingCall(null);
      stopRingtone();
      return undefined;
    }

    let isMounted = true;

    const resolveCallTarget = async (conversationId, fromUserId) => {
      const [conversations, caller] = await Promise.all([
        conversationApi.getMyConversations(),
        userApi.getUserById(fromUserId).catch(() => null),
      ]);

      const matchedConversation = Array.isArray(conversations)
        ? conversations.find((conversation) => conversation.id === conversationId)
        : null;

      const isGroup = Boolean(matchedConversation?.isGroup);
      const callerName = caller?.username || 'Nagon';

      return {
        isGroup,
        callerName,
        groupTitle: matchedConversation?.title || 'Gruppsamtal',
      };
    };

    const unsubscribe = callSignalingRealtime.subscribe((event) => {
      if (!isMounted) {
        return;
      }

      if (event.type === 'call-invite-received') {
        const payload = event?.payload;
        const conversationId = payload?.conversationId;
        const fromUserId = payload?.fromUserId;
        const callType = payload?.callType === 'video' ? 'video' : 'voice';

        if (!conversationId || !fromUserId || fromUserId === userId) {
          return;
        }

        resolveCallTarget(conversationId, fromUserId)
          .then((target) => {
            if (!isMounted) {
              return;
            }

            setIncomingCall({
              conversationId,
              fromUserId,
              callType,
              isGroup: target.isGroup,
              callerName: target.callerName,
              groupTitle: target.groupTitle,
            });
          })
          .catch(() => {
            if (!isMounted) {
              return;
            }

            setIncomingCall({
              conversationId,
              fromUserId,
              callType,
              isGroup: false,
              callerName: 'Nagon',
              groupTitle: 'Gruppsamtal',
            });
          });

        return;
      }

      if (event.type === 'call-ended') {
        const endedConversationId = event?.payload?.conversationId;
        if (!endedConversationId) {
          return;
        }

        setIncomingCall((previousCall) => {
          if (!previousCall || previousCall.conversationId !== endedConversationId) {
            return previousCall;
          }

          return null;
        });
      }
    });

    callSignalingRealtime.connect().catch(() => {
      // Ignore global connect errors; local call screens still handle their own connection state.
    });

    return () => {
      isMounted = false;
      unsubscribe();
      callSignalingRealtime.disconnect().catch(() => {
        // Ignore disconnect errors.
      });
      stopRingtone();
    };
  }, [isAuthenticated, stopRingtone, userId]);

  useEffect(() => {
    return () => {
      stopRingtone();
      const audioContext = ringtoneContextRef.current;
      ringtoneContextRef.current = null;
      if (audioContext) {
        audioContext.close().catch(() => {
          // Ignore cleanup errors.
        });
      }
    };
  }, [stopRingtone]);

  const handleAccept = async () => {
    if (!incomingCall) {
      return;
    }

    try {
      setIsActionPending(true);

      const pendingCallPayload = {
        conversationId: incomingCall.conversationId,
        fromUserId: incomingCall.fromUserId,
        callType: incomingCall.callType,
        isGroup: incomingCall.isGroup,
      };
      localStorage.setItem(PENDING_CALL_STORAGE_KEY, JSON.stringify(pendingCallPayload));

      if (incomingCall.isGroup) {
        navigate(`/messages?view=group&conversationId=${incomingCall.conversationId}`);
      } else {
        navigate(`/messages/${incomingCall.fromUserId}`);
      }

      setIncomingCall(null);
      stopRingtone();
    } finally {
      setIsActionPending(false);
    }
  };

  const handleDecline = async () => {
    if (!incomingCall) {
      return;
    }

    try {
      setIsActionPending(true);
      stopRingtone();

      await callSignalingRealtime.respondToCallInvite(
        incomingCall.conversationId,
        incomingCall.fromUserId,
        false,
        incomingCall.callType
      );
      await callSignalingRealtime.endCall(incomingCall.conversationId);

      setIncomingCall(null);
    } catch {
      setIncomingCall(null);
    } finally {
      setIsActionPending(false);
    }
  };

  if (!isAuthenticated || !incomingCall) {
    return null;
  }

  const currentPath = location.pathname + location.search;

  return (
    <div className="incoming-call-overlay" role="alert" aria-live="assertive">
      <div className="incoming-call-card">
        <span className="incoming-call-kicker">Inkommande samtal</span>
        <h3>
          {incomingCall.callerName} ringer ({callTypeLabel})
        </h3>
        <p>
          {incomingCall.isGroup
            ? `Grupp: ${incomingCall.groupTitle}`
            : 'Direktmeddelande'}
        </p>
        <p className="incoming-call-path">Nuvarande sida: {currentPath}</p>
        <div className="incoming-call-actions">
          <button type="button" className="incoming-call-accept" disabled={isActionPending} onClick={handleAccept}>
            Svara
          </button>
          <button type="button" className="incoming-call-decline" disabled={isActionPending} onClick={handleDecline}>
            Avvisa
          </button>
        </div>
      </div>
    </div>
  );
}

function readPendingIncomingCall() {
  try {
    const rawValue = localStorage.getItem(PENDING_CALL_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);
    if (!parsed?.conversationId || !parsed?.fromUserId) {
      return null;
    }

    return {
      conversationId: parsed.conversationId,
      fromUserId: parsed.fromUserId,
      callType: parsed.callType === 'video' ? 'video' : 'voice',
      isGroup: Boolean(parsed.isGroup),
    };
  } catch {
    return null;
  }
}

export function consumePendingIncomingCall() {
  try {
    const pendingCall = readPendingIncomingCall();
    if (!pendingCall) {
      return null;
    }

    localStorage.removeItem(PENDING_CALL_STORAGE_KEY);
    return pendingCall;
  } catch {
    localStorage.removeItem(PENDING_CALL_STORAGE_KEY);
    return null;
  }
}

export function peekPendingIncomingCall() {
  return readPendingIncomingCall();
}

export default IncomingCallOverlay;
