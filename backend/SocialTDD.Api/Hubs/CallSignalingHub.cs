using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SocialTDD.Application.Interfaces;

namespace SocialTDD.Api.Hubs;

[Authorize]
public class CallSignalingHub : Hub
{
    private static readonly TimeSpan ActiveCallStaleAfter = TimeSpan.FromMinutes(15);

    public const string CallStartedMethod = "callStarted";
    public const string CallEndedMethod = "callEnded";
    public const string OfferReceivedMethod = "offerReceived";
    public const string AnswerReceivedMethod = "answerReceived";
    public const string IceCandidateReceivedMethod = "iceCandidateReceived";
    public const string CallInviteReceivedMethod = "callInviteReceived";
    public const string CallInviteRespondedMethod = "callInviteResponded";
    public const string ParticipantJoinedMethod = "participantJoined";
    public const string ParticipantLeftMethod = "participantLeft";

    private readonly IConversationRepository _conversationRepository;

    public CallSignalingHub(IConversationRepository conversationRepository)
    {
        _conversationRepository = conversationRepository;
    }

    public async Task JoinConversation(Guid conversationId)
    {
        var currentUserId = GetCurrentUserId();
        await EnsureConversationMembershipAsync(conversationId, currentUserId);

        var groupName = GetConversationGroup(conversationId);
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

        await Clients.GroupExcept(groupName, Context.ConnectionId).SendAsync(
            ParticipantJoinedMethod,
            new
            {
                conversationId,
                userId = currentUserId,
                connectedAt = DateTime.UtcNow
            });
    }

    public async Task LeaveConversation(Guid conversationId)
    {
        var currentUserId = GetCurrentUserId();
        await EnsureConversationMembershipAsync(conversationId, currentUserId);

        var groupName = GetConversationGroup(conversationId);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);

        await Clients.Group(groupName).SendAsync(
            ParticipantLeftMethod,
            new
            {
                conversationId,
                userId = currentUserId,
                disconnectedAt = DateTime.UtcNow
            });
    }

    public async Task StartCall(Guid conversationId, string callType)
    {
        var currentUserId = GetCurrentUserId();
        await EnsureConversationMembershipAsync(conversationId, currentUserId);

        var activeCallSession = await _conversationRepository.GetActiveCallSessionAsync(conversationId);
        if (activeCallSession != null)
        {
            activeCallSession = await TryCloseStaleCallSessionAsync(activeCallSession);
        }

        if (activeCallSession != null)
        {
            throw new HubException("A call is already active in this conversation.");
        }

        var normalizedCallType = NormalizeCallType(callType);

        if (normalizedCallType != "voice" && normalizedCallType != "video")
        {
            throw new HubException("Call type must be either 'voice' or 'video'.");
        }

        var startedAt = DateTime.UtcNow;

        await _conversationRepository.CreateCallSessionAsync(new Domain.Entities.CallSession
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            StartedByUserId = currentUserId,
            CallType = normalizedCallType,
            Status = "active",
            StartedAt = startedAt,
            EndedAt = null,
        });

        var conversation = await _conversationRepository.GetConversationByIdAsync(conversationId);
        var starterUsername = conversation?.Members
            .FirstOrDefault(member => member.UserId == currentUserId)
            ?.User
            ?.Username ?? "Unknown user";

        await _conversationRepository.CreateMessageAsync(new Domain.Entities.ConversationMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            SenderId = currentUserId,
            Message = $"{starterUsername} startade ett {GetCallDescriptor(normalizedCallType, useDefiniteForm: false)} ({startedAt:yyyy-MM-dd HH:mm:ss} UTC).",
            CreatedAt = startedAt,
            IsSystemMessage = true,
        });

        await Clients.Group(GetConversationGroup(conversationId)).SendAsync(
            CallStartedMethod,
            new
            {
                conversationId,
                callType = normalizedCallType,
                startedByUserId = currentUserId,
                startedAt
            });

    }

    public async Task EndCall(Guid conversationId)
    {
        var currentUserId = GetCurrentUserId();
        await EnsureConversationMembershipAsync(conversationId, currentUserId);

        var endedAt = DateTime.UtcNow;
        var activeCallSession = await _conversationRepository.GetActiveCallSessionAsync(conversationId);
        if (activeCallSession != null)
        {
            activeCallSession.Status = "ended";
            activeCallSession.EndedAt = endedAt;
            await _conversationRepository.UpdateCallSessionAsync(activeCallSession);

            var conversation = await _conversationRepository.GetConversationByIdAsync(conversationId);
            var endedByUsername = conversation?.Members
                .FirstOrDefault(member => member.UserId == currentUserId)
                ?.User
                ?.Username ?? "Unknown user";

            var duration = endedAt - activeCallSession.StartedAt;
            var normalizedCallType = NormalizeCallType(activeCallSession.CallType);
            var callDescriptor = GetCallDescriptor(normalizedCallType, useDefiniteForm: true);
            await _conversationRepository.CreateMessageAsync(new Domain.Entities.ConversationMessage
            {
                Id = Guid.NewGuid(),
                ConversationId = conversationId,
                SenderId = currentUserId,
                Message = $"{endedByUsername} avslutade {callDescriptor}. Längd: {FormatDuration(duration)}. Start: {activeCallSession.StartedAt:yyyy-MM-dd HH:mm:ss} UTC.",
                CreatedAt = endedAt,
                IsSystemMessage = true,
            });
        }

        await Clients.Group(GetConversationGroup(conversationId)).SendAsync(
            CallEndedMethod,
            new
            {
                conversationId,
                endedByUserId = currentUserId,
                endedAt
            });
    }

    public async Task SendCallInvite(Guid conversationId, Guid targetUserId, string callType)
    {
        var currentUserId = GetCurrentUserId();
        await EnsureConversationMembershipAsync(conversationId, currentUserId);
        await EnsureConversationMembershipAsync(conversationId, targetUserId);

        var activeCallSession = await _conversationRepository.GetActiveCallSessionAsync(conversationId);
        if (activeCallSession == null)
        {
            throw new HubException("No active call was found for this conversation.");
        }

        var normalizedCallType = NormalizeCallType(callType);
        if (normalizedCallType != "voice" && normalizedCallType != "video")
        {
            throw new HubException("Call type must be either 'voice' or 'video'.");
        }

        await Clients.User(targetUserId.ToString()).SendAsync(
            CallInviteReceivedMethod,
            new
            {
                conversationId,
                fromUserId = currentUserId,
                callType = normalizedCallType,
                invitedAt = DateTime.UtcNow
            });
    }

    public async Task RespondToCallInvite(Guid conversationId, Guid targetUserId, bool accepted, string callType)
    {
        var currentUserId = GetCurrentUserId();
        await EnsureConversationMembershipAsync(conversationId, currentUserId);
        await EnsureConversationMembershipAsync(conversationId, targetUserId);

        var normalizedCallType = NormalizeCallType(callType);

        if (accepted)
        {
            var conversation = await _conversationRepository.GetConversationByIdAsync(conversationId);
            var joinedByUsername = conversation?.Members
                .FirstOrDefault(member => member.UserId == currentUserId)
                ?.User
                ?.Username ?? "Unknown user";

            await _conversationRepository.CreateMessageAsync(new Domain.Entities.ConversationMessage
            {
                Id = Guid.NewGuid(),
                ConversationId = conversationId,
                SenderId = currentUserId,
                Message = $"{joinedByUsername} anslöt till {GetCallDescriptor(normalizedCallType, useDefiniteForm: true)}.",
                CreatedAt = DateTime.UtcNow,
                IsSystemMessage = true,
            });
        }

        await Clients.User(targetUserId.ToString()).SendAsync(
            CallInviteRespondedMethod,
            new
            {
                conversationId,
                fromUserId = currentUserId,
                accepted,
                callType = normalizedCallType,
                respondedAt = DateTime.UtcNow
            });
    }

    public async Task SendOffer(Guid conversationId, Guid targetUserId, string sdp)
    {
        var currentUserId = GetCurrentUserId();
        await EnsureConversationMembershipAsync(conversationId, currentUserId);
        await EnsureConversationMembershipAsync(conversationId, targetUserId);

        if (string.IsNullOrWhiteSpace(sdp))
        {
            throw new HubException("Offer SDP cannot be empty.");
        }

        await Clients.User(targetUserId.ToString()).SendAsync(
            OfferReceivedMethod,
            new
            {
                conversationId,
                fromUserId = currentUserId,
                sdp
            });
    }

    public async Task SendAnswer(Guid conversationId, Guid targetUserId, string sdp)
    {
        var currentUserId = GetCurrentUserId();
        await EnsureConversationMembershipAsync(conversationId, currentUserId);
        await EnsureConversationMembershipAsync(conversationId, targetUserId);

        if (string.IsNullOrWhiteSpace(sdp))
        {
            throw new HubException("Answer SDP cannot be empty.");
        }

        await Clients.User(targetUserId.ToString()).SendAsync(
            AnswerReceivedMethod,
            new
            {
                conversationId,
                fromUserId = currentUserId,
                sdp
            });
    }

    public async Task SendIceCandidate(Guid conversationId, Guid targetUserId, string candidate, string? sdpMid, int? sdpMLineIndex)
    {
        var currentUserId = GetCurrentUserId();
        await EnsureConversationMembershipAsync(conversationId, currentUserId);
        await EnsureConversationMembershipAsync(conversationId, targetUserId);

        if (string.IsNullOrWhiteSpace(candidate))
        {
            throw new HubException("ICE candidate cannot be empty.");
        }

        await Clients.User(targetUserId.ToString()).SendAsync(
            IceCandidateReceivedMethod,
            new
            {
                conversationId,
                fromUserId = currentUserId,
                candidate,
                sdpMid,
                sdpMLineIndex
            });
    }

    private Guid GetCurrentUserId()
    {
        var userIdentifier = Context.UserIdentifier;
        if (!Guid.TryParse(userIdentifier, out var parsedUserId))
        {
            throw new HubException("Unauthorized: user id missing or invalid.");
        }

        return parsedUserId;
    }

    private async Task EnsureConversationMembershipAsync(Guid conversationId, Guid userId)
    {
        var isMember = await _conversationRepository.IsConversationMemberAsync(conversationId, userId);
        if (!isMember)
        {
            throw new HubException("User is not a member of this conversation.");
        }
    }

    private static string FormatDuration(TimeSpan duration)
    {
        if (duration.TotalHours >= 1)
        {
            return $"{(int)duration.TotalHours:00}:{duration.Minutes:00}:{duration.Seconds:00}";
        }

        return $"{duration.Minutes:00}:{duration.Seconds:00}";
    }

    private static string NormalizeCallType(string? callType)
    {
        return string.IsNullOrWhiteSpace(callType)
            ? "voice"
            : callType.Trim().ToLowerInvariant();
    }

    private static string GetCallDescriptor(string normalizedCallType, bool useDefiniteForm)
    {
        var isVideoCall = string.Equals(normalizedCallType, "video", StringComparison.OrdinalIgnoreCase);
        if (useDefiniteForm)
        {
            return isVideoCall ? "videosamtalet" : "röstsamtalet";
        }

        return isVideoCall ? "videosamtal" : "röstsamtal";
    }

    public static string GetConversationGroup(Guid conversationId) => $"calls:conversation:{conversationId}";

    private async Task<Domain.Entities.CallSession?> TryCloseStaleCallSessionAsync(Domain.Entities.CallSession activeCallSession)
    {
        if (activeCallSession.EndedAt.HasValue)
        {
            activeCallSession.Status = "ended";
            await _conversationRepository.UpdateCallSessionAsync(activeCallSession);
            return null;
        }

        var now = DateTime.UtcNow;
        if (now - activeCallSession.StartedAt <= ActiveCallStaleAfter)
        {
            return activeCallSession;
        }

        activeCallSession.Status = "ended";
        activeCallSession.EndedAt = now;
        await _conversationRepository.UpdateCallSessionAsync(activeCallSession);
        return null;
    }
}
